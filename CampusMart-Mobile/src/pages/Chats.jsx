import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Badge from "../components/ui/Badge";

export default function Chats({ onLogout }) {
  const { currentUser } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setChats([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .filter((chat) => {
            const deletedFor = Array.isArray(chat.deletedFor)
              ? chat.deletedFor
              : [];

            return !deletedFor.includes(currentUser.uid);
          });

        list.sort((a, b) => {
          const timeA = a.updatedAt?.seconds || 0;
          const timeB = b.updatedAt?.seconds || 0;
          return timeB - timeA;
        });

        setChats(list);
        setLoading(false);
      },
      (error) => {
        console.error("Chats load error:", error);
        setChats([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar onLogout={onLogout} />

      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="relative mb-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 via-blue-500 to-amber-400 p-[1px] shadow-xl shadow-blue-500/10 sm:mb-8 sm:rounded-[2.5rem]">
          <div className="rounded-[2rem] bg-white/95 p-5 backdrop-blur-xl dark:bg-slate-900/95 sm:rounded-[2.5rem] sm:p-8">
            <p className="text-sm font-black text-blue-600">CampusMart</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-5xl">
              My Chats
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
              All product conversations in one place.
            </p>
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
                    <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800 sm:hidden" />
                  </div>

                  <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                </div>
              </Card>
            ))}
          </div>
        ) : chats.length === 0 ? (
          <EmptyState
            icon="💬"
            title="No chats yet"
            message="Open any product and start chatting with seller."
          />
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {chats.map((chat) => {
              const pathId = chat.chatId || chat.id;

              return (
                <Link key={chat.id} to={`/chat/${pathId}`} className="block">
                  <Card className="overflow-hidden rounded-[1.5rem] p-3 transition hover:-translate-y-1 active:scale-[0.99] sm:rounded-[2rem] sm:p-5">
                    <div className="flex items-center gap-3 sm:gap-5">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-3xl shadow-sm dark:bg-slate-800 sm:h-20 sm:w-20">
                        {chat.productImage ? (
                          <img
                            src={chat.productImage}
                            alt={chat.productName || "Product"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          "💬"
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="truncate text-base font-black sm:text-xl">
                            {chat.productName || "Product Chat"}
                          </h3>

                          <div className="hidden shrink-0 sm:block">
                            <Badge variant="blue">Open</Badge>
                          </div>
                        </div>

                        <p className="mt-1 line-clamp-1 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
                          {chat.lastMessage || "No messages yet"}
                        </p>

                        <div className="mt-2 sm:hidden">
                          <Badge variant="blue">Open Chat</Badge>
                        </div>
                      </div>

                      <div className="shrink-0 text-2xl text-slate-400">›</div>
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