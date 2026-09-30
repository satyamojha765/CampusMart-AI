import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Badge from "../components/ui/Badge";

export default function Chats({ onLogout }) {
  const { currentUser } = useAuth();

  const [chats, setChats] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingUnread, setLoadingUnread] = useState(true);

  useEffect(() => {
    if (!currentUser?.uid) {
      setChats([]);
      setLoadingChats(false);
      return undefined;
    }

    setLoadingChats(true);

    const chatsQuery = query(
      collection(db, "chats"),
      where(
        "participants",
        "array-contains",
        currentUser.uid
      )
    );

    const unsubscribe = onSnapshot(
      chatsQuery,
      (snapshot) => {
        const list = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .filter((chat) => {
            const deletedFor = Array.isArray(
              chat.deletedFor
            )
              ? chat.deletedFor
              : [];

            return !deletedFor.includes(
              currentUser.uid
            );
          })
          .sort((a, b) => {
            const timeA =
              a.updatedAt?.seconds ||
              a.updatedAt?.toMillis?.() ||
              0;

            const timeB =
              b.updatedAt?.seconds ||
              b.updatedAt?.toMillis?.() ||
              0;

            return timeB - timeA;
          });

        setChats(list);
        setLoadingChats(false);
      },
      (error) => {
        console.error(
          "Chats listener error:",
          error
        );
        setChats([]);
        setLoadingChats(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setUnreadNotifications([]);
      setLoadingUnread(false);
      return undefined;
    }

    setLoadingUnread(true);

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", currentUser.uid),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const list = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .filter(
            (item) =>
              item.chatId &&
              (item.type === "message" ||
                item.type === "chat") &&
              item.hidden !== true
          );

        setUnreadNotifications(list);
        setLoadingUnread(false);
      },
      (error) => {
        console.error(
          "Unread chat notifications error:",
          error
        );
        setUnreadNotifications([]);
        setLoadingUnread(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const unreadByChat = useMemo(() => {
    const map = {};

    unreadNotifications.forEach((item) => {
      if (!item.chatId) return;

      if (!map[item.chatId]) {
        map[item.chatId] = {
          count: 0,
          latestTime: 0,
        };
      }

      const time =
        item.createdAt?.seconds ||
        item.createdAt?.toMillis?.() ||
        0;

      map[item.chatId].count += 1;
      map[item.chatId].latestTime = Math.max(
        map[item.chatId].latestTime,
        time
      );
    });

    return map;
  }, [unreadNotifications]);

  const sortedChats = useMemo(() => {
    return [...chats].sort((a, b) => {
      const chatA = a.chatId || a.id;
      const chatB = b.chatId || b.id;

      const unreadA =
        unreadByChat[chatA]?.latestTime || 0;

      const unreadB =
        unreadByChat[chatB]?.latestTime || 0;

      if (unreadA !== unreadB) {
        return unreadB - unreadA;
      }

      const timeA =
        a.updatedAt?.seconds ||
        a.updatedAt?.toMillis?.() ||
        0;

      const timeB =
        b.updatedAt?.seconds ||
        b.updatedAt?.toMillis?.() ||
        0;

      return timeB - timeA;
    });
  }, [chats, unreadByChat]);

  function formatChatTime(timestamp) {
    if (!timestamp) return "";

    const milliseconds =
      timestamp?.toMillis?.() ||
      (timestamp?.seconds
        ? timestamp.seconds * 1000
        : 0);

    if (!milliseconds) return "";

    const date = new Date(milliseconds);
    const now = new Date();

    const sameDay =
      date.toDateString() === now.toDateString();

    if (sameDay) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
    });
  }

  const loading =
    loadingChats || loadingUnread;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar onLogout={onLogout} />

      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="relative mb-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 via-blue-500 to-amber-400 p-[1px] shadow-xl shadow-blue-500/10 sm:mb-8 sm:rounded-[2.5rem]">
          <div className="rounded-[2rem] bg-white/95 p-5 backdrop-blur-xl dark:bg-slate-900/95 sm:rounded-[2.5rem] sm:p-8">
            <p className="text-sm font-black text-blue-600">
              CampusMart
            </p>

            <div className="mt-1 flex items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                  My Chats
                </h1>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
                  All product conversations in one place.
                </p>
              </div>

              {unreadNotifications.length > 0 && (
                <Badge variant="red">
                  {unreadNotifications.length} unread
                </Badge>
              )}
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
                <div className="flex items-center gap-3 sm:gap-5">
                  <div className="h-16 w-16 shrink-0 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800 sm:h-20 sm:w-20" />

                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="h-5 w-2/3 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                  </div>

                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                </div>
              </Card>
            ))}
          </div>
        ) : sortedChats.length === 0 ? (
          <EmptyState
            icon="💬"
            title="No chats yet"
            message="Open any product and start chatting with seller."
          />
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {sortedChats.map((chat) => {
              const pathId =
                chat.chatId || chat.id;

              const unreadCount =
                unreadByChat[pathId]?.count || 0;

              const lastMessageIsMine =
                chat.lastSenderId ===
                currentUser?.uid;

              return (
                <Link
                  key={chat.id}
                  to={`/chat/${pathId}`}
                  className="block"
                >
                  <Card
                    className={`overflow-hidden rounded-[1.5rem] p-3 transition active:scale-[0.99] sm:rounded-[2rem] sm:p-5 ${
                      unreadCount > 0
                        ? "border-l-4 border-l-blue-600 shadow-md"
                        : "hover:-translate-y-1"
                    }`}
                  >
                    <div className="flex items-center gap-3 sm:gap-5">
                      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-3xl shadow-sm dark:bg-slate-800 sm:h-20 sm:w-20">
                        {chat.productImage ? (
                          <img
                            src={chat.productImage}
                            alt={
                              chat.productName ||
                              "Product"
                            }
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          "💬"
                        )}

                        {unreadCount > 0 && (
                          <span className="absolute right-1 top-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3
                            className={`truncate text-base sm:text-xl ${
                              unreadCount > 0
                                ? "font-black"
                                : "font-bold"
                            }`}
                          >
                            {chat.productName ||
                              "Product Chat"}
                          </h3>

                          <span className="shrink-0 text-[11px] font-bold text-slate-400 sm:text-xs">
                            {formatChatTime(
                              chat.updatedAt
                            )}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-3">
                          <p
                            className={`line-clamp-1 text-sm sm:text-base ${
                              unreadCount > 0
                                ? "font-black text-slate-900 dark:text-white"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {lastMessageIsMine &&
                            chat.lastMessage
                              ? "You: "
                              : ""}
                            {chat.lastMessage ||
                              "No messages yet"}
                          </p>

                          {unreadCount > 0 && (
                            <span className="flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full bg-blue-600 px-2 text-[11px] font-black text-white shadow">
                              {unreadCount > 99
                                ? "99+"
                                : unreadCount}
                            </span>
                          )}
                        </div>

                        <div className="mt-2">
                          <Badge
                            variant={
                              unreadCount > 0
                                ? "red"
                                : "blue"
                            }
                          >
                            {unreadCount > 0
                              ? "New messages"
                              : "Open Chat"}
                          </Badge>
                        </div>
                      </div>

                      <div className="shrink-0 text-2xl text-slate-400">
                        ›
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}