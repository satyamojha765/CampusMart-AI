import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Badge from "../components/ui/Badge";

export default function Notifications({ onLogout }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .filter((item) => item.hidden !== true);

        list.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });

        setNotifications(list);
        setLoading(false);
      },
      (error) => {
        console.error("Notifications load error:", error);
        setNotifications([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const groupedNotifications = useMemo(() => {
    const groups = {};

    notifications.forEach((item) => {
      const isChatNotification =
        (item.type === "message" || item.type === "chat") &&
        Boolean(item.chatId);

      const key = isChatNotification
        ? `chat_${item.chatId}`
        : item.type === "wishlist" && item.productId
        ? `wishlist_${item.productId}`
        : item.id;

      if (!groups[key]) {
        groups[key] = {
          ...item,
          ids: [],
          count: 0,
          unreadCount: 0,
          messageCount: 0,
          chatRequestCount: 0,
          latestTime: 0,
          latestMessages: [],
        };
      }

      const group = groups[key];
      const itemTime =
        item.createdAt?.seconds ||
        item.createdAt?.toMillis?.() ||
        0;

      group.ids.push(item.id);
      group.count += 1;
      group.unreadCount += item.read ? 0 : 1;

      if (item.type === "message") {
        group.messageCount += 1;

        const preview =
          item.messageText ||
          item.message ||
          "New message received.";

        group.latestMessages.push({
          text: preview,
          time: itemTime,
        });
      }

      if (item.type === "chat") {
        group.chatRequestCount += 1;
      }

      if (itemTime >= group.latestTime) {
        const savedIds = group.ids;
        const savedCount = group.count;
        const savedUnreadCount = group.unreadCount;
        const savedMessageCount = group.messageCount;
        const savedChatRequestCount = group.chatRequestCount;
        const savedMessages = group.latestMessages;

        groups[key] = {
          ...group,
          ...item,
          ids: savedIds,
          count: savedCount,
          unreadCount: savedUnreadCount,
          messageCount: savedMessageCount,
          chatRequestCount: savedChatRequestCount,
          latestTime: itemTime,
          latestMessages: savedMessages,
        };
      }
    });

    return Object.values(groups)
      .map((item) => ({
        ...item,
        latestMessages: [...(item.latestMessages || [])]
          .sort((a, b) => b.time - a.time)
          .slice(0, 3)
          .map((message) => message.text),
      }))
      .sort(
        (a, b) =>
          (b.latestTime || 0) - (a.latestTime || 0)
      );
  }, [notifications]);

  const unreadTotal = groupedNotifications.reduce(
    (total, item) => total + (item.unreadCount || 0),
    0
  );

  async function markGroupAsRead(item) {
    const ids = item.ids || [item.id];

    await Promise.all(
      ids.map((id) =>
        updateDoc(doc(db, "notifications", id), {
          read: true,
        })
      )
    );
  }

  async function handleNotificationClick(item) {
    await markGroupAsRead(item);

    if ((item.type === "message" || item.type === "chat") && item.chatId) {
      navigate(`/chat/${item.chatId}`);
      return;
    }

    if (item.productId) {
      navigate(`/product/${item.productId}`);
      return;
    }
  }

  async function markAllAsRead() {
    await Promise.all(
      notifications
        .filter((item) => !item.read)
        .map((item) =>
          updateDoc(doc(db, "notifications", item.id), {
            read: true,
          })
        )
    );
  }

  function getTitle(item) {
    const isChatGroup =
      (item.type === "message" || item.type === "chat") &&
      item.chatId;

    if (isChatGroup && item.messageCount > 0) {
      const senderName =
        item.senderName ||
        item.title?.replace("New message", "").trim() ||
        "Someone";

      return `${senderName} sent ${item.messageCount} message${
        item.messageCount > 1 ? "s" : ""
      }`;
    }

    if (isChatGroup && item.chatRequestCount > 0) {
      return item.title || "New chat request";
    }

    if (item.type === "wishlist" && item.count > 1) {
      return `${item.count} wishlist updates`;
    }

    return item.title || "Notification";
  }

  function getDescription(item) {
    const isChatGroup =
      (item.type === "message" || item.type === "chat") &&
      item.chatId;

    if (isChatGroup && item.latestMessages?.length > 0) {
      return item.latestMessages[0];
    }

    if (isChatGroup && item.chatRequestCount > 0) {
      return (
        item.message ||
        "A buyer started a chat about your product."
      );
    }

    if (item.type === "wishlist" && item.count > 1) {
      return `${item.count} students saved this product. Tap to view product.`;
    }

    return item.message || "You have a new notification.";
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar onLogout={onLogout} />

      <main className="mx-auto max-w-4xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="relative mb-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 via-blue-500 to-amber-400 p-[1px] shadow-xl shadow-blue-500/10 sm:mb-8 sm:rounded-[2.5rem]">
          <div className="rounded-[2rem] bg-white/95 p-5 backdrop-blur-xl dark:bg-slate-900/95 sm:rounded-[2.5rem] sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-blue-600">CampusMart</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-5xl">
                  Notifications
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
                  Chats, wishlist updates and product alerts.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {unreadTotal > 0 && (
                  <Badge variant="red">{unreadTotal} unread</Badge>
                )}

                <Button
                  variant="soft"
                  onClick={markAllAsRead}
                  disabled={unreadTotal === 0}
                >
                  Mark all read
                </Button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 sm:space-y-4">
            {[1, 2, 3].map((item) => (
              <Card
                key={item}
                className="overflow-hidden rounded-[1.5rem] p-3 sm:rounded-[2rem] sm:p-5"
              >
                <div className="flex items-start gap-3 sm:gap-5">
                  <div className="h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800 sm:h-16 sm:w-16" />

                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="h-5 w-2/3 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : groupedNotifications.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="No notifications"
            message="Your notifications will appear here."
          />
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {groupedNotifications.map((item) => (
              <button
                key={`${item.type}_${item.chatId || item.productId || item.id}_${
                  item.senderId || ""
                }`}
                type="button"
                onClick={() => handleNotificationClick(item)}
                className="w-full text-left"
              >
                <Card
                  className={`overflow-hidden rounded-[1.5rem] p-3 transition hover:-translate-y-1 active:scale-[0.99] sm:rounded-[2rem] sm:p-5 ${
                    item.unreadCount > 0
                      ? "border-l-4 border-l-blue-600 bg-blue-50/50 dark:bg-blue-950/10"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3 sm:gap-5">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-2xl shadow-sm dark:bg-slate-800 sm:h-16 sm:w-16">
                      {item.icon || "🔔"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="line-clamp-1 text-base font-black sm:text-lg">
                            {getTitle(item)}
                          </h3>

                          <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
                            {getDescription(item)}
                          </p>
                        </div>

                        {item.unreadCount > 0 && (
                          <span className="mt-2 h-3 w-3 shrink-0 rounded-full bg-red-500" />
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.count > 1 && (
                          <Badge variant="blue">{item.count} updates</Badge>
                        )}

                        {item.unreadCount > 0 && (
                          <Badge variant="red">{item.unreadCount} unread</Badge>
                        )}

                        <Badge variant="gray">
                          {item.type === "message" || item.type === "chat"
                            ? "Open chat"
                            : item.productId
                            ? "View product"
                            : "Open"}
                        </Badge>
                      </div>

                      {item.latestMessages?.length > 1 && (
                        <div className="mt-3 space-y-1.5">
                          {item.latestMessages.slice(1).map((msg, index) => (
                            <p
                              key={index}
                              className="line-clamp-1 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:text-sm"
                            >
                              {msg}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="hidden shrink-0 text-2xl text-slate-400 sm:block">
                      ›
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}