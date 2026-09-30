import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { db } from "../../firebase";
import { getOrdersByVendor } from "../../features/vendor/services/orderService";

const TABS = [
  { id: "individual", label: "Food Orders", icon: "🍽️" },
  { id: "monthly", label: "Monthly Plans", icon: "📅" },
];

export default function OrdersManager({ vendor }) {
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("individual");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadOrders = useCallback(
    async ({ silent = false } = {}) => {
      if (!vendor?.id) {
        setOrders([]);
        setLoading(false);
        setError("Vendor ID nahi mila.");
        return;
      }

      try {
        silent ? setRefreshing(true) : setLoading(true);
        setError("");
        setSuccessMessage("");

        const list = await getOrdersByVendor(vendor.id);

        const pending = (Array.isArray(list) ? list : [])
          .filter((order) => getRawStatus(order) === "pending")
          .filter((order) =>
            ["individual", "monthly"].includes(getOrderCategory(order))
          )
          .sort(
            (a, b) =>
              getTimeMs(b.createdAt) - getTimeMs(a.createdAt)
          );

        setOrders(pending);
      } catch (loadError) {
        console.error("Orders load failed:", loadError);
        setError(loadError?.message || "Orders load nahi hue.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [vendor?.id]
  );

  useEffect(() => {
    setActiveTab("individual");
    setSearchText("");
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!successMessage) return undefined;

    const timer = window.setTimeout(
      () => setSuccessMessage(""),
      3000
    );

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const individualOrders = useMemo(
    () =>
      orders.filter(
        (order) => getOrderCategory(order) === "individual"
      ),
    [orders]
  );

  const monthlyOrders = useMemo(
    () =>
      orders.filter(
        (order) => getOrderCategory(order) === "monthly"
      ),
    [orders]
  );

  const tabOrders =
    activeTab === "monthly" ? monthlyOrders : individualOrders;

  const filteredOrders = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return tabOrders;

    return tabOrders.filter((order) => {
      const itemNames = getIndividualItems(order)
        .map((item) => item.name)
        .join(" ");

      return [
        order.id,
        order.subscriptionId,
        getCustomerName(order),
        getCustomerPhone(order),
        getCustomerAddress(order),
        getPlanLabel(order),
        getPreferenceLabel(order),
        itemNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [tabOrders, searchText]);

  const todayCount = useMemo(
    () => orders.filter((order) => isToday(order.createdAt)).length,
    [orders]
  );

  async function handleDecision(order, decision) {
    if (!order?.id || updatingOrderId) return;

    const category = getOrderCategory(order);
    const monthly = category === "monthly";
    const accepting = decision === "accept";

    if (monthly && !String(order?.subscriptionId || "").trim()) {
      setError("Monthly order ke saath subscription ID linked nahi hai.");
      return;
    }

    const confirmed = window.confirm(
      monthly
        ? accepting
          ? "Is monthly subscription ko accept karna hai?"
          : "Is monthly subscription ko decline karna hai?"
        : accepting
        ? "Is food order ko accept karke Delivery mein bhejna hai?"
        : "Is food order ko decline karna hai?"
    );

    if (!confirmed) return;

    try {
      setUpdatingOrderId(order.id);
      setError("");
      setSuccessMessage("");

      const batch = writeBatch(db);
      const orderRef = doc(db, "orders", order.id);

      if (monthly) {
        const subscriptionRef = doc(
          db,
          "subscriptions",
          String(order.subscriptionId)
        );

        if (accepting) {
          batch.update(orderRef, {
            orderStatus: "accepted",
            deliveryStatus: "pending",
            acceptedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          batch.update(subscriptionRef, {
            status: "active",
            deliveryStatus: "pending",
            removedAt: null,
            removedBy: "",
            updatedAt: serverTimestamp(),
          });
        } else {
          batch.update(orderRef, {
            orderStatus: "declined",
            deliveryStatus: "cancelled",
            cancelledAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          batch.update(subscriptionRef, {
            status: "cancelled",
            deliveryStatus: "cancelled",
            updatedAt: serverTimestamp(),
          });
        }
      } else if (accepting) {
        const deliveryRef = doc(collection(db, "deliveries"));

        batch.update(orderRef, {
          orderStatus: "accepted",
          deliveryStatus: "pending",
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.set(deliveryRef, {
          orderId: order.id,
          orderType: "one_time",
          vendorId: order.vendorId || vendor.id,
          userId: order.userId || "",
          customerName: getCustomerName(order),
          customerPhone: getCustomerPhone(order),
          customerAddress: getCustomerAddress(order),
          items: getIndividualItems(order),
          totalItems: getTotalItemCount(order),
          totalAmount: getOrderAmount(order),
          paymentMethod: order.paymentMethod || "cod",
          paymentStatus: getPaymentStatus(order),
          deliverySlot: getOrderMealSlot(order),
          status: "pending",
          deliveryStatus: "pending",
          notes: String(order.notes || "").trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.update(orderRef, {
          orderStatus: "declined",
          deliveryStatus: "cancelled",
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      setOrders((current) =>
        current.filter((item) => item.id !== order.id)
      );

      const name = getCustomerName(order);

      setSuccessMessage(
        monthly
          ? accepting
            ? `${name} subscriber mein add ho gaya.`
            : `${name} ka monthly request decline ho gaya.`
          : accepting
          ? `${name} ka food order Delivery ke liye accepted hai.`
          : `${name} ka food order decline ho gaya.`
      );
    } catch (decisionError) {
      console.error("Order decision failed:", decisionError);
      setError(decisionError?.message || "Order update nahi hua.");
    } finally {
      setUpdatingOrderId("");
    }
  }

  const vendorName =
    vendor?.businessName || vendor?.name || "Tiffin Vendor";

  return (
    <div className="min-h-screen bg-[#fffaf5] px-4 pb-28 pt-5 text-slate-950">
      <header className="rounded-[26px] border border-orange-100 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-black uppercase tracking-[0.18em] text-orange-600">
              {vendorName}
            </p>

            <h1 className="mt-1 text-[26px] font-black tracking-tight">
              Orders
            </h1>

            <p className="mt-1 text-sm font-bold text-slate-500">
              Food orders aur monthly requests manage karo.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadOrders({ silent: true })}
            disabled={refreshing || loading}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-orange-50 text-xl transition active:scale-95 disabled:opacity-60"
            aria-label="Refresh orders"
          >
            {refreshing ? "⏳" : "↻"}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <SummaryCard value={orders.length} label="Pending" icon="📥" />
          <SummaryCard
            value={individualOrders.length}
            label="Food"
            icon="🍽️"
          />
          <SummaryCard
            value={monthlyOrders.length}
            label="Monthly"
            icon="📅"
          />
        </div>

        <p className="mt-3 text-center text-[10px] font-black uppercase tracking-wide text-slate-400">
          {todayCount} pending order{todayCount === 1 ? "" : "s"} today
        </p>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-2 rounded-[20px] border border-orange-100 bg-white p-1.5 shadow-sm">
        {TABS.map((tab) => {
          const selected = activeTab === tab.id;
          const count =
            tab.id === "monthly"
              ? monthlyOrders.length
              : individualOrders.length;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSearchText("");
              }}
              className={`rounded-[15px] px-3 py-3 text-xs font-black transition ${
                selected
                  ? "bg-orange-600 text-white shadow"
                  : "bg-orange-50/50 text-slate-600"
              }`}
            >
              {tab.icon} {tab.label}
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[9px] ${
                  selected
                    ? "bg-white/20 text-white"
                    : "bg-white text-orange-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </section>

      <section className="mt-4">
        <label className="relative block">
          <span className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center text-xl">
            🔍
          </span>

          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={
              activeTab === "monthly"
                ? "Name, phone, address ya plan"
                : "Name, phone, address ya food item"
            }
            className="h-14 w-full rounded-[20px] border border-orange-100 bg-white pl-12 pr-12 text-sm font-bold outline-none placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          />

          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText("")}
              className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-slate-100 text-sm font-black text-slate-600"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </label>
      </section>

      {error && (
        <div className="mt-4 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          ⚠️ {error}
        </div>
      )}

      {successMessage && (
        <div className="mt-4 rounded-[20px] border border-green-200 bg-green-50 px-4 py-3 text-sm font-black text-green-700">
          ✅ {successMessage}
        </div>
      )}

      <section className="mt-4 space-y-4">
        {loading ? (
          <OrdersSkeleton />
        ) : filteredOrders.length === 0 ? (
          <EmptyOrders searchText={searchText} activeTab={activeTab} />
        ) : (
          filteredOrders.map((order, index) =>
            activeTab === "monthly" ? (
              <SubscriptionOrderCard
                key={order.id}
                order={order}
                index={index}
                updating={updatingOrderId === order.id}
                actionsDisabled={Boolean(updatingOrderId)}
                onAccept={() => handleDecision(order, "accept")}
                onDecline={() => handleDecision(order, "decline")}
              />
            ) : (
              <IndividualFoodOrderCard
                key={order.id}
                order={order}
                index={index}
                updating={updatingOrderId === order.id}
                actionsDisabled={Boolean(updatingOrderId)}
                onAccept={() => handleDecision(order, "accept")}
                onDecline={() => handleDecision(order, "decline")}
              />
            )
          )
        )}
      </section>
    </div>
  );
}

function IndividualFoodOrderCard({
  order,
  index,
  updating,
  actionsDisabled,
  onAccept,
  onDecline,
}) {
  const name = getCustomerName(order);
  const phone = getCustomerPhone(order);
  const items = getIndividualItems(order);

  return (
    <OrderCardShell
      order={order}
      index={index}
      badge="FOOD ORDER"
      badgeClass="bg-orange-100 text-orange-700"
      avatarClass="bg-orange-50"
      phone={phone}
      whatsappHref={buildWhatsappHref(phone, name, "individual")}
    >
      <div className="mt-4 overflow-hidden rounded-2xl border border-orange-100">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 border-b border-orange-100 px-3 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-800">
                  {item.name}
                </p>
                <p className="mt-0.5 text-[10px] font-bold text-slate-500">
                  ₹{formatMoney(item.price)} × {item.quantity}
                </p>
              </div>

              <p className="shrink-0 text-sm font-black text-orange-600">
                ₹{formatMoney(item.itemTotal)}
              </p>
            </div>
          ))
        ) : (
          <div className="px-3 py-4 text-center text-xs font-bold text-slate-500">
            Item details missing
          </div>
        )}
      </div>

      <AmountBox
        label="Order Total"
        amount={getOrderAmount(order)}
        paymentStatus={getPaymentStatus(order)}
        paymentMethod={order.paymentMethod || "cod"}
      />

      <CustomerDetails order={order} />

      <DecisionButtons
        updating={updating}
        actionsDisabled={actionsDisabled}
        acceptLabel="✓ Accept & Send to Delivery"
        onAccept={onAccept}
        onDecline={onDecline}
      />
    </OrderCardShell>
  );
}

function SubscriptionOrderCard({
  order,
  index,
  updating,
  actionsDisabled,
  onAccept,
  onDecline,
}) {
  const name = getCustomerName(order);
  const phone = getCustomerPhone(order);

  return (
    <OrderCardShell
      order={order}
      index={index}
      badge="MONTHLY"
      badgeClass="bg-blue-100 text-blue-700"
      avatarClass="bg-blue-50"
      phone={phone}
      whatsappHref={buildWhatsappHref(phone, name, "monthly")}
    >
      <div className="mt-4 grid grid-cols-2 gap-2">
        <InfoBox label="Plan" value={getPlanLabel(order)} />
        <InfoBox label="Meal" value={getPreferenceLabel(order)} />
      </div>

      <AmountBox
        label="Monthly Amount"
        amount={getOrderAmount(order)}
        paymentStatus={getPaymentStatus(order)}
      />

      <CustomerDetails order={order} />

      <DecisionButtons
        updating={updating}
        actionsDisabled={actionsDisabled}
        acceptLabel="✓ Accept Subscription"
        onAccept={onAccept}
        onDecline={onDecline}
      />
    </OrderCardShell>
  );
}

function OrderCardShell({
  order,
  index,
  badge,
  badgeClass,
  avatarClass,
  phone,
  whatsappHref,
  children,
}) {
  const name = getCustomerName(order);
  const shortId = String(order.id || "").slice(-8).toUpperCase();

  return (
    <article className="overflow-hidden rounded-[26px] border border-orange-100 bg-white shadow-sm">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar index={index} className={avatarClass} />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-[17px] font-black text-slate-950">
                    {name}
                  </h2>

                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${badgeClass}`}
                  >
                    {badge}
                  </span>
                </div>

                <p className="mt-1 text-xs font-bold text-slate-400">
                  Order #{shortId || "------"}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[11px] font-bold text-slate-500">
                  {getDisplayDateTime(order.createdAt)}
                </p>

                <span className="mt-2 inline-flex rounded-full bg-yellow-100 px-3 py-1.5 text-[10px] font-black text-yellow-700">
                  PENDING
                </span>
              </div>
            </div>

            {children}

            {phone && (
              <ContactButtons
                phoneHref={buildPhoneHref(phone)}
                whatsappHref={whatsappHref}
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function AmountBox({
  label,
  amount,
  paymentStatus,
  paymentMethod,
}) {
  return (
    <div className="mt-3 flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3">
      <div>
        <p className="text-[10px] font-black uppercase text-slate-400">
          {label}
        </p>

        <p className="mt-1 text-xl font-black text-orange-600">
          ₹{formatMoney(amount)}
        </p>
      </div>

      <div className="text-right">
        <PaymentBadge status={paymentStatus} />

        {paymentMethod && (
          <p className="mt-1 text-[9px] font-black uppercase text-slate-400">
            {String(paymentMethod).toUpperCase()}
          </p>
        )}
      </div>
    </div>
  );
}

function CustomerDetails({ order }) {
  return (
    <div className="mt-3 rounded-2xl bg-slate-50 p-3">
      <p className="break-words text-sm font-bold text-slate-700">
        📍 {getCustomerAddress(order)}
      </p>

      {order.notes && (
        <p className="mt-2 break-words text-sm font-bold text-slate-600">
          📝 {order.notes}
        </p>
      )}
    </div>
  );
}

function ContactButtons({ phoneHref, whatsappHref }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <a
        href={phoneHref}
        className="rounded-2xl border border-blue-200 bg-blue-50 py-3 text-center text-xs font-black text-blue-700"
      >
        📞 Call
      </a>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        className="rounded-2xl border border-green-200 bg-green-50 py-3 text-center text-xs font-black text-green-700"
      >
        💬 WhatsApp
      </a>
    </div>
  );
}

function DecisionButtons({
  updating,
  actionsDisabled,
  acceptLabel,
  onAccept,
  onDecline,
}) {
  return (
    <div className="-mx-4 mt-4 grid grid-cols-2 gap-3 border-t border-orange-100 bg-orange-50/50 p-3 pb-0">
      <button
        type="button"
        onClick={onDecline}
        disabled={actionsDisabled}
        className="flex h-12 items-center justify-center rounded-2xl border-2 border-red-200 bg-white text-sm font-black text-red-600 disabled:opacity-50"
      >
        {updating ? "Updating..." : "✕ Decline"}
      </button>

      <button
        type="button"
        onClick={onAccept}
        disabled={actionsDisabled}
        className="flex h-12 items-center justify-center rounded-2xl bg-green-600 px-2 text-center text-xs font-black text-white shadow-lg shadow-green-600/20 disabled:opacity-50"
      >
        {updating ? "Updating..." : acceptLabel}
      </button>
    </div>
  );
}

function SummaryCard({ value, label, icon }) {
  return (
    <div className="rounded-[20px] bg-orange-50 px-2 py-4 text-center">
      <div className="text-xl">{icon}</div>
      <p className="mt-1 text-2xl font-black text-orange-600">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-white px-3 py-3">
      <p className="text-[10px] font-black uppercase text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}

function PaymentBadge({ status }) {
  const paid = status === "paid";

  return (
    <span
      className={`rounded-full px-3 py-2 text-[10px] font-black ${
        paid
          ? "bg-green-100 text-green-700"
          : "bg-yellow-100 text-yellow-700"
      }`}
    >
      {paid ? "✓ PAID" : "PAYMENT PENDING"}
    </span>
  );
}

function Avatar({ index, className }) {
  const avatars = ["👨🏻", "👩🏻", "👨🏽", "👩🏻‍🦱"];

  return (
    <div
      className={`grid h-[58px] w-[58px] shrink-0 place-items-center rounded-full text-3xl ${className}`}
    >
      {avatars[index % avatars.length]}
    </div>
  );
}

function EmptyOrders({ searchText, activeTab }) {
  const monthly = activeTab === "monthly";

  return (
    <div className="rounded-[26px] border border-orange-100 bg-white px-5 py-14 text-center shadow-sm">
      <div className="text-6xl">{monthly ? "📅" : "🍽️"}</div>

      <h2 className="mt-4 text-xl font-black text-slate-950">
        {monthly ? "No Monthly Requests" : "No Food Orders"}
      </h2>

      <p className="mt-2 text-sm font-bold text-slate-500">
        {searchText
          ? "Search ke according koi pending order nahi mila."
          : monthly
          ? "Naya monthly subscription request yahan show hoga."
          : "Naya individual food order yahan show hoga."}
      </p>
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="animate-pulse rounded-[26px] border border-orange-100 bg-white p-4"
        >
          <div className="flex gap-3">
            <div className="h-14 w-14 shrink-0 rounded-full bg-slate-200" />
            <div className="flex-1">
              <div className="h-4 w-32 rounded bg-slate-200" />
              <div className="mt-3 h-3 w-24 rounded bg-slate-100" />
              <div className="mt-4 h-24 rounded-2xl bg-slate-100" />
              <div className="mt-4 h-12 rounded-2xl bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function getOrderCategory(order) {
  if (String(order?.subscriptionId || "").trim()) return "monthly";

  const type = String(order?.orderType || order?.type || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (
    [
      "monthly",
      "monthly_subscription",
      "subscription",
      "tiffin_subscription",
    ].includes(type)
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
    ].includes(type)
  ) {
    return "individual";
  }

  if (
    Array.isArray(order?.items) &&
    order.items.some(
      (item) => item?.name || item?.title || item?.quantity
    )
  ) {
    return "individual";
  }

  return "unknown";
}

function getIndividualItems(order) {
  const items = Array.isArray(order?.items) ? order.items : [];

  return items
    .map((item, index) => {
      const name = String(
        item?.name || item?.title || `Item ${index + 1}`
      ).trim();

      const price = safeNumber(item?.price);
      const quantity = Math.max(1, safeNumber(item?.quantity || 1));

      return {
        id: String(item?.id || `${name}-${index}`),
        name,
        price,
        quantity,
        itemTotal: safeNumber(
          item?.itemTotal ?? item?.total ?? price * quantity
        ),
        mealSlot: String(item?.mealSlot || item?.mealType || "both"),
      };
    })
    .filter((item) => Boolean(item.name));
}

function getTotalItemCount(order) {
  const explicit = safeNumber(order?.totalItems);
  if (explicit > 0) return explicit;

  return getIndividualItems(order).reduce(
    (total, item) => total + item.quantity,
    0
  );
}

function getOrderMealSlot(order) {
  const slots = new Set(
    getIndividualItems(order).map((item) =>
      String(item.mealSlot || "both").trim().toLowerCase()
    )
  );

  return slots.size === 1 ? [...slots][0] || "both" : "both";
}

function getCustomerName(order) {
  return String(
    order?.customerName ||
      order?.name ||
      order?.userName ||
      "Customer"
  ).trim();
}

function getCustomerPhone(order) {
  return String(
    order?.customerPhone || order?.phone || order?.mobile || ""
  ).trim();
}

function getCustomerAddress(order) {
  return String(
    order?.customerAddress ||
      order?.address ||
      order?.deliveryAddress ||
      "Address not added"
  ).trim();
}

function getPlanLabel(order) {
  const type = String(
    order?.mealType ||
      order?.items?.[0]?.mealType ||
      order?.planName ||
      order?.planType ||
      "monthly"
  )
    .trim()
    .toLowerCase();

  if (type === "lunch") return "Lunch Only";
  if (type === "dinner") return "Dinner Only";

  if (
    ["lunch_dinner", "lunch+dinner", "lunch-dinner", "both"].includes(
      type
    )
  ) {
    return "Lunch + Dinner";
  }

  return order?.planName || order?.planType || "Monthly Plan";
}

function getPreferenceLabel(order) {
  const value = String(
    order?.mealPreference ||
      order?.items?.[0]?.mealPreference ||
      order?.preference ||
      "veg"
  )
    .trim()
    .toLowerCase();

  return ["non-veg", "nonveg", "non_veg"].includes(value)
    ? "Non-Veg"
    : "Veg";
}

function getRawStatus(order) {
  return String(
    order?.orderStatus ||
      order?.deliveryStatus ||
      order?.status ||
      "pending"
  )
    .trim()
    .toLowerCase();
}

function getPaymentStatus(order) {
  return String(order?.paymentStatus || "pending")
    .trim()
    .toLowerCase();
}

function getOrderAmount(order) {
  const explicit = safeNumber(
    order?.totalAmount ?? order?.price ?? order?.amount
  );

  if (explicit > 0) return explicit;

  return getIndividualItems(order).reduce(
    (total, item) => total + item.itemTotal,
    0
  );
}

function getDisplayDateTime(value) {
  const date = toDate(value);
  if (!date) return "--";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getTimeMs(value) {
  const date = toDate(value);
  return date ? date.getTime() : 0;
}

function isToday(value) {
  const date = toDate(value);
  if (!date) return false;

  const today = new Date();

  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function toDate(value) {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value.seconds === "number") {
    const date = new Date(value.seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildPhoneHref(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return digits ? `tel:${digits}` : "";
}

function buildWhatsappHref(phone, customerName, type) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";

  const number = digits.length === 10 ? `91${digits}` : digits;

  const message =
    type === "individual"
      ? `Hello ${customerName}, aapke food order ke regarding contact kar rahe hain.`
      : `Hello ${customerName}, aapke monthly tiffin subscription request ke regarding contact kar rahe hain.`;

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function safeNumber(value) {
  const number = Number(value || 0);
  return Number.isNaN(number) ? 0 : number;
}

function formatMoney(value) {
  return safeNumber(value).toLocaleString("en-IN");
}