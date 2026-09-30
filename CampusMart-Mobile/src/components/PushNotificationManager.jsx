import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
} from "@capacitor/push-notifications";
import {
  arrayUnion,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function PushNotificationManager() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (
      !currentUser?.uid ||
      !Capacitor.isNativePlatform()
    ) {
      return undefined;
    }

    let registrationListener;
    let registrationErrorListener;
    let receivedListener;
    let actionListener;
    let isMounted = true;

    async function savePushToken(token) {
      if (!token || !currentUser?.uid) return;

      try {
        await setDoc(
          doc(db, "users", currentUser.uid),
          {
            pushTokens: arrayUnion(token),
            lastPushToken: token,
            pushNotificationsEnabled: true,
            pushTokenUpdatedAt: serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        console.log("FCM token saved");
      } catch (error) {
        console.error(
          "Push token save error:",
          error
        );
      }
    }

    function openNotificationPage(data = {}) {
      const chatId =
        data.chatId ||
        data.chatID ||
        "";

      const productId =
        data.productId ||
        data.productID ||
        "";

      const notificationType =
        data.type || "";

      if (chatId) {
        navigate(`/chat/${chatId}`);
        return;
      }

      if (productId) {
        navigate(`/product/${productId}`);
        return;
      }

      if (
        notificationType === "wishlist" ||
        notificationType === "product"
      ) {
        navigate("/notifications");
        return;
      }

      navigate("/notifications");
    }

    async function setupPushNotifications() {
      try {
        registrationListener =
          await PushNotifications.addListener(
            "registration",
            async (token) => {
              if (!isMounted) return;

              console.log(
                "Push registration token:",
                token.value
              );

              await savePushToken(token.value);
            }
          );

        registrationErrorListener =
          await PushNotifications.addListener(
            "registrationError",
            (error) => {
              console.error(
                "Push registration error:",
                error
              );
            }
          );

        receivedListener =
          await PushNotifications.addListener(
            "pushNotificationReceived",
            (notification) => {
              console.log(
                "Push received:",
                notification
              );
            }
          );

        actionListener =
          await PushNotifications.addListener(
            "pushNotificationActionPerformed",
            (action) => {
              const data =
                action.notification?.data || {};

              openNotificationPage(data);
            }
          );

        let permissionStatus =
          await PushNotifications.checkPermissions();

        if (permissionStatus.receive === "prompt") {
          permissionStatus =
            await PushNotifications.requestPermissions();
        }

        if (
          permissionStatus.receive !== "granted"
        ) {
          console.log(
            "Push notification permission denied"
          );

          await setDoc(
            doc(db, "users", currentUser.uid),
            {
              pushNotificationsEnabled: false,
              pushPermissionUpdatedAt:
                serverTimestamp(),
            },
            {
              merge: true,
            }
          );

          return;
        }

        await PushNotifications.register();
      } catch (error) {
        console.error(
          "Push notification setup error:",
          error
        );
      }
    }

    setupPushNotifications();

    return () => {
      isMounted = false;

      registrationListener?.remove();
      registrationErrorListener?.remove();
      receivedListener?.remove();
      actionListener?.remove();
    };
  }, [currentUser?.uid, navigate]);

  return null;
}