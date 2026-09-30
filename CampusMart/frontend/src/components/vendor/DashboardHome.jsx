import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getSubscriptionsByVendor,
} from "../../features/vendor/services/subscriptionService";

import {
  getOrdersByVendor,
} from "../../features/vendor/services/orderService";

import {
  getTodayDayId,
  getWeeklyMenu,
} from "../../features/vendor/services/menuService";

import {
  DEFAULT_WEEKLY_MENU,
} from "../../features/vendor/constants/menuConstants";

export default function DashboardHome({
  vendor,
  setActiveTab,
}) {
  const [loading, setLoading] =
    useState(true);

  const [orders, setOrders] =
    useState([]);

  const [
    subscriptions,
    setSubscriptions,
  ] = useState([]);

  const [
    weeklyMenu,
    setWeeklyMenu,
  ] = useState(
    DEFAULT_WEEKLY_MENU
  );

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      if (!vendor?.id) {
        if (mounted) {
          setLoading(false);
        }

        return;
      }

      try {
        setLoading(true);

        const [
          subs,
          ords,
          menu,
        ] = await Promise.all([
          getSubscriptionsByVendor(
            vendor.id
          ),

          getOrdersByVendor(
            vendor.id
          ),

          getWeeklyMenu(
            vendor.id
          ),
        ]);

        if (!mounted) {
          return;
        }

        setSubscriptions(
          subs || []
        );

        setOrders(
          ords || []
        );

        setWeeklyMenu(
          menu ||
            DEFAULT_WEEKLY_MENU
        );
      } catch (error) {
        console.error(
          "Dashboard load failed:",
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [vendor?.id]);

  const todayMenu =
    useMemo(() => {
      const today =
        getTodayDayId();

      return (
        weeklyMenu?.[today] ||
        DEFAULT_WEEKLY_MENU[
          today
        ]
      );
    }, [weeklyMenu]);

  const activeSubscriptions =
    useMemo(() => {
      return subscriptions.filter(
        (item) =>
          item.status !==
            "removed" &&
          item.status !==
            "cancelled"
      );
    }, [subscriptions]);

  const activeUserIds =
    useMemo(() => {
      return new Set(
        activeSubscriptions.map(
          (item) =>
            item.userId
        )
      );
    }, [
      activeSubscriptions,
    ]);

  const stats =
    useMemo(() => {
      const countedSubscriptionIds =
        new Set();

      const paidMonthlySubscriptionsRevenue =
        activeSubscriptions
          .filter(
            (subscription) =>
              getPaymentStatus(
                subscription
              ) === "paid"
          )
          .reduce(
            (
              total,
              subscription
            ) => {
              const subscriptionId =
                String(
                  subscription?.id ||
                    ""
                ).trim();

              if (subscriptionId) {
                countedSubscriptionIds.add(
                  subscriptionId
                );
              }

              return (
                total +
                getMonthlyRevenueAmount(
                  subscription,
                  vendor
                )
              );
            },
            0
          );

      const paidMonthlyOrdersRevenue =
        orders
          .filter(
            (order) =>
              getOrderCategory(
                order
              ) === "monthly" &&
              getPaymentStatus(
                order
              ) === "paid"
          )
          .filter(
            (order) => {
              const subscriptionId =
                String(
                  order?.subscriptionId ||
                    ""
                ).trim();

              return (
                !subscriptionId ||
                !countedSubscriptionIds.has(
                  subscriptionId
                )
              );
            }
          )
          .reduce(
            (
              total,
              order
            ) =>
              total +
              getOrderRevenueAmount(
                order,
                vendor
              ),
            0
          );

      const paidFoodOrdersRevenue =
        orders
          .filter(
            (order) =>
              isCollectedFoodOrder(
                order
              )
          )
          .reduce(
            (
              total,
              order
            ) =>
              total +
              getOrderRevenueAmount(
                order,
                vendor
              ),
            0
          );

      const monthlyRevenue =
        paidMonthlySubscriptionsRevenue +
        paidMonthlyOrdersRevenue;

      const revenue =
        paidFoodOrdersRevenue +
        monthlyRevenue;

      return {
        revenue,

        monthlyRevenue,

        foodRevenue:
          paidFoodOrdersRevenue,

        orders:
          orders.length,

        subscribers:
          activeSubscriptions.length,

        pending:
          orders.filter(
            (item) =>
              getRawStatus(
                item
              ) === "pending"
          ).length,
      };
    }, [
      orders,
      activeSubscriptions,
      vendor,
    ]);

  const recentOrders =
    useMemo(() => {
      return orders
        .filter(
          (order) =>
            activeUserIds.has(
              order.userId
            )
        )
        .sort(
          (a, b) =>
            getTimeMs(
              b.createdAt
            ) -
            getTimeMs(
              a.createdAt
            )
        )
        .slice(0, 3);
    }, [
      orders,
      activeUserIds,
    ]);

  const vendorName =
    vendor?.businessName ||
    vendor?.name ||
    "Tiffin Vendor";

  const vendorArea =
    vendor?.area ||
    vendor?.city ||
    "Asansol, West Bengal";

  const vendorOpen =
    vendor?.active !== false &&
    vendor?.isOpen !== false;

  const todaySummary =
    useMemo(() => {
      const todayOrders =
        orders.filter(isOrderForToday);

      return {
        orders: todayOrders.length,

        delivered:
          todayOrders.filter(
            (order) =>
              getRawStatus(order) ===
              "delivered"
          ).length,

        inProgress:
          todayOrders.filter(
            (order) =>
              [
                "pending",
                "accepted",
                "confirmed",
                "preparing",
              ].includes(
                getRawStatus(order)
              )
          ).length,
      };
    }, [orders]);

  const greeting = getGreeting();

  const todayLabel =
    formatDashboardDate(new Date());

  const vendorLogo =
    vendor?.logoUrl ||
    vendor?.imageUrl ||
    vendor?.bannerUrl ||
    "";

  return (
    <div className="min-h-screen bg-[#f7f4ef] px-4 pb-28 pt-4 text-slate-950">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm">
            {vendorLogo ? (
              <img
                src={vendorLogo}
                alt={vendorName}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-2xl">
                🍱
              </span>
            )}
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
              Vendor app
            </p>

            <h1 className="truncate text-xl font-black tracking-tight">
              {vendorName}
            </h1>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-black ${
            vendorOpen
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <span
            className={`mr-1.5 inline-block h-2 w-2 rounded-full ${
              vendorOpen
                ? "bg-green-500"
                : "bg-red-500"
            }`}
          />

          {vendorOpen ? "Open" : "Closed"}
        </span>
      </header>

      <section className="relative mt-4 overflow-hidden rounded-[30px] bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 p-5 text-white shadow-xl shadow-orange-600/20">
        <div className="absolute -right-10 -top-14 h-36 w-36 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-black/5" />

        <div className="relative">
          <p className="text-sm font-bold text-orange-50">
            {greeting} 👋
          </p>

          <h2 className="mt-1 max-w-[280px] text-[29px] font-black leading-tight tracking-tight">
            Manage today&apos;s tiffin service
          </h2>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-orange-50">
            <span>📍 {vendorArea}</span>
            <span>•</span>
            <span>{todayLabel}</span>
          </div>

          <div className="mt-5 grid grid-cols-3 divide-x divide-white/20 rounded-[22px] border border-white/15 bg-white/10 py-3 backdrop-blur">
            <TodayMetric
              label="Orders"
              value={
                loading
                  ? "..."
                  : todaySummary.orders
              }
            />

            <TodayMetric
              label="In progress"
              value={
                loading
                  ? "..."
                  : todaySummary.inProgress
              }
            />

            <TodayMetric
              label="Delivered"
              value={
                loading
                  ? "..."
                  : todaySummary.delivered
              }
            />
          </div>
        </div>
      </section>

      {!vendorOpen && (
        <div className="mt-4 flex items-start gap-3 rounded-[22px] border border-red-200 bg-red-50 p-4">
          <span className="text-2xl">
            🔒
          </span>

          <div>
            <p className="font-black text-red-800">
              Store is currently closed
            </p>

            <p className="mt-1 text-xs font-semibold leading-5 text-red-700">
              Settings se vendor status open karke
              naye orders receive kar sakte ho.
            </p>
          </div>
        </div>
      )}

      <section className="mt-5">
        <SectionHeading
          eyebrow="Business overview"
          title="Performance"
        />

        <RevenueCard
          loading={loading}
          totalRevenue={stats.revenue}
          individualRevenue={
            stats.foodRevenue
          }
          monthlyRevenue={
            stats.monthlyRevenue
          }
        />

        <div className="mt-3 grid grid-cols-3 gap-2.5">
          <CompactStatCard
            title="Orders"
            value={
              loading ? "..." : stats.orders
            }
            icon="📦"
            onClick={() =>
              setActiveTab("orders")
            }
          />

          <CompactStatCard
            title="Subscribers"
            value={
              loading
                ? "..."
                : stats.subscribers
            }
            icon="👥"
            onClick={() =>
              setActiveTab("subscribers")
            }
          />

          <CompactStatCard
            title="Pending"
            value={
              loading ? "..." : stats.pending
            }
            icon="⏳"
            onClick={() =>
              setActiveTab("orders")
            }
          />
        </div>
      </section>

      <section className="mt-7">
        <SectionHeading
          eyebrow="Daily operations"
          title="Quick actions"
        />

        <div className="grid grid-cols-3 gap-3">
          <QuickAction
            icon="📦"
            title="Orders"
            subtitle="Manage"
            onClick={() =>
              setActiveTab("orders")
            }
          />

          <QuickAction
            icon="🚚"
            title="Delivery"
            subtitle="Today"
            onClick={() =>
              setActiveTab("delivery")
            }
          />

          <QuickAction
            icon="🍱"
            title="Menu"
            subtitle="Update"
            onClick={() =>
              setActiveTab("menu")
            }
          />

          <QuickAction
            icon="👥"
            title="Subscribers"
            subtitle="Customers"
            onClick={() =>
              setActiveTab("subscribers")
            }
          />

          <QuickAction
            icon="⚙️"
            title="Settings"
            subtitle="Business"
            onClick={() =>
              setActiveTab("settings")
            }
          />

          <QuickAction
            icon="💬"
            title="WhatsApp"
            subtitle="Open chat"
            onClick={() =>
              openVendorWhatsApp(vendor)
            }
          />
        </div>
      </section>

      <section className="mt-7">
        <SectionHeading
          eyebrow="Food schedule"
          title="Today&apos;s menu"
          actionLabel="Edit menu"
          onAction={() =>
            setActiveTab("menu")
          }
        />

        <div className="grid grid-cols-2 gap-3">
          <TodayMenuCard
            title="Lunch"
            icon="☀️"
            meal={todayMenu?.lunch}
          />

          <TodayMenuCard
            title="Dinner"
            icon="🌙"
            meal={todayMenu?.dinner}
          />
        </div>
      </section>

      <section className="mt-7">
        <SectionHeading
          eyebrow="Latest activity"
          title="Recent orders"
          actionLabel="View all"
          onAction={() =>
            setActiveTab("orders")
          }
        />

        <div className="overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-sm">
          {loading ? (
            <RecentOrdersSkeleton />
          ) : recentOrders.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="text-5xl">
                📭
              </div>

              <h3 className="mt-3 font-black">
                No recent orders
              </h3>

              <p className="mt-1 text-xs font-semibold text-slate-500">
                New orders yahan automatically
                dikhengi.
              </p>
            </div>
          ) : (
            recentOrders.map(
              (order, index) => (
                <OrderRow
                  key={order.id || index}
                  order={order}
                  index={index}
                  vendor={vendor}
                />
              )
            )
          )}
        </div>
      </section>
    </div>
  );
}

function TodayMetric({
  label,
  value,
}) {
  return (
    <div className="px-2 text-center">
      <p className="text-[10px] font-black uppercase tracking-wide text-orange-100">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black">
        {value}
      </p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  actionLabel,
  onAction,
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.17em] text-orange-600">
          {eyebrow}
        </p>

        <h2 className="mt-1 text-xl font-black tracking-tight">
          {title}
        </h2>
      </div>

      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded-xl bg-orange-50 px-3 py-2 text-xs font-black text-orange-600 transition active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function RevenueCard({
  loading,
  totalRevenue,
  individualRevenue,
  monthlyRevenue,
}) {
  const [expanded, setExpanded] =
    useState(false);

  return (
    <article className="overflow-hidden rounded-[26px] border border-orange-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() =>
          setExpanded(
            (current) => !current
          )
        }
        className="w-full p-5 text-left transition active:bg-orange-50/60"
        aria-expanded={expanded}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-100 text-2xl font-black text-orange-600">
              ₹
            </div>

            <div className="min-w-0">
              <p className="text-xs font-black text-slate-500">
                Total collected revenue
              </p>

              <h3 className="mt-1 break-words text-3xl font-black tracking-tight">
                {loading
                  ? "..."
                  : formatRevenue(
                      totalRevenue
                    )}
              </h3>
            </div>
          </div>

          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-orange-50 text-xl font-black text-orange-600 transition-transform ${
              expanded
                ? "rotate-90"
                : ""
            }`}
            aria-hidden="true"
          >
            ›
          </span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-orange-100">
          <div className="h-full w-3/4 rounded-full bg-orange-500" />
        </div>

        <p className="mt-2 text-[10px] font-bold text-slate-400">
          Tap to view revenue breakdown
        </p>
      </button>

      <div
        className={`grid transition-all duration-300 ${
          expanded
            ? "grid-rows-[1fr] border-t border-orange-100"
            : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="grid grid-cols-2 gap-3 bg-orange-50/60 p-4">
            <RevenueBreakdownCard
              icon="🍽️"
              label="Individual orders"
              value={
                loading
                  ? "..."
                  : formatRevenue(
                      individualRevenue
                    )
              }
            />

            <RevenueBreakdownCard
              icon="📅"
              label="Monthly plans"
              value={
                loading
                  ? "..."
                  : formatRevenue(
                      monthlyRevenue
                    )
              }
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function RevenueBreakdownCard({
  icon,
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white p-3">
      <span className="text-xl">
        {icon}
      </span>

      <p className="mt-2 text-[10px] font-black text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-base font-black text-orange-600">
        {value}
      </p>
    </div>
  );
}

function CompactStatCard({
  title,
  value,
  icon,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-0 rounded-[22px] border border-orange-100 bg-white p-3 text-left shadow-sm transition active:scale-95"
    >
      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-orange-50 text-xl">
        {icon}
      </div>

      <p className="mt-3 truncate text-[10px] font-black text-slate-500">
        {title}
      </p>

      <p className="mt-0.5 text-2xl font-black">
        {value}
      </p>
    </button>
  );
}

function TodayMenuCard({
  title,
  icon,
  meal,
}) {
  const items =
    Array.isArray(meal?.items)
      ? meal.items
      : [];

  const available =
    meal?.available !== false;

  return (
    <article className="overflow-hidden rounded-[24px] border border-orange-100 bg-white shadow-sm">
      <div className="flex items-center justify-between bg-orange-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">
            {icon}
          </span>

          <h3 className="font-black">
            {title}
          </h3>
        </div>

        <span
          className={`rounded-full px-2 py-1 text-[9px] font-black ${
            available
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {available ? "ON" : "OFF"}
        </span>
      </div>

      <div className="p-4">
        <div className="min-h-[82px] space-y-1.5 text-xs font-bold leading-5 text-slate-600">
          {items.length > 0 ? (
            items
              .slice(0, 4)
              .map((item, index) => (
                <p
                  key={`${item}-${index}`}
                  className="line-clamp-1"
                >
                  <span className="mr-1 text-orange-500">
                    •
                  </span>
                  {item}
                </p>
              ))
          ) : (
            <div className="flex min-h-[82px] items-center justify-center text-center text-slate-400">
              Menu not added
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-orange-100 pt-3">
          <span className="text-[10px] font-black text-slate-400">
            Per meal
          </span>

          <span className="text-lg font-black text-orange-600">
            {formatPrice(meal?.price)}
          </span>
        </div>
      </div>
    </article>
  );
}

function OrderRow({
  order,
  index,
  vendor,
}) {
  const status =
    getOrderStatus(order);

  const amount =
    getOrderRevenueAmount(
      order,
      vendor
    );

  return (
    <article className="flex items-center gap-3 border-b border-orange-50 px-4 py-4 last:border-b-0">
      <Avatar index={index} />

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-black">
          {order.customerName ||
            order.userName ||
            "Customer"}
        </h3>

        <p className="mt-1 truncate text-[11px] font-bold text-slate-500">
          {getPlanLabel(order)}
          {" • "}
          {getPreferenceLabel(order)}
        </p>

        {amount > 0 && (
          <p className="mt-1 text-xs font-black text-orange-600">
            {formatRevenue(amount)}
          </p>
        )}
      </div>

      <span
        className={`shrink-0 rounded-xl px-2.5 py-2 text-[10px] font-black ${status.className}`}
      >
        {status.label}
      </span>
    </article>
  );
}

function QuickAction({
  icon,
  title,
  subtitle,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-0 rounded-[22px] border border-orange-100 bg-white p-3 text-left shadow-sm transition active:scale-95"
    >
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-50 text-2xl">
        {icon}
      </div>

      <p className="mt-3 truncate text-xs font-black">
        {title}
      </p>

      <p className="mt-0.5 truncate text-[9px] font-bold text-slate-400">
        {subtitle}
      </p>
    </button>
  );
}

function Avatar({
  index,
}) {
  const avatars = [
    "👨🏻",
    "👩🏻",
    "👨🏽",
    "👩🏻‍🦱",
  ];

  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-orange-50 text-2xl">
      {
        avatars[
          index % avatars.length
        ]
      }
    </div>
  );
}

function RecentOrdersSkeleton() {
  return (
    <div className="divide-y divide-orange-50">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="flex items-center gap-3 px-4 py-4"
        >
          <div className="h-11 w-11 animate-pulse rounded-full bg-slate-100" />

          <div className="flex-1">
            <div className="h-3 w-28 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-2 h-2.5 w-40 animate-pulse rounded-full bg-slate-100" />
          </div>

          <div className="h-8 w-16 animate-pulse rounded-xl bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function openVendorWhatsApp(vendor) {
  const phone =
    vendor?.whatsapp ||
    vendor?.phone ||
    "";

  if (!phone) {
    alert(
      "WhatsApp number abhi add nahi hai."
    );

    return;
  }

  const cleanNumber =
    String(phone).replace(/\D/g, "");

  const numberWithCountryCode =
    cleanNumber.startsWith("91")
      ? cleanNumber
      : `91${cleanNumber}`;

  window.open(
    `https://wa.me/${numberWithCountryCode}`,
    "_blank",
    "noopener,noreferrer"
  );
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

function formatDashboardDate(date) {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
    }
  ).format(date);
}

function isOrderForToday(order) {
  const value =
    order?.deliveryDate ||
    order?.scheduledDate ||
    order?.orderDate ||
    order?.createdAt;

  const date = toDateValue(value);

  if (!date) {
    return false;
  }

  const today = new Date();

  return (
    date.getFullYear() ===
      today.getFullYear() &&
    date.getMonth() ===
      today.getMonth() &&
    date.getDate() ===
      today.getDate()
  );
}

function toDateValue(value) {
  if (!value) {
    return null;
  }

  if (
    typeof value?.toDate ===
    "function"
  ) {
    return value.toDate();
  }

  if (value?.seconds) {
    return new Date(
      value.seconds * 1000
    );
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function formatRevenue(value) {
  return `₹${toMoneyNumber(
    value
  ).toLocaleString("en-IN")}`;
}

function getPlanLabel(
  order
) {
  const type =
    order.mealType ||
    order.items?.[0]
      ?.mealType ||
    order.planType ||
    order.planName ||
    "lunch";

  if (type === "lunch") {
    return "Lunch Only";
  }

  if (type === "dinner") {
    return "Dinner Only";
  }

  if (
    type ===
      "lunch_dinner" ||
    type ===
      "lunch-dinner" ||
    type === "both"
  ) {
    return "Lunch + Dinner";
  }

  return (
    order.planName ||
    "Monthly Plan"
  );
}

function getPreferenceLabel(
  order
) {
  const preference =
    order.mealPreference ||
    order.items?.[0]
      ?.mealPreference ||
    order.foodType ||
    "veg";

  const normalizedPreference =
    String(preference)
      .trim()
      .toLowerCase();

  return normalizedPreference ===
      "non-veg" ||
    normalizedPreference ===
      "nonveg"
    ? "Non-Veg"
    : "Veg";
}

function getOrderCategory(
  order
) {
  if (
    String(
      order?.subscriptionId ||
        ""
    ).trim()
  ) {
    return "monthly";
  }

  const orderType =
    String(
      order?.orderType ||
        order?.type ||
        ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /[\s-]+/g,
        "_"
      );

  if (
    [
      "monthly",
      "monthly_subscription",
      "subscription",
      "tiffin_subscription",
    ].includes(
      orderType
    )
  ) {
    return "monthly";
  }

  if (
    [
      "one_time",
      "individual",
      "individual_items",
      "food_order",
      "one_time_food",
    ].includes(
      orderType
    )
  ) {
    return "individual";
  }

  if (
    Array.isArray(
      order?.items
    ) &&
    order.items.some(
      (item) =>
        item?.name ||
        item?.title ||
        item?.quantity
    )
  ) {
    return "individual";
  }

  return "unknown";
}

function isCollectedFoodOrder(
  order
) {
  if (
    getOrderCategory(
      order
    ) !==
    "individual"
  ) {
    return false;
  }

  /*
   * New deliveries paymentStatus=paid save hongi.
   * Purane delivered food orders mein paymentStatus pending
   * reh gaya ho toh bhi revenue mein count honge.
   */
  return (
    getPaymentStatus(
      order
    ) ===
      "paid" ||
    getRawStatus(
      order
    ) ===
      "delivered"
  );
}

function getPaymentStatus(
  item
) {
  return String(
    item?.paymentStatus ||
      "pending"
  )
    .trim()
    .toLowerCase();
}

function getOrderRevenueAmount(
  order,
  vendor
) {
  const directAmount =
    toMoneyNumber(
      order?.totalAmount ??
        order?.price ??
        order?.amount
    );

  if (directAmount > 0) {
    return directAmount;
  }

  if (
    getOrderCategory(
      order
    ) === "monthly"
  ) {
    return toMoneyNumber(
      order?.monthlyPrice ??
        vendor?.monthlyPrice
    );
  }

  return 0;
}

function getMonthlyRevenueAmount(
  subscription,
  vendor
) {
  return toMoneyNumber(
    subscription?.totalAmount ??
      subscription?.price ??
      subscription?.amount ??
      subscription?.monthlyPrice ??
      vendor?.monthlyPrice
  );
}

function toMoneyNumber(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return 0;
  }

  const amount =
    Number(
      String(value)
        .replace(
          /₹/g,
          ""
        )
        .replace(
          /,/g,
          ""
        )
        .trim()
    );

  return Number.isNaN(
    amount
  )
    ? 0
    : amount;
}

function getRawStatus(
  order
) {
  return String(
    order.orderStatus ||
      order.deliveryStatus ||
      order.status ||
      "pending"
  )
    .trim()
    .toLowerCase();
}

function getOrderStatus(
  order
) {
  const status =
    getRawStatus(
      order
    );

  if (
    status ===
    "delivered"
  ) {
    return {
      label:
        "Delivered",

      className:
        "bg-green-100 text-green-700",
    };
  }

  if (
    status ===
      "preparing" ||
    status ===
      "confirmed" ||
    status ===
      "accepted"
  ) {
    return {
      label:
        "Preparing",

      className:
        "bg-orange-100 text-orange-600",
    };
  }

  if (
    status ===
      "cancelled" ||
    status ===
      "removed" ||
    status ===
      "rejected"
  ) {
    return {
      label:
        "Cancelled",

      className:
        "bg-red-100 text-red-600",
    };
  }

  return {
    label:
      "Pending",

    className:
      "bg-yellow-100 text-orange-500",
  };
}

function formatPrice(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "₹0";
  }

  const amount = Number(
    String(value)
      .replace(/₹/g, "")
      .replace(/,/g, "")
      .trim()
  );

  if (
    Number.isNaN(amount)
  ) {
    return `₹${value}`;
  }

  return `₹${amount.toLocaleString(
    "en-IN"
  )}`;
}

function getTimeMs(
  value
) {
  if (!value) {
    return 0;
  }

  if (
    value?.seconds
  ) {
    return (
      value.seconds *
      1000
    );
  }

  if (
    typeof value?.toDate ===
    "function"
  ) {
    return value
      .toDate()
      .getTime();
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? 0
    : date.getTime();
}