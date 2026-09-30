import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

const SWIPE_REPLY_DISTANCE = 55;
const MAX_SWIPE_DISTANCE = 90;
const LONG_PRESS_DURATION = 550;
const BOTTOM_DISTANCE = 130;

export default function Chat({ onLogout }) {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [chatDocId, setChatDocId] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [product, setProduct] = useState(null);
  const [chat, setChat] = useState(null);

  const [sending, setSending] = useState(false);
  const [chatLoading, setChatLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesReady, setMessagesReady] = useState(false);

  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showUndo, setShowUndo] = useState(false);

  const [selectedMessage, setSelectedMessage] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState("");

  const [activeSwipeId, setActiveSwipeId] = useState("");
  const [swipeDistance, setSwipeDistance] = useState(0);

  const messagesContainerRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const typingTimerRef = useRef(null);
  const undoTimerRef = useRef(null);
  const longPressTimerRef = useRef(null);

  const pointerStartRef = useRef({
    x: 0,
    y: 0,
    messageId: "",
  });

  const longPressTriggeredRef = useRef(false);
  const localDeleteRef = useRef(false);
  const initialScrollDoneRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);
  const previousMessagesLengthRef = useRef(0);

  const otherUserId =
    chat?.participants?.find((uid) => uid !== currentUser?.uid) || "";

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }

      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }

      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    initialScrollDoneRef.current = false;
    previousMessagesLengthRef.current = 0;
    shouldAutoScrollRef.current = true;

    setMessages([]);
    setMessagesLoading(true);
    setMessagesReady(false);
    setReplyTo(null);
    setSelectedMessage(null);
    setActiveSwipeId("");
    setSwipeDistance(0);
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;

    async function resolveChatDocId() {
      try {
        setChatLoading(true);

        const directSnap = await getDoc(doc(db, "chats", chatId));

        if (directSnap.exists()) {
          setChatDocId(directSnap.id);
          return;
        }

        const chatQuery = query(
          collection(db, "chats"),
          where("chatId", "==", chatId)
        );

        const chatSnapshot = await getDocs(chatQuery);

        if (!chatSnapshot.empty) {
          setChatDocId(chatSnapshot.docs[0].id);
          return;
        }

        navigate("/chats", { replace: true });
      } catch (error) {
        console.error("Chat resolve error:", error);
        navigate("/chats", { replace: true });
      } finally {
        setChatLoading(false);
      }
    }

    resolveChatDocId();
  }, [chatId, navigate]);

  useEffect(() => {
    if (!currentUser || !chatId) return;

    async function setActiveChat() {
      try {
        await updateDoc(doc(db, "users", currentUser.uid), {
          activeChatId: chatId,
          activeChatUpdatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.log("Active chat update skipped:", error.message);
      }
    }

    setActiveChat();

    return () => {
      updateDoc(doc(db, "users", currentUser.uid), {
        activeChatId: "",
        activeChatUpdatedAt: serverTimestamp(),
      }).catch((error) => {
        console.log("Active chat clear skipped:", error.message);
      });
    };
  }, [currentUser, chatId]);

  useEffect(() => {
    if (!currentUser || !chatId) return;

    async function markThisChatNotificationsRead() {
      try {
        const notificationsQuery = query(
          collection(db, "notifications"),
          where("userId", "==", currentUser.uid),
          where("chatId", "==", chatId),
          where("read", "==", false)
        );

        const snapshot = await getDocs(notificationsQuery);

        await Promise.all(
          snapshot.docs.map((notificationDoc) =>
            updateDoc(doc(db, "notifications", notificationDoc.id), {
              read: true,
            })
          )
        );
      } catch (error) {
        console.log(
          "Chat notifications read skipped:",
          error.message
        );
      }
    }

    markThisChatNotificationsRead();
  }, [currentUser, chatId]);

  useEffect(() => {
    if (!currentUser || !chatDocId) return;

    const unsubscribe = onSnapshot(
      doc(db, "chats", chatDocId),
      async (snapshot) => {
        if (!snapshot.exists()) {
          navigate("/chats", { replace: true });
          return;
        }

        const chatData = {
          id: snapshot.id,
          ...snapshot.data(),
        };

        const deletedFor = Array.isArray(chatData.deletedFor)
          ? chatData.deletedFor
          : [];

        const isDeletedForMe = deletedFor.includes(currentUser.uid);

        if (isDeletedForMe && !localDeleteRef.current) {
          navigate("/chats", { replace: true });
          return;
        }

        setChat(chatData);

        const typingBy = chatData.typingBy || "";

        setOtherUserTyping(
          Boolean(typingBy && typingBy !== currentUser.uid)
        );

        try {
          if (chatData.productId) {
            const productSnapshot = await getDoc(
              doc(db, "products", chatData.productId)
            );

            if (productSnapshot.exists()) {
              setProduct({
                id: productSnapshot.id,
                ...productSnapshot.data(),
              });
            }
          }
        } catch (error) {
          console.log("Product load skipped:", error.message);
        } finally {
          setChatLoading(false);
        }
      },
      (error) => {
        console.error("Chat realtime load error:", error);
        setChatLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, chatDocId, navigate]);

  async function markIncomingMessagesAsRead(messageList) {
    if (!currentUser) return;

    const unreadMessages = messageList.filter((message) => {
      if (message.senderId === currentUser.uid) {
        return false;
      }

      const readBy = Array.isArray(message.readBy)
        ? message.readBy
        : [];

      return !readBy.includes(currentUser.uid);
    });

    if (unreadMessages.length === 0) return;

    try {
      const chunks = [];

      for (let index = 0; index < unreadMessages.length; index += 450) {
        chunks.push(unreadMessages.slice(index, index + 450));
      }

      for (const chunk of chunks) {
        const batch = writeBatch(db);

        chunk.forEach((message) => {
          batch.update(doc(db, "messages", message.id), {
            readBy: arrayUnion(currentUser.uid),
            readAt: serverTimestamp(),
          });
        });

        await batch.commit();
      }
    } catch (error) {
      console.log("Message read update skipped:", error.message);
    }
  }

  useEffect(() => {
    if (!chatId || !currentUser) return;

    setMessagesLoading(true);

    const messagesQuery = query(
      collection(db, "messages"),
      where("chatId", "==", chatId)
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const container = messagesContainerRef.current;

        if (initialScrollDoneRef.current && container) {
          const distanceFromBottom =
            container.scrollHeight -
            container.scrollTop -
            container.clientHeight;

          shouldAutoScrollRef.current =
            distanceFromBottom < BOTTOM_DISTANCE;
        } else {
          shouldAutoScrollRef.current = true;
        }

        const list = snapshot.docs
          .map((messageDoc) => ({
            id: messageDoc.id,
            ...messageDoc.data(),
          }))
          .filter((message) => {
            if (message.deletedForEveryone === true) {
              return false;
            }

            const deletedFor = Array.isArray(message.deletedFor)
              ? message.deletedFor
              : [];

            return !deletedFor.includes(currentUser.uid);
          });

        list.sort((firstMessage, secondMessage) => {
          const firstSeconds =
            firstMessage.createdAt?.seconds || 0;

          const secondSeconds =
            secondMessage.createdAt?.seconds || 0;

          if (firstSeconds !== secondSeconds) {
            return firstSeconds - secondSeconds;
          }

          const firstNanoseconds =
            firstMessage.createdAt?.nanoseconds || 0;

          const secondNanoseconds =
            secondMessage.createdAt?.nanoseconds || 0;

          return firstNanoseconds - secondNanoseconds;
        });

        setMessages(list);
        setMessagesLoading(false);

        markIncomingMessagesAsRead(list);
      },
      (error) => {
        console.error("Messages load error:", error);
        setMessagesLoading(false);
        setMessagesReady(true);
      }
    );

    return () => unsubscribe();
  }, [chatId, currentUser]);

  useLayoutEffect(() => {
  if (messagesLoading) return;

  const container = messagesContainerRef.current;

  if (!container) return;

  if (!initialScrollDoneRef.current) {
    setMessagesReady(false);

    const scrollToLatestMessage = () => {
      container.scrollTop = container.scrollHeight;
    };

    scrollToLatestMessage();

    const firstFrame = requestAnimationFrame(() => {
      scrollToLatestMessage();

      const secondFrame = requestAnimationFrame(() => {
        scrollToLatestMessage();

        initialScrollDoneRef.current = true;
        previousMessagesLengthRef.current = messages.length;
        shouldAutoScrollRef.current = true;
        setMessagesReady(true);
      });

      container.dataset.secondFrame = String(secondFrame);
    });

    return () => {
      cancelAnimationFrame(firstFrame);

      const secondFrame = Number(container.dataset.secondFrame);

      if (secondFrame) {
        cancelAnimationFrame(secondFrame);
      }
    };
  }

  const hasNewMessage =
    messages.length > previousMessagesLengthRef.current;

  if (hasNewMessage && shouldAutoScrollRef.current) {
    requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    });
  }

  previousMessagesLengthRef.current = messages.length;
}, [messages, messagesLoading]);

  useEffect(() => {
    if (!otherUserTyping || !initialScrollDoneRef.current) return;

    const container = messagesContainerRef.current;

    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    if (distanceFromBottom < BOTTOM_DISTANCE) {
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  }, [otherUserTyping]);

  async function updateTypingStatus(value) {
    if (!currentUser || !chatDocId) return;

    try {
      await updateDoc(doc(db, "chats", chatDocId), {
        typingBy: value ? currentUser.uid : "",
        typingUpdatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.log("Typing update skipped:", error.message);
    }
  }

  function handleTextChange(event) {
    const newValue = event.target.value;

    setText(newValue);

    if (newValue.trim()) {
      updateTypingStatus(true);
    } else {
      updateTypingStatus(false);
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 1600);
  }

  async function isReceiverViewingThisChat(receiverId) {
    try {
      const receiverSnapshot = await getDoc(
        doc(db, "users", receiverId)
      );

      if (!receiverSnapshot.exists()) {
        return false;
      }

      const receiverData = receiverSnapshot.data();

      return receiverData.activeChatId === chatId;
    } catch (error) {
      console.log(
        "Receiver active chat check skipped:",
        error.message
      );

      return false;
    }
  }

  async function sendMessage(event) {
    event.preventDefault();

    if (
      !text.trim() ||
      sending ||
      !currentUser ||
      !chatDocId
    ) {
      return;
    }

    const chatDeletedFor = Array.isArray(chat?.deletedFor)
      ? chat.deletedFor
      : [];

    if (chatDeletedFor.includes(currentUser.uid)) {
      navigate("/chats", { replace: true });
      return;
    }

    try {
      setSending(true);
      shouldAutoScrollRef.current = true;

      const messageText = text.trim();

      await updateTypingStatus(false);

      const messageData = {
        chatId,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || "Student",
        text: messageText,

        deletedForEveryone: false,
        deletedFor: [],

        readBy: [currentUser.uid],
        readAt: null,

        createdAt: serverTimestamp(),
      };

      if (replyTo) {
        messageData.replyTo = {
          id: replyTo.id,
          text: replyTo.text || "",
          senderName:
            replyTo.senderId === currentUser.uid
              ? "You"
              : replyTo.senderName || "Student",
          senderId: replyTo.senderId || "",
        };
      }

      await addDoc(collection(db, "messages"), messageData);

      await updateDoc(doc(db, "chats", chatDocId), {
        lastMessage: messageText,
        lastSenderId: currentUser.uid,
        updatedAt: serverTimestamp(),
        typingBy: "",
      });

      if (otherUserId) {
        const receiverIsViewingChat =
          await isReceiverViewingThisChat(otherUserId);

        if (!receiverIsViewingChat) {
          await addDoc(collection(db, "notifications"), {
            userId: otherUserId,
            type: "message",
            icon: "💬",
            title: "New message",
            message: `${
              currentUser.displayName || "A student"
            }: ${messageText}`,
            messageText,
            senderId: currentUser.uid,
            senderName:
              currentUser.displayName || "Student",
            chatId,
            productId:
              chat?.productId || product?.id || "",
            productName:
              chat?.productName || product?.name || "",
            read: false,
            hidden: false,
            createdAt: serverTimestamp(),
          });
        }
      }

      setText("");
      setReplyTo(null);

      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;

        if (container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
        }
      });
    } catch (error) {
      alert(error.message);
    } finally {
      setSending(false);
    }
  }

  function selectReply(message) {
    setReplyTo({
      id: message.id,
      text: message.text || "",
      senderName:
        message.senderName || "Student",
      senderId: message.senderId || "",
    });

    setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleMessagePointerDown(event, message) {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    clearLongPressTimer();

    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      messageId: message.id,
    };

    longPressTriggeredRef.current = false;

    setActiveSwipeId(message.id);
    setSwipeDistance(0);

    event.currentTarget.setPointerCapture?.(
      event.pointerId
    );

    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;

      setActiveSwipeId("");
      setSwipeDistance(0);
      setSelectedMessage(message);

      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
    }, LONG_PRESS_DURATION);
  }

  function handleMessagePointerMove(event, message) {
    if (
      pointerStartRef.current.messageId !== message.id ||
      longPressTriggeredRef.current
    ) {
      return;
    }

    const horizontalDifference =
      event.clientX - pointerStartRef.current.x;

    const verticalDifference =
      event.clientY - pointerStartRef.current.y;

    if (
      Math.abs(verticalDifference) > 12 ||
      Math.abs(horizontalDifference) > 8
    ) {
      clearLongPressTimer();
    }

    if (
      Math.abs(verticalDifference) >
      Math.abs(horizontalDifference) + 8
    ) {
      setSwipeDistance(0);
      return;
    }

    const rightDistance = Math.max(
      0,
      Math.min(
        horizontalDifference,
        MAX_SWIPE_DISTANCE
      )
    );

    setActiveSwipeId(message.id);
    setSwipeDistance(rightDistance);
  }

  function finishMessageGesture(message) {
    clearLongPressTimer();

    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      setActiveSwipeId("");
      setSwipeDistance(0);
      return;
    }

    if (
      pointerStartRef.current.messageId === message.id &&
      swipeDistance >= SWIPE_REPLY_DISTANCE
    ) {
      selectReply(message);

      if (navigator.vibrate) {
        navigator.vibrate(15);
      }
    }

    pointerStartRef.current = {
      x: 0,
      y: 0,
      messageId: "",
    };

    setActiveSwipeId("");
    setSwipeDistance(0);
  }

  function handleMessagePointerUp(event, message) {
    event.currentTarget.releasePointerCapture?.(
      event.pointerId
    );

    finishMessageGesture(message);
  }

  function handleMessagePointerCancel() {
    clearLongPressTimer();

    pointerStartRef.current = {
      x: 0,
      y: 0,
      messageId: "",
    };

    longPressTriggeredRef.current = false;

    setActiveSwipeId("");
    setSwipeDistance(0);
  }

  async function handleDeleteForEveryone() {
    if (
      !currentUser ||
      !selectedMessage?.id ||
      deletingMessageId
    ) {
      return;
    }

    if (selectedMessage.senderId !== currentUser.uid) {
      return;
    }

    try {
      setDeletingMessageId(selectedMessage.id);

      const isLatestMessage =
        messages[messages.length - 1]?.id ===
        selectedMessage.id;

      await updateDoc(
        doc(db, "messages", selectedMessage.id),
        {
          deletedForEveryone: true,
          deletedBy: currentUser.uid,
          deletedAt: serverTimestamp(),
          text: "",
        }
      );

      if (isLatestMessage && chatDocId) {
        await updateDoc(doc(db, "chats", chatDocId), {
          lastMessage: "Message deleted",
          updatedAt: serverTimestamp(),
        });
      }

      setSelectedMessage(null);
    } catch (error) {
      alert(error.message);
    } finally {
      setDeletingMessageId("");
    }
  }

  async function handleDeleteForMe() {
    if (
      !currentUser ||
      !selectedMessage?.id ||
      deletingMessageId
    ) {
      return;
    }

    if (selectedMessage.senderId === currentUser.uid) {
      return;
    }

    try {
      setDeletingMessageId(selectedMessage.id);

      await updateDoc(
        doc(db, "messages", selectedMessage.id),
        {
          deletedFor: arrayUnion(currentUser.uid),
          deletedForMeAt: serverTimestamp(),
        }
      );

      setSelectedMessage(null);
    } catch (error) {
      alert(error.message);
    } finally {
      setDeletingMessageId("");
    }
  }

  async function hideChatNotificationsForBothUsers(
    participants = []
  ) {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, "notifications"),
          where("chatId", "==", chatId)
        )
      );

      await Promise.all(
        snapshot.docs.map((notificationDoc) => {
          const notificationData =
            notificationDoc.data();

          if (
            participants.length > 0 &&
            !participants.includes(
              notificationData.userId
            )
          ) {
            return Promise.resolve();
          }

          return updateDoc(
            doc(
              db,
              "notifications",
              notificationDoc.id
            ),
            {
              hidden: true,
              hiddenAt: serverTimestamp(),
              hiddenReason: "chat_soft_deleted",
            }
          );
        })
      );
    } catch (error) {
      console.log(
        "Notification hide skipped:",
        error.message
      );
    }
  }

  async function restoreChatNotificationsForBothUsers(
    participants = []
  ) {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, "notifications"),
          where("chatId", "==", chatId)
        )
      );

      await Promise.all(
        snapshot.docs.map((notificationDoc) => {
          const notificationData =
            notificationDoc.data();

          if (
            participants.length > 0 &&
            !participants.includes(
              notificationData.userId
            )
          ) {
            return Promise.resolve();
          }

          return updateDoc(
            doc(
              db,
              "notifications",
              notificationDoc.id
            ),
            {
              hidden: false,
              restoredAt: serverTimestamp(),
            }
          );
        })
      );
    } catch (error) {
      console.log(
        "Notification restore skipped:",
        error.message
      );
    }
  }

  async function handleSoftDeleteChat() {
    if (
      !currentUser ||
      !chatDocId ||
      !chat?.participants?.length ||
      deleting
    ) {
      return;
    }

    const confirmDelete = window.confirm(
      "Delete this chat for both users? You can undo within 5 seconds."
    );

    if (!confirmDelete) return;

    try {
      setDeleting(true);
      localDeleteRef.current = true;

      const participants = chat.participants;

      await updateDoc(doc(db, "chats", chatDocId), {
        deletedFor: participants,
        deletedBy: currentUser.uid,
        deletedAt: serverTimestamp(),
        deletedType: "soft_delete_both",
        typingBy: "",
        updatedAt: serverTimestamp(),
      });

      await hideChatNotificationsForBothUsers(
        participants
      );

      setShowUndo(true);

      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }

      undoTimerRef.current = setTimeout(() => {
        setShowUndo(false);
        localDeleteRef.current = false;
        navigate("/chats", { replace: true });
      }, 5000);
    } catch (error) {
      localDeleteRef.current = false;
      alert(error.message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleUndoDelete() {
    if (
      !currentUser ||
      !chatDocId ||
      restoring
    ) {
      return;
    }

    try {
      setRestoring(true);

      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }

      await updateDoc(doc(db, "chats", chatDocId), {
        deletedFor: [],
        deletedBy: "",
        deletedAt: null,
        deletedType: "",
        restoredBy: currentUser.uid,
        restoredAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await restoreChatNotificationsForBothUsers(
        chat?.participants || []
      );

      localDeleteRef.current = false;
      setShowUndo(false);
    } catch (error) {
      alert(error.message);
    } finally {
      setRestoring(false);
    }
  }

  function isMessageReadByOtherUser(message) {
    if (!otherUserId) return false;

    const readBy = Array.isArray(message.readBy)
      ? message.readBy
      : [];

    return readBy.includes(otherUserId);
  }

  function renderMessageStatus(message) {
    if (message.senderId !== currentUser?.uid) {
      return null;
    }

    const isRead = isMessageReadByOtherUser(message);
    const isSaved = Boolean(message.createdAt);

    if (isRead) {
      return (
        <span
          className="ml-auto inline-flex text-[13px] font-black text-white transition-colors duration-200"
          title="Read"
        >
          ✓✓
        </span>
      );
    }

    if (isSaved) {
      return (
        <span
          className="ml-auto inline-flex text-[13px] font-black text-blue-100/80"
          title="Delivered"
        >
          ✓✓
        </span>
      );
    }

    return (
      <span
        className="ml-auto inline-flex text-[13px] font-black text-blue-100/80"
        title="Sending"
      >
        ✓
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar onLogout={onLogout} />

      <main className="mx-auto max-w-4xl px-3 py-4 sm:px-6 sm:py-8">
        <button
          type="button"
          onClick={() => navigate("/chats")}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold shadow-sm transition active:scale-95 dark:border-slate-800 dark:bg-slate-900"
        >
          ← Back to Chats
        </button>

        <Card className="flex h-[calc(100dvh-150px)] min-h-[520px] flex-col overflow-hidden rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:shadow-black/20 sm:h-[700px] sm:rounded-[2.4rem]">
          <div className="sticky top-0 z-10 flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white/95 p-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 sm:gap-4 sm:p-5">
            {chatLoading ? (
              <>
                <div className="h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800 sm:h-16 sm:w-16" />

                <div className="min-w-0 flex-1 space-y-3">
                  <div className="h-3 w-28 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="h-6 w-48 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="h-4 w-36 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                </div>
              </>
            ) : (
              <>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-blue-100 text-2xl shadow-sm dark:bg-slate-800 sm:h-16 sm:w-16">
                  {product?.image ||
                  chat?.productImage ? (
                    <img
                      src={
                        product?.image ||
                        chat?.productImage
                      }
                      alt={
                        product?.name ||
                        chat?.productName ||
                        "Product"
                      }
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "💬"
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-blue-600">
                    CampusMart Chat
                  </p>

                  <h1 className="truncate text-base font-black sm:text-2xl">
                    {product?.name ||
                      chat?.productName ||
                      "Product"}
                  </h1>

                  <p className="truncate text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                    {otherUserTyping
                      ? "typing..."
                      : product
                      ? `₹${product.price} • ${
                          product.city ||
                          "Campus Area"
                        }`
                      : "Campus Area"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSoftDeleteChat}
                  disabled={deleting || showUndo}
                  className="shrink-0 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 sm:px-4 sm:text-sm"
                >
                  {deleting
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </>
            )}
          </div>

          <div
            ref={messagesContainerRef}
            className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-slate-50 to-white px-3 py-5 dark:from-slate-950 dark:to-slate-950 sm:px-6 sm:py-6"
          >
            {messagesLoading ? (
              <div className="space-y-4">
                <div className="flex justify-start">
                  <div className="h-20 w-[70%] animate-pulse rounded-[1.5rem] rounded-bl-md bg-slate-200 dark:bg-slate-800" />
                </div>

                <div className="flex justify-end">
                  <div className="h-16 w-[62%] animate-pulse rounded-[1.5rem] rounded-br-md bg-slate-200 dark:bg-slate-800" />
                </div>

                <div className="flex justify-start">
                  <div className="h-24 w-[76%] animate-pulse rounded-[1.5rem] rounded-bl-md bg-slate-200 dark:bg-slate-800" />
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center">
                <div className="rounded-[2rem] bg-white/80 px-8 py-10 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900/80 dark:ring-slate-800">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-5xl dark:bg-blue-950/30">
                    👋
                  </div>

                  <p className="text-xl font-black text-slate-900 dark:text-white">
                    No messages yet
                  </p>

                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Send a message and start the
                    conversation.
                  </p>
                </div>
              </div>
            ) : (
              <div
                className={`space-y-3 transition-opacity duration-150 sm:space-y-4 ${
                  messagesReady
                    ? "opacity-100"
                    : "pointer-events-none opacity-0"
                }`}
              >
                {messages.map((message) => {
                  const isMe =
                    message.senderId ===
                    currentUser.uid;

                  const currentSwipeDistance =
                    activeSwipeId === message.id
                      ? swipeDistance
                      : 0;

                  const replyReady =
                    currentSwipeDistance >=
                    SWIPE_REPLY_DISTANCE;

                  return (
                    <div
                      key={message.id}
                      className={`relative flex ${
                        isMe
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`pointer-events-none absolute top-1/2 flex -translate-y-1/2 items-center gap-1 text-sm font-black transition-opacity ${
                          isMe
                            ? "left-2"
                            : "left-2"
                        } ${
                          currentSwipeDistance > 8
                            ? "opacity-100"
                            : "opacity-0"
                        } ${
                          replyReady
                            ? "text-blue-600"
                            : "text-slate-400"
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 transition-transform dark:bg-slate-900 dark:ring-slate-800 ${
                            replyReady
                              ? "scale-110"
                              : "scale-100"
                          }`}
                        >
                          ↩
                        </span>
                      </div>

                      <div
                        role="button"
                        tabIndex={0}
                        onContextMenu={(event) =>
                          event.preventDefault()
                        }
                        onPointerDown={(event) =>
                          handleMessagePointerDown(
                            event,
                            message
                          )
                        }
                        onPointerMove={(event) =>
                          handleMessagePointerMove(
                            event,
                            message
                          )
                        }
                        onPointerUp={(event) =>
                          handleMessagePointerUp(
                            event,
                            message
                          )
                        }
                        onPointerCancel={
                          handleMessagePointerCancel
                        }
                        style={{
                          transform: `translateX(${currentSwipeDistance}px)`,
                          touchAction: "pan-y",
                          transition:
                            activeSwipeId ===
                            message.id
                              ? "none"
                              : "transform 180ms ease",
                          userSelect: "none",
                          WebkitUserSelect: "none",
                        }}
                        className={`relative z-[1] max-w-[82%] cursor-grab rounded-[1.5rem] px-4 py-3 shadow-sm active:cursor-grabbing sm:max-w-[70%] sm:px-5 ${
                          isMe
                            ? "rounded-br-md bg-blue-600 text-white"
                            : "rounded-bl-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                        }`}
                      >
                        {message.replyTo && (
                          <div
                            className={`mb-2 rounded-2xl border-l-4 px-3 py-2 ${
                              isMe
                                ? "border-l-white/70 bg-white/15"
                                : "border-l-blue-600 bg-slate-100 dark:bg-slate-800"
                            }`}
                          >
                            <p
                              className={`text-[11px] font-black ${
                                isMe
                                  ? "text-blue-100"
                                  : "text-blue-600"
                              }`}
                            >
                              Reply to{" "}
                              {message.replyTo
                                .senderName ||
                                "message"}
                            </p>

                            <p
                              className={`mt-1 line-clamp-2 text-xs ${
                                isMe
                                  ? "text-white/80"
                                  : "text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              {
                                message.replyTo
                                  .text
                              }
                            </p>
                          </div>
                        )}

                        <p
                          className={`text-[11px] font-black sm:text-xs ${
                            isMe
                              ? "text-blue-100"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {isMe
                            ? "You"
                            : message.senderName ||
                              "Student"}
                        </p>

                        <p className="mt-1 break-words text-sm leading-6 sm:text-base">
                          {message.text}
                        </p>

                        {isMe && (
                          <div className="mt-1 flex min-h-4 items-center justify-end">
                            {renderMessageStatus(
                              message
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {otherUserTyping && (
                  <div className="flex justify-start">
                    <div className="rounded-[1.5rem] rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                      </span>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <form
            onSubmit={sendMessage}
            className="shrink-0 border-t border-slate-200 bg-white/95 p-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 sm:p-5"
          >
            {replyTo && (
              <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border-l-4 border-l-blue-600 bg-blue-50 px-4 py-3 dark:bg-blue-950/30">
                <div className="min-w-0">
                  <p className="text-xs font-black text-blue-600">
                    Replying to{" "}
                    {replyTo.senderId ===
                    currentUser.uid
                      ? "your message"
                      : replyTo.senderName ||
                        "message"}
                  </p>

                  <p className="mt-1 line-clamp-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                    {replyTo.text}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white font-black text-slate-500 shadow-sm transition active:scale-90 dark:bg-slate-800"
                >
                  ×
                </button>
              </div>
            )}

            <div className="flex gap-2 sm:gap-3">
              <input
                ref={inputRef}
                value={text}
                onChange={handleTextChange}
                placeholder="Type your message..."
                disabled={showUndo}
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 sm:px-5 sm:py-4 sm:text-base"
              />

              <Button
                type="submit"
                disabled={
                  sending ||
                  showUndo ||
                  !text.trim()
                }
                className="shrink-0"
              >
                {sending ? "..." : "Send"}
              </Button>
            </div>
          </form>
        </Card>
      </main>

      {selectedMessage && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 px-3 pb-3 backdrop-blur-[2px] sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedMessage(null);
            }
          }}
        >
          <div className="w-full max-w-md animate-[slideUp_180ms_ease-out] overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" />

            <div className="px-3 pb-3 pt-1">
              <p className="text-base font-black text-slate-900 dark:text-white">
                Delete message?
              </p>

              <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                {selectedMessage.text}
              </p>
            </div>

            {selectedMessage.senderId ===
            currentUser.uid ? (
              <button
                type="button"
                onClick={handleDeleteForEveryone}
                disabled={
                  deletingMessageId ===
                  selectedMessage.id
                }
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left font-black text-red-600 transition hover:bg-red-50 active:scale-[0.99] disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-xl dark:bg-red-950/30">
                  🗑️
                </span>

                <span>
                  {deletingMessageId ===
                  selectedMessage.id
                    ? "Deleting..."
                    : "Delete for everyone"}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDeleteForMe}
                disabled={
                  deletingMessageId ===
                  selectedMessage.id
                }
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left font-black text-red-600 transition hover:bg-red-50 active:scale-[0.99] disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-xl dark:bg-red-950/30">
                  🗑️
                </span>

                <span>
                  {deletingMessageId ===
                  selectedMessage.id
                    ? "Deleting..."
                    : "Delete for me"}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setSelectedMessage(null)
              }
              disabled={Boolean(deletingMessageId)}
              className="mt-1 w-full rounded-2xl px-4 py-4 text-center font-black text-slate-600 transition hover:bg-slate-100 active:scale-[0.99] disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showUndo && (
        <div className="fixed inset-x-3 bottom-5 z-50 mx-auto max-w-md">
          <div className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/20 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                Chat deleted for both users
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Undo available for 5 seconds.
              </p>
            </div>

            <button
              type="button"
              onClick={handleUndoDelete}
              disabled={restoring}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-black text-white transition active:scale-95 disabled:opacity-60"
            >
              {restoring
                ? "Restoring..."
                : "Undo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}