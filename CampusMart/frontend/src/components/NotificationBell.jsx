import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function NotificationBell() {
  const { currentUser } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!currentUser?.uid) {
      setCount(0);
      return undefined;
    }

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const groups = new Set();

        snapshot.docs.forEach((item) => {
          const data = item.data();

          if (data.hidden === true) {
            return;
          }

          const isChatNotification =
            (data.type === "message" || data.type === "chat") &&
            Boolean(data.chatId);

          if (isChatNotification) {
            groups.add(`chat_${data.chatId}`);
            return;
          }

          if (data.type === "wishlist" && data.productId) {
            groups.add(`wishlist_${data.productId}`);
            return;
          }

          groups.add(item.id);
        });

        setCount(groups.size);
      },
      (error) => {
        console.error(
          "Notification count error:",
          error
        );
        setCount(0);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  return (
    <Link
      to="/notifications"
      title="Notifications"
      aria-label={
        count > 0
          ? `${count} unread notification groups`
          : "Notifications"
      }
      className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xl shadow-sm transition-all duration-200 hover:scale-105 hover:bg-blue-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
    >
      <span
        className={`transition-transform duration-300 ${
          count > 0 ? "animate-pulse" : ""
        }`}
        aria-hidden="true"
      >
        🔔
      </span>

      {count > 0 && (
        <>
          <span className="absolute -right-1 -top-1 z-10 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white shadow-lg ring-2 ring-white dark:ring-slate-900">
            {count > 99 ? "99+" : count}
          </span>

          <span className="absolute -right-1 -top-1 h-5 w-5 animate-ping rounded-full bg-red-400 opacity-40" />
        </>
      )}
    </Link>
  );
}