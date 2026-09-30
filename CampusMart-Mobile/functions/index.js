const { setGlobalOptions } = require("firebase-functions/v2");
const {
  onDocumentCreated,
} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");

const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

setGlobalOptions({
  maxInstances: 10,
  region: "asia-south1",
});

exports.sendNewMessagePush = onDocumentCreated(
  {
    document: "messages/{messageId}",
    region: "asia-south1",
    retry: false,
  },
  async (event) => {
    const messageSnapshot = event.data;

    if (!messageSnapshot) {
      logger.warn("Message snapshot missing");
      return;
    }

    const messageId = event.params.messageId;
    const messageData = messageSnapshot.data();

    if (!messageData) {
      logger.warn("Message data missing", {
        messageId,
      });
      return;
    }

    if (messageData.pushProcessed === true) {
      logger.info("Push already processed", {
        messageId,
      });
      return;
    }

    const {
      chatId,
      senderId,
      senderName,
      text,
    } = messageData;

    if (!chatId || !senderId) {
      logger.warn("Missing chatId or senderId", {
        messageId,
      });

      await messageSnapshot.ref.set(
        {
          pushProcessed: true,
          pushSkippedReason:
            "missing_chat_or_sender",
          pushProcessedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      return;
    }

    try {
      const chatQuerySnapshot = await db
        .collection("chats")
        .where("chatId", "==", chatId)
        .limit(1)
        .get();

      let chatSnapshot = null;

      if (!chatQuerySnapshot.empty) {
        chatSnapshot =
          chatQuerySnapshot.docs[0];
      } else {
        const directChatSnapshot = await db
          .collection("chats")
          .doc(chatId)
          .get();

        if (directChatSnapshot.exists) {
          chatSnapshot = directChatSnapshot;
        }
      }

      if (!chatSnapshot) {
        logger.warn("Chat not found", {
          chatId,
          messageId,
        });

        await messageSnapshot.ref.set(
          {
            pushProcessed: true,
            pushSkippedReason:
              "chat_not_found",
            pushProcessedAt:
              admin.firestore.FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        return;
      }

      const chatData = chatSnapshot.data() || {};

      const participants = Array.isArray(
        chatData.participants
      )
        ? chatData.participants
        : [];

      const receiverId = participants.find(
        (userId) => userId !== senderId
      );

      if (!receiverId) {
        logger.warn("Receiver not found", {
          chatId,
          messageId,
          participants,
        });

        await messageSnapshot.ref.set(
          {
            pushProcessed: true,
            pushSkippedReason:
              "receiver_not_found",
            pushProcessedAt:
              admin.firestore.FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        return;
      }

      const receiverReference = db
        .collection("users")
        .doc(receiverId);

      const receiverSnapshot =
        await receiverReference.get();

      if (!receiverSnapshot.exists) {
        logger.warn("Receiver user document missing", {
          receiverId,
          messageId,
        });

        await messageSnapshot.ref.set(
          {
            pushProcessed: true,
            pushSkippedReason:
              "receiver_document_missing",
            pushProcessedAt:
              admin.firestore.FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        return;
      }

      const receiverData =
        receiverSnapshot.data() || {};

      if (
        receiverData.pushNotificationsEnabled ===
        false
      ) {
        logger.info(
          "Receiver disabled push notifications",
          {
            receiverId,
            messageId,
          }
        );

        await messageSnapshot.ref.set(
          {
            pushProcessed: true,
            pushSkippedReason:
              "push_disabled",
            pushProcessedAt:
              admin.firestore.FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        return;
      }

      if (
        receiverData.activeChatId === chatId
      ) {
        logger.info(
          "Receiver already viewing chat",
          {
            receiverId,
            chatId,
            messageId,
          }
        );

        await messageSnapshot.ref.set(
          {
            pushProcessed: true,
            pushSkippedReason:
              "receiver_viewing_chat",
            pushProcessedAt:
              admin.firestore.FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        return;
      }

      const storedTokens = Array.isArray(
        receiverData.pushTokens
      )
        ? receiverData.pushTokens
        : [];

      const lastPushToken =
        typeof receiverData.lastPushToken ===
        "string"
          ? receiverData.lastPushToken
          : "";

      const tokens = [
        ...new Set(
          [...storedTokens, lastPushToken].filter(
            (token) =>
              typeof token === "string" &&
              token.trim().length > 0
          )
        ),
      ];

      if (tokens.length === 0) {
        logger.info(
          "Receiver has no push token",
          {
            receiverId,
            messageId,
          }
        );

        await messageSnapshot.ref.set(
          {
            pushProcessed: true,
            pushSkippedReason:
              "no_push_token",
            pushProcessedAt:
              admin.firestore.FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        return;
      }

      const safeSenderName =
        typeof senderName === "string" &&
        senderName.trim()
          ? senderName.trim()
          : "A student";

      const safeMessageText =
        typeof text === "string" &&
        text.trim()
          ? text.trim()
          : "Sent you a message";

      const shortenedMessage =
        safeMessageText.length > 120
          ? `${safeMessageText.slice(
              0,
              117
            )}...`
          : safeMessageText;

      const multicastMessage = {
        tokens,

        notification: {
          title: safeSenderName,
          body: shortenedMessage,
        },

        data: {
          type: "message",
          chatId: String(chatId),
          senderId: String(senderId),
          messageId: String(messageId),
          productId: String(
            chatData.productId || ""
          ),
        },

        android: {
          priority: "high",

          notification: {
            channelId: "campusmart_messages",
            sound: "default",
            tag: `chat_${chatId}`,
            clickAction:
              "FCM_PLUGIN_ACTIVITY",
          },
        },
      };

      const response =
        await messaging.sendEachForMulticast(
          multicastMessage
        );

      logger.info("Push multicast completed", {
        messageId,
        receiverId,
        successCount: response.successCount,
        failureCount: response.failureCount,
      });

      const invalidTokens = [];

      response.responses.forEach(
        (sendResponse, index) => {
          if (sendResponse.success) {
            return;
          }

          const errorCode =
            sendResponse.error?.code || "";

          logger.warn("Push token failed", {
            messageId,
            receiverId,
            errorCode,
          });

          const shouldRemoveToken = [
            "messaging/registration-token-not-registered",
            "messaging/invalid-registration-token",
            "messaging/invalid-argument",
          ].includes(errorCode);

          if (shouldRemoveToken) {
            invalidTokens.push(tokens[index]);
          }
        }
      );

      if (invalidTokens.length > 0) {
        const validTokens = tokens.filter(
          (token) =>
            !invalidTokens.includes(token)
        );

        const receiverUpdate = {
          pushTokens: validTokens,
          pushTokenCleanupAt:
            admin.firestore.FieldValue.serverTimestamp(),
        };

        if (
          invalidTokens.includes(lastPushToken)
        ) {
          receiverUpdate.lastPushToken =
            validTokens[0] || "";
        }

        await receiverReference.set(
          receiverUpdate,
          {
            merge: true,
          }
        );

        logger.info("Invalid tokens removed", {
          receiverId,
          removedCount:
            invalidTokens.length,
        });
      }

      await messageSnapshot.ref.set(
        {
          pushProcessed: true,
          pushSent:
            response.successCount > 0,
          pushSuccessCount:
            response.successCount,
          pushFailureCount:
            response.failureCount,
          pushProcessedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        },
        {
          merge: true,
        }
      );
    } catch (error) {
      logger.error(
        "New message push failed",
        {
          messageId,
          chatId,
          error:
            error?.message ||
            String(error),
          stack: error?.stack || "",
        }
      );

      await messageSnapshot.ref
        .set(
          {
            pushProcessed: false,
            pushError:
              error?.message ||
              "Unknown push error",
            pushLastAttemptAt:
              admin.firestore.FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        )
        .catch(() => {});

      throw error;
    }
  }
);