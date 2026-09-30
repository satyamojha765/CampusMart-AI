import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";

export default function AdminReportFileOrders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");

  const statuses = [
    "All",
    "Pending",
    "Accepted",
    "Preparing",
    "Ready for Pickup",
    "Completed",
    "Cancelled",
  ];

  useEffect(() => {
    const q = query(
      collection(db, "reportFileOrders"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setOrders(list);
        setLoading(false);
      },
      (error) => {
        console.log(error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => o.orderStatus === "Pending").length,
      ready: orders.filter((o) => o.orderStatus === "Ready for Pickup").length,
      completed: orders.filter((o) => o.orderStatus === "Completed").length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const text = searchText.trim().toLowerCase();

      const matchesSearch =
        !text ||
        order.userName?.toLowerCase().includes(text) ||
        order.userEmail?.toLowerCase().includes(text) ||
        order.userPhone?.toLowerCase().includes(text) ||
        order.id?.toLowerCase().includes(text);

      const matchesStatus =
        statusFilter === "All" || order.orderStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchText, statusFilter]);

  async function updateOrderStatus(order, newStatus) {
    if (!newStatus || order.orderStatus === newStatus) return;

    try {
      setUpdatingId(order.id);

      await updateDoc(doc(db, "reportFileOrders", order.id), {
        orderStatus: newStatus,
        updatedAt: serverTimestamp(),
      });

      if (order.userId) {
        await addDoc(collection(db, "notifications"), {
          userId: order.userId,
          type: "report_file_order",
          title: "📘 Report File Update",
          message: getNotificationMessage(newStatus),
          orderId: order.id,
          serviceType: "report_file",
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.log(error);
      alert("Status update nahi hua. Please try again.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-950 dark:text-white">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 text-sm font-black text-blue-600 mb-2"
            >
              ← Back to Admin
            </Link>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
              Report File Orders
            </h1>

            <p className="mt-2 text-sm sm:text-base font-bold text-slate-500">
              Manage student report file orders and update pickup status.
            </p>
          </div>

          <div className="hidden sm:flex h-16 w-16 rounded-[24px] bg-blue-600 text-white items-center justify-center text-4xl shadow-lg shadow-blue-600/25">
            📘
          </div>
        </div>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Orders" value={stats.total} icon="📦" />
          <StatCard title="Pending" value={stats.pending} icon="🟡" />
          <StatCard title="Ready" value={stats.ready} icon="🟢" />
          <StatCard title="Completed" value={stats.completed} icon="✅" />
        </section>

        <section className="mt-6 rounded-[30px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm">
          <div className="grid lg:grid-cols-[1fr_auto] gap-4">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-100 dark:bg-slate-800 px-4 py-3">
              <span className="text-xl">🔍</span>
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by name, email, phone, order ID..."
                className="w-full bg-transparent outline-none font-bold placeholder:text-slate-400"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-black transition ${
                    statusFilter === status
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6">
          {loading ? (
            <LoadingCards />
          ) : filteredOrders.length === 0 ? (
            <EmptyOrders />
          ) : (
            <div className="grid gap-4">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  updatingId={updatingId}
                  onStatusChange={updateOrderStatus}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function OrderCard({ order, updatingId, onStatusChange }) {
  const status = order.orderStatus || "Pending";
  const isUpdating = updatingId === order.id;

  return (
    <div className="overflow-hidden rounded-[30px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="flex gap-4">
            <div className="h-14 w-14 shrink-0 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-3xl">
              📘
            </div>

            <div>
              <p className="text-xs font-black text-blue-600">
                ORDER #{order.id.slice(0, 8).toUpperCase()}
              </p>

              <h2 className="mt-1 text-2xl font-black">
                {order.userName || "Student"}
              </h2>

              <p className="mt-1 text-sm font-bold text-slate-500">
                {order.userEmail || "No email"}{" "}
                {order.userPhone ? `• ${order.userPhone}` : ""}
              </p>

              <p className="mt-1 text-xs font-bold text-slate-400">
                {formatDate(order.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <StatusBadge status={status} />

            <select
              value={status}
              disabled={isUpdating}
              onChange={(e) => onStatusChange(order, e.target.value)}
              className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-4 py-3 font-black outline-none disabled:opacity-60"
            >
              <option>Pending</option>
              <option>Accepted</option>
              <option>Preparing</option>
              <option>Ready for Pickup</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Info label="Quantity" value={`${order.quantity || 0} File`} />
          <Info label="Total" value={`₹${order.totalAmount || 0}`} />
          <Info
            label="Payment"
            value={order.paymentMethod === "COD" ? "Cash Pickup" : "Online"}
          />
          <Info label="Pickup" value={order.pickupLocation || "Gabbar PG"} />
        </div>

        {order.note && (
          <div className="mt-4 rounded-2xl bg-slate-100 dark:bg-slate-800 p-4">
            <p className="text-xs font-black text-slate-500">Student Note</p>
            <p className="mt-1 text-sm font-bold">{order.note}</p>
          </div>
        )}

        {status === "Ready for Pickup" && (
          <div className="mt-4 rounded-3xl bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900 p-4">
            <p className="font-black text-green-700 dark:text-green-400">
              Ready for Pickup
            </p>
            <p className="mt-1 text-sm font-bold text-green-700/80 dark:text-green-300">
              Student can collect from Gabbar PG between 10:00 AM - 8:00 PM.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 p-5 sm:p-6">
        <Timeline status={status} />
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4">
      <p className="text-[11px] font-black text-slate-500">{label}</p>
      <p className="mt-1 font-black truncate">{value}</p>
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
      className={`inline-flex items-center justify-center rounded-full px-4 py-3 text-xs font-black ${
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

  if (status === "Cancelled") {
    return (
      <div className="rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 p-4">
        <p className="font-black text-red-700 dark:text-red-400">
          Order Cancelled
        </p>
        <p className="mt-1 text-sm font-bold text-red-700/80 dark:text-red-300">
          This report file order was cancelled.
        </p>
      </div>
    );
  }

  const activeIndex = Math.max(0, steps.indexOf(status));

  return (
    <div>
      <p className="text-sm font-black mb-4">Order Timeline</p>

      <div className="grid sm:grid-cols-5 gap-3">
        {steps.map((step, index) => {
          const active = index <= activeIndex;

          return (
            <div
              key={step}
              className={`rounded-2xl p-4 border ${
                active
                  ? "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              }`}
            >
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                }`}
              >
                {active ? "✓" : ""}
              </div>

              <p
                className={`mt-3 text-xs font-black ${
                  active
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400"
                }`}
              >
                {step}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function StatCard({ title, value, icon }) {
  return (
    <div className="rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-500">{title}</p>
          <h2 className="mt-2 text-4xl font-black text-blue-600">{value}</h2>
        </div>

        <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-3xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function LoadingCards() {
  return (
    <div className="grid gap-4">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-60 rounded-[30px] bg-slate-200 dark:bg-slate-800 animate-pulse"
        />
      ))}
    </div>
  );
}

function EmptyOrders() {
  return (
    <div className="rounded-[32px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center shadow-sm">
      <div className="mx-auto h-20 w-20 rounded-full bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-5xl">
        📘
      </div>

      <h2 className="mt-5 text-2xl font-black">No Report File Orders</h2>

      <p className="mt-2 text-sm font-bold text-slate-500">
        New student orders will appear here automatically.
      </p>
    </div>
  );
}

function getNotificationMessage(status) {
  const messages = {
    Pending: "Your report file order is pending.",
    Accepted: "Your report file order has been accepted.",
    Preparing: "Your report file is being prepared.",
    "Ready for Pickup":
      "Your report file is ready. Collect it from Gabbar PG between 10:00 AM - 8:00 PM.",
    Completed: "Your report file order has been completed.",
    Cancelled: "Your report file order has been cancelled.",
  };

  return messages[status] || "Your report file order status was updated.";
}

function formatDate(timestamp) {
  if (!timestamp?.seconds) return "Just now";

  return new Date(timestamp.seconds * 1000).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}