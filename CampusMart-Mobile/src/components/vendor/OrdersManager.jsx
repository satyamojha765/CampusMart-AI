import { useEffect, useMemo, useState } from "react";
import {
  getOrdersByVendor,
  updateOrder,
} from "../../features/vendor/services/orderService";

const FILTERS = ["All", "Pending", "Preparing", "Delivered", "Cancelled"];

export default function OrdersManager({ vendor }) {
  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  async function loadOrders() {
    if (!vendor?.id) return;

    try {
      setLoading(true);

      const list = await getOrdersByVendor(vendor.id);

      const sorted = [...list]
        .map((item) => ({
          ...item,
          sourceCollection: "orders",
        }))
        .sort((a, b) => getTimeMs(b.createdAt) - getTimeMs(a.createdAt));

      setOrders(sorted);
    } catch (error) {
      console.error("Failed to load orders:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [vendor?.id]);

  const filteredOrders = useMemo(() => {
    if (activeFilter === "All") return orders;

    return orders.filter((order) => {
      const status = getRawStatus(order);

      if (activeFilter === "Pending") return status === "pending";
      if (activeFilter === "Preparing") {
        return status === "preparing" || status === "confirmed";
      }
      if (activeFilter === "Delivered") return status === "delivered";
      if (activeFilter === "Cancelled") return status === "cancelled";

      return true;
    });
  }, [orders, activeFilter]);

  return (
    <div className="min-h-screen bg-white px-5 pb-24 pt-6">
      <header>
        <h1 className="text-[26px] font-black text-[#111111]">Orders</h1>
        <p className="mt-1 text-sm font-bold text-slate-500">
          Accept, prepare, deliver or decline orders.
        </p>
      </header>

      <section className="mt-7 flex gap-3 overflow-x-auto pb-1">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={`shrink-0 rounded-[14px] px-5 py-3 text-[14px] font-black ${
              activeFilter === filter
                ? "bg-orange-50 text-orange-600 border-b-2 border-orange-600"
                : "bg-white text-[#111111]"
            }`}
          >
            {filter}
          </button>
        ))}
      </section>

      <section className="mt-6 space-y-4">
        {loading ? (
          <div className="rounded-[22px] border border-[#f2f2f2] bg-white py-10 text-center text-sm font-black text-slate-500">
            Loading orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-[22px] border border-[#f2f2f2] bg-white py-12 text-center">
            <div className="text-5xl">📦</div>
            <h2 className="mt-3 text-xl font-black text-slate-900">
              No Orders
            </h2>
          </div>
        ) : (
          filteredOrders.map((order, index) => (
            <OrderCard
              key={order.id}
              order={order}
              index={index}
              onUpdated={loadOrders}
            />
          ))
        )}
      </section>
    </div>
  );
}

function OrderCard({ order, index, onUpdated }) {
  const status = getOrderStatus(order);
  const plan = getPlanLabel(order);
  const preference = getPreferenceLabel(order);
  const amount = Number(order.totalAmount || order.price || 0);
  const time = getDisplayTime(order.createdAt);
  const phone = order.customerPhone || order.phone || "No phone";
  const address = order.customerAddress || order.address || "No address";
  const rawStatus = getRawStatus(order);

  async function handleUpdate(data) {
    try {
      await updateOrder(order.id, data);
      onUpdated();
    } catch (error) {
      console.error("Failed to update order:", error);
      alert(error.message);
    }
  }

  return (
    <article className="rounded-[24px] border border-[#f1f1f1] bg-white p-4 shadow-sm">
      <div className="flex items-start gap-4">
        <Avatar index={index} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[17px] font-black text-[#111111]">
                {order.customerName || "Customer"}
              </h3>

              <p className="mt-1 text-[14px] font-bold text-slate-500">
                {plan} • {preference}
              </p>

              <p className="mt-1 text-[16px] font-black text-orange-600">
                ₹{amount}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[12px] font-bold text-slate-500">{time}</p>

              <span
                className={`mt-2 inline-flex rounded-[10px] px-3 py-2 text-[12px] font-black ${status.className}`}
              >
                {status.label}
              </span>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-orange-50 p-3">
            <p className="text-sm font-bold text-slate-700">📞 {phone}</p>
            <p className="mt-1 text-sm font-bold text-slate-700">
              📍 {address}
            </p>
          </div>

          {rawStatus === "cancelled" ? (
            <div className="mt-4 rounded-2xl bg-red-100 py-3 text-center text-sm font-black text-red-600">
              ❌ Order Declined
            </div>
          ) : rawStatus === "delivered" ? (
            <div className="mt-4 rounded-2xl bg-green-100 py-3 text-center text-sm font-black text-green-700">
              ✅ Order Delivered
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {rawStatus === "pending" && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdate({
                        paymentStatus: "paid",
                        orderStatus: "preparing",
                        deliveryStatus: "preparing",
                      })
                    }
                    className="rounded-2xl bg-green-600 py-3 text-sm font-black text-white"
                  >
                    Accept
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleUpdate({
                        orderStatus: "cancelled",
                        deliveryStatus: "cancelled",
                        paymentStatus: "cancelled",
                      })
                    }
                    className="rounded-2xl bg-red-600 py-3 text-sm font-black text-white"
                  >
                    Decline
                  </button>
                </>
              )}

              {(rawStatus === "preparing" || rawStatus === "confirmed") && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdate({
                        orderStatus: "delivered",
                        deliveryStatus: "delivered",
                      })
                    }
                    className="rounded-2xl bg-blue-600 py-3 text-sm font-black text-white"
                  >
                    Delivered
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleUpdate({
                        orderStatus: "cancelled",
                        deliveryStatus: "cancelled",
                        paymentStatus: "cancelled",
                      })
                    }
                    className="rounded-2xl bg-red-600 py-3 text-sm font-black text-white"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function Avatar({ index }) {
  const avatars = ["👨🏻", "👩🏻", "👨🏽", "👩🏻‍🦱"];

  return (
    <div className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-full bg-[#f1eee8] text-3xl">
      {avatars[index % avatars.length]}
    </div>
  );
}

function getPlanLabel(order) {
  const type =
    order.mealType || order.items?.[0]?.mealType || order.planName || "lunch";

  if (type === "lunch") return "Lunch Only";
  if (type === "dinner") return "Dinner Only";
  if (type === "lunch_dinner") return "Lunch + Dinner";

  return order.planName || "Monthly Plan";
}

function getPreferenceLabel(order) {
  const preference =
    order.mealPreference || order.items?.[0]?.mealPreference || "veg";

  return preference === "non-veg" ? "Non-Veg" : "Veg";
}

function getRawStatus(order) {
  return order.orderStatus || order.deliveryStatus || order.status || "pending";
}

function getOrderStatus(order) {
  const status = getRawStatus(order);

  if (status === "delivered") {
    return { label: "Delivered", className: "bg-green-100 text-green-700" };
  }

  if (status === "preparing" || status === "confirmed") {
    return { label: "Preparing", className: "bg-orange-100 text-orange-600" };
  }

  if (status === "cancelled") {
    return { label: "Declined", className: "bg-red-100 text-red-600" };
  }

  return { label: "Pending", className: "bg-yellow-100 text-orange-500" };
}

function getDisplayTime(value) {
  if (!value) return "--";

  const date = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getTimeMs(value) {
  if (!value) return 0;
  if (value?.seconds) return value.seconds * 1000;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}