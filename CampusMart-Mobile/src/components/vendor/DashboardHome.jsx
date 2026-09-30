import { useEffect, useMemo, useState } from "react";
import { getSubscriptionsByVendor } from "../../features/vendor/services/subscriptionService";
import { getOrdersByVendor } from "../../features/vendor/services/orderService";
import {
  getTodayDayId,
  getWeeklyMenu,
} from "../../features/vendor/services/menuService";
import { DEFAULT_WEEKLY_MENU } from "../../features/vendor/constants/menuConstants";

export default function DashboardHome({ vendor, setActiveTab }) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [weeklyMenu, setWeeklyMenu] = useState(DEFAULT_WEEKLY_MENU);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      if (!vendor?.id) return;

      try {
        setLoading(true);

        const [subs, ords, menu] = await Promise.all([
          getSubscriptionsByVendor(vendor.id),
          getOrdersByVendor(vendor.id),
          getWeeklyMenu(vendor.id),
        ]);

        if (!mounted) return;

        setSubscriptions(subs || []);
        setOrders(ords || []);
        setWeeklyMenu(menu || DEFAULT_WEEKLY_MENU);
      } catch (error) {
        console.error("Dashboard load failed:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [vendor?.id]);

  const todayMenu = useMemo(() => {
    const today = getTodayDayId();
    return weeklyMenu?.[today] || DEFAULT_WEEKLY_MENU[today];
  }, [weeklyMenu]);

  const activeSubscriptions = useMemo(() => {
    return subscriptions.filter(
      (item) => item.status !== "removed" && item.status !== "cancelled"
    );
  }, [subscriptions]);

  const activeUserIds = useMemo(() => {
    return new Set(activeSubscriptions.map((item) => item.userId));
  }, [activeSubscriptions]);

  const stats = useMemo(() => {
    const revenue = orders
      .filter((item) => item.paymentStatus === "paid")
      .reduce(
        (total, item) => total + Number(item.totalAmount || item.price || 0),
        0
      );

    return {
      revenue,
      orders: orders.length,
      subscribers: activeSubscriptions.length,
      pending: orders.filter((item) => getRawStatus(item) === "pending").length,
    };
  }, [orders, activeSubscriptions]);

  const recentOrders = useMemo(() => {
    return orders
      .filter((order) => activeUserIds.has(order.userId))
      .sort((a, b) => getTimeMs(b.createdAt) - getTimeMs(a.createdAt))
      .slice(0, 3);
  }, [orders, activeUserIds]);

  return (
    <div className="min-h-screen bg-white px-5 pb-24 pt-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-orange-600">Vendor Panel</p>
          <h1 className="mt-1 text-[26px] font-black tracking-tight text-[#111111]">
            {vendor?.businessName || "Maa'r Ranna"}
          </h1>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Homemade Tiffin Service
          </p>
        </div>

        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-50 text-3xl">
          🍱
        </div>
      </header>

      <section className="mt-7 rounded-[28px] bg-orange-600 p-5 text-white shadow-lg shadow-orange-600/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold opacity-90">Good Morning 👋</p>
            <h2 className="mt-1 text-3xl font-black">
              {vendor?.businessName || "Maa'r Ranna"}
            </h2>
            <p className="mt-1 text-sm font-bold opacity-90">
              {vendor?.area || "Asansol, West Bengal"}
            </p>
          </div>

          <span className="rounded-full bg-white/20 px-4 py-2 text-xs font-black">
            Open
          </span>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3">
        <StatCard title="Revenue" value={loading ? "..." : `₹${stats.revenue}`} icon="₹" />
        <StatCard title="Orders" value={loading ? "..." : stats.orders} icon="📦" />
        <StatCard title="Subscribers" value={loading ? "..." : stats.subscribers} icon="👥" />
        <StatCard title="Pending" value={loading ? "..." : stats.pending} icon="⏳" />
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-black">Today&apos;s Menu</h2>
          <button
            type="button"
            onClick={() => setActiveTab("menu")}
            className="text-sm font-black text-orange-600"
          >
            Edit
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <TodayMenuCard title="Lunch" icon="🍱" meal={todayMenu?.lunch} />
          <TodayMenuCard title="Dinner" icon="🌙" meal={todayMenu?.dinner} />
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-black">Recent Orders</h2>
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className="text-sm font-black text-orange-600"
          >
            View all
          </button>
        </div>

        <div className="overflow-hidden rounded-[22px] border border-[#f1f1f1] bg-white">
          {loading ? (
            <div className="py-8 text-center text-sm font-black text-slate-500">
              Loading orders...
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="py-8 text-center text-sm font-black text-slate-500">
              No orders yet
            </div>
          ) : (
            recentOrders.map((order, index) => (
              <OrderRow key={order.id || index} order={order} index={index} />
            ))
          )}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="mb-3 text-xl font-black">Quick Actions</h2>

        <div className="grid grid-cols-3 gap-3">
          <QuickAction icon="🍱" title="Menu" onClick={() => setActiveTab("menu")} />
          <QuickAction icon="📦" title="Orders" onClick={() => setActiveTab("orders")} />
          <QuickAction icon="👥" title="Subscribers" onClick={() => setActiveTab("subscribers")} />
          <QuickAction icon="⚙️" title="Settings" onClick={() => setActiveTab("settings")} />
          <QuickAction icon="💬" title="WhatsApp" onClick={() => window.open("https://wa.me/", "_blank")} />
          <QuickAction icon="➕" title="Add Menu" onClick={() => setActiveTab("menu")} />
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="rounded-[22px] border border-orange-100 bg-white p-4 shadow-sm">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-50 text-2xl">
        {icon}
      </div>
      <p className="mt-3 text-xs font-black text-slate-500">{title}</p>
      <h3 className="mt-1 text-3xl font-black text-[#111111]">{value}</h3>
    </div>
  );
}

function TodayMenuCard({ title, icon, meal }) {
  const items = meal?.items || [];
  const available = meal?.available !== false;

  return (
    <div className="rounded-[24px] border border-orange-100 bg-orange-50 p-4">
      <div className="flex items-center justify-between">
        <div className="text-3xl">{icon}</div>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-black ${
            available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}
        >
          {available ? "ON" : "OFF"}
        </span>
      </div>

      <h3 className="mt-3 text-lg font-black">{title}</h3>

      <div className="mt-3 min-h-[72px] text-sm font-bold text-slate-700">
        {items.length > 0 ? (
          items.slice(0, 4).map((item, index) => <p key={index}>• {item}</p>)
        ) : (
          <p>Menu not added</p>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-white px-3 py-2 text-center text-lg font-black text-orange-600">
        ₹{meal?.price || 0}
      </div>
    </div>
  );
}

function OrderRow({ order, index }) {
  const status = getOrderStatus(order);

  return (
    <div className="flex items-center gap-3 border-b border-[#f1f1f1] px-4 py-4 last:border-b-0">
      <Avatar index={index} />

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-black text-[#111111]">
          {order.customerName || "Customer"}
        </h3>
        <p className="mt-1 truncate text-xs font-bold text-slate-500">
          {getPlanLabel(order)} • {getPreferenceLabel(order)}
        </p>
      </div>

      <span className={`rounded-[10px] px-3 py-2 text-[11px] font-black ${status.className}`}>
        {status.label}
      </span>
    </div>
  );
}

function QuickAction({ icon, title, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[20px] border border-slate-100 bg-white p-4 text-center shadow-sm active:scale-95"
    >
      <div className="text-3xl">{icon}</div>
      <p className="mt-2 text-[11px] font-black">{title}</p>
    </button>
  );
}

function Avatar({ index }) {
  const avatars = ["👨🏻", "👩🏻", "👨🏽", "👩🏻‍🦱"];

  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f1eee8] text-2xl">
      {avatars[index % avatars.length]}
    </div>
  );
}

function getPlanLabel(order) {
  const type = order.mealType || order.items?.[0]?.mealType || order.planName || "lunch";

  if (type === "lunch") return "Lunch Only";
  if (type === "dinner") return "Dinner Only";
  if (type === "lunch_dinner") return "Lunch + Dinner";

  return order.planName || "Monthly Plan";
}

function getPreferenceLabel(order) {
  const preference = order.mealPreference || order.items?.[0]?.mealPreference || "veg";
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
    return { label: "Cancelled", className: "bg-red-100 text-red-600" };
  }

  return { label: "Pending", className: "bg-yellow-100 text-orange-500" };
}

function getTimeMs(value) {
  if (!value) return 0;
  if (value?.seconds) return value.seconds * 1000;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}