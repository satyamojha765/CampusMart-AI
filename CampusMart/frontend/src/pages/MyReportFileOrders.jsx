import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function MyReportFileOrders({ onOrderNow }) {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "reportFileOrders"),
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
          .sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          });

        setOrders(list);
        setLoading(false);
      },
      (error) => {
        console.log("My report orders error:", error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  if (loading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-44 rounded-[30px] bg-slate-200 dark:bg-slate-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-[32px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 text-center shadow-sm">
        <div className="mx-auto h-20 w-20 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-5xl">
          📦
        </div>

        <h2 className="mt-5 text-2xl font-black">No Orders Yet</h2>

        <p className="mt-2 text-sm font-bold text-slate-500">
          Your report file orders will appear here after placing an order.
        </p>

        <button
          onClick={onOrderNow}
          className="mt-6 w-full rounded-2xl bg-blue-600 text-white px-6 py-4 font-black shadow-lg shadow-blue-600/25 active:scale-95"
        >
          Order Report File
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-[28px] bg-gradient-to-br from-blue-600 to-blue-800 text-white p-5 shadow-xl shadow-blue-900/20">
        <p className="text-sm font-black text-blue-100">
          My Report File Orders
        </p>

        <h2 className="mt-1 text-3xl font-black">
          {orders.length} Order{orders.length > 1 ? "s" : ""}
        </h2>

        <p className="mt-2 text-sm font-semibold text-blue-100">
          Track your order status and pickup details here.
        </p>
      </div>

      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}

function OrderCard({ order }) {
  const status = order.orderStatus || "Pending";
  const paymentLabel =
    order.paymentMethod === "COD" ? "Cash on Pickup" : "Online";

  return (
    <div className="overflow-hidden rounded-[30px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black text-blue-600">
              ORDER #{order.id.slice(0, 8).toUpperCase()}
            </p>

            <h3 className="mt-1 text-xl font-black">📘 Report File</h3>

            <p className="mt-1 text-sm font-bold text-slate-500">
              {formatDate(order.createdAt)}
            </p>
          </div>

          <StatusBadge status={status} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Info label="Qty" value={`${order.quantity || 0} File`} />
          <Info label="Total" value={`₹${order.totalAmount || 0}`} />
          <Info label="Payment" value={paymentLabel} />
          <Info label="Pickup" value={order.pickupLocation || "Gabbar PG"} />
        </div>

        {status === "Ready for Pickup" && (
          <div className="mt-4 rounded-3xl bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900 p-4">
            <p className="font-black text-green-700 dark:text-green-400">
              🎉 Your file is ready!
            </p>
            <p className="mt-1 text-sm font-bold text-green-700/80 dark:text-green-300">
              Collect from Gabbar PG between 10:00 AM - 8:00 PM.
            </p>
          </div>
        )}

        {order.note && (
          <div className="mt-4 rounded-2xl bg-slate-100 dark:bg-slate-800 p-4">
            <p className="text-xs font-black text-slate-500">Note</p>
            <p className="mt-1 text-sm font-bold">{order.note}</p>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 p-5">
        <Timeline status={status} />
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4">
      <p className="text-[11px] font-black text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black truncate">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Pending: "bg-yellow-100 text-yellow-700",
    Accepted: "bg-blue-100 text-blue-700",
    Preparing: "bg-orange-100 text-orange-700",
    "Ready for Pickup": "bg-green-100 text-green-700",
    Completed: "bg-slate-200 text-slate-700",
    Cancelled: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`shrink-0 px-3 py-2 rounded-full text-[11px] font-black ${
        styles[status] || styles.Pending
      }`}
    >
      {status}
    </span>
  );
}

function Timeline({ status }) {
  const steps = [
    "Pending",
    "Accepted",
    "Preparing",
    "Ready for Pickup",
    "Completed",
  ];

  const activeIndex =
    status === "Cancelled" ? -1 : Math.max(0, steps.indexOf(status));

  if (status === "Cancelled") {
    return (
      <div className="rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 p-4">
        <p className="font-black text-red-700 dark:text-red-400">
          Order Cancelled
        </p>
        <p className="mt-1 text-sm font-bold text-red-700/80 dark:text-red-300">
          This order was cancelled.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-black mb-4">Order Timeline</p>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const active = index <= activeIndex;

          return (
            <div key={step} className="flex items-center gap-3">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {active ? "✓" : ""}
              </div>

              <div className="flex-1">
                <p
                  className={`text-sm font-black ${
                    active
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-400"
                  }`}
                >
                  {step}
                </p>

                {step === "Ready for Pickup" && active && (
                  <p className="text-xs font-bold text-green-600">
                    Pickup from Gabbar PG
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDate(timestamp) {
  if (!timestamp?.seconds) return "Just now";

  return new Date(timestamp.seconds * 1000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}