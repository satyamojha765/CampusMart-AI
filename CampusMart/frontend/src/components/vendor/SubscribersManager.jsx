import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Timestamp,
} from "firebase/firestore";

import {
  getSubscriptionsByVendor,
  removeSubscription,
  updateSubscription,
} from "../../features/vendor/services/subscriptionService";

import {
  getOrdersByVendor,
} from "../../features/vendor/services/orderService";

const FILTERS = [
  "All",
  "Active",
  "Delivered Today",
  "Pending Today",
  "Expired",
];

export default function SubscribersManager({
  vendor,
}) {
  const [
    subscribers,
    setSubscribers,
  ] = useState([]);

  const [
    selectedSubscriber,
    setSelectedSubscriber,
  ] = useState(null);

  const [
    activeFilter,
    setActiveFilter,
  ] = useState("All");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [
    updatingSubscriberId,
    setUpdatingSubscriberId,
  ] = useState("");

  const [error, setError] =
    useState("");

  const loadSubscribers =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        if (!vendor?.id) {
          setSubscribers([]);
          setLoading(false);
          setError(
            "Vendor ID nahi mila."
          );
          return;
        }

        try {
          if (silent) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          const [
            subscriptionList,
            orderList,
          ] = await Promise.all([
            getSubscriptionsByVendor(
              vendor.id
            ),
            getOrdersByVendor(
              vendor.id
            ),
          ]);

          /*
           * Subscribers section mein sirf wahi user
           * show hoga jiska linked monthly order vendor
           * Accept kar chuka hai.
           *
           * Pending/declined order ka subscription
           * Firestore mein safe rahega, lekin yahan
           * subscriber list mein nahi dikhega.
           */
          const acceptedSubscriptionIds =
            new Set(
              (
                Array.isArray(orderList)
                  ? orderList
                  : []
              )
                .filter((order) =>
                  [
                    "accepted",
                    "confirmed",
                    "preparing",
                    "delivered",
                  ].includes(
                    normalizeText(
                      order.orderStatus ||
                        order.deliveryStatus ||
                        order.status
                    )
                  )
                )
                .map((order) =>
                  String(
                    order.subscriptionId ||
                      ""
                  ).trim()
                )
                .filter(Boolean)
            );

          const cleanList = (
            Array.isArray(
              subscriptionList
            )
              ? subscriptionList
              : []
          )
            .filter((item) => {
              const status =
                normalizeText(
                  item.status
                );

              return (
                acceptedSubscriptionIds.has(
                  String(
                    item.id || ""
                  ).trim()
                ) &&
                ![
                  "removed",
                  "cancelled",
                  "canceled",
                ].includes(status)
              );
            })
            .sort(
              (
                firstItem,
                secondItem
              ) =>
                getTimeMs(
                  secondItem.createdAt
                ) -
                getTimeMs(
                  firstItem.createdAt
                )
            );

          setSubscribers(
            cleanList
          );
        } catch (loadError) {
          console.error(
            "Failed to load subscribers:",
            loadError
          );

          setError(
            loadError?.message ||
              "Subscribers load nahi hue."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [vendor?.id]
    );

  useEffect(() => {
    setActiveFilter("All");
    setSearch("");
    setSelectedSubscriber(
      null
    );

    loadSubscribers();
  }, [loadSubscribers]);

  const stats = useMemo(() => {
    const active =
      subscribers.filter(
        (subscriber) =>
          isActiveSubscriber(
            subscriber
          )
      );

    const deliveredToday =
      active.filter(
        (subscriber) =>
          checkDeliveredToday(
            subscriber.lastDeliveredAt
          )
      ).length;

    const expired =
      subscribers.filter(
        (subscriber) =>
          isExpiredSubscriber(
            subscriber
          )
      ).length;

    return {
      total:
        subscribers.length,

      active:
        active.length,

      delivered:
        deliveredToday,

      pending:
        Math.max(
          0,
          active.length -
            deliveredToday
        ),

      expired,
    };
  }, [subscribers]);

  const filterCounts =
    useMemo(
      () => ({
        All: stats.total,

        Active:
          stats.active,

        "Delivered Today":
          stats.delivered,

        "Pending Today":
          stats.pending,

        Expired:
          stats.expired,
      }),
      [stats]
    );

  const filteredSubscribers =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return subscribers.filter(
        (subscriber) => {
          const matchesFilter =
            checkFilter(
              subscriber,
              activeFilter
            );

          if (!matchesFilter) {
            return false;
          }

          if (!query) {
            return true;
          }

          const searchableText = [
            subscriber.id,
            subscriber.customerName,
            subscriber.name,
            subscriber.customerPhone,
            subscriber.phone,
            subscriber.customerAddress,
            subscriber.address,
            subscriber.planName,
            subscriber.planType,
            subscriber.mealType,
            subscriber.mealPreference,
            subscriber.preference,
            subscriber.status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            query
          );
        }
      );
    }, [
      subscribers,
      activeFilter,
      search,
    ]);

  async function updateSubscriber(
    subscriber,
    updateData,
    successMessage,
    confirmationMessage = ""
  ) {
    if (!subscriber?.id) {
      alert(
        "Subscriber ID nahi mila."
      );
      return;
    }

    if (
      confirmationMessage &&
      !window.confirm(
        confirmationMessage
      )
    ) {
      return;
    }

    try {
      setUpdatingSubscriberId(
        subscriber.id
      );

      await updateSubscription(
        subscriber.id,
        updateData
      );

      setSubscribers(
        (currentSubscribers) =>
          currentSubscribers.map(
            (currentSubscriber) =>
              currentSubscriber.id ===
              subscriber.id
                ? {
                    ...currentSubscriber,
                    ...updateData,
                  }
                : currentSubscriber
          )
      );

      setSelectedSubscriber(
        (currentSelected) =>
          currentSelected?.id ===
          subscriber.id
            ? {
                ...currentSelected,
                ...updateData,
              }
            : currentSelected
      );

      if (successMessage) {
        alert(
          successMessage
        );
      }
    } catch (updateError) {
      console.error(
        "Subscriber update failed:",
        updateError
      );

      alert(
        updateError?.message ||
          "Subscriber update nahi hua."
      );
    } finally {
      setUpdatingSubscriberId(
        ""
      );
    }
  }

  async function renewSubscriber(
    subscriber
  ) {
    const baseDate =
      getRenewBaseDate(
        subscriber.endDate
      );

    const newEndDate =
      new Date(baseDate);

    newEndDate.setDate(
      newEndDate.getDate() +
        30
    );

    await updateSubscriber(
      subscriber,
      {
        status: "active",
        endDate:
          Timestamp.fromDate(
            newEndDate
          ),
      },
      "Subscription 30 days ke liye renew ho gaya.",
      "Kya subscription ko 30 days ke liye renew karna hai?"
    );
  }

  async function markDelivered(
    subscriber
  ) {
    await updateSubscriber(
      subscriber,
      {
        status:
          normalizeText(
            subscriber.status
          ) === "paused"
            ? "paused"
            : "active",

        deliveryStatus:
          "delivered",

        lastDeliveredAt:
          Timestamp.now(),
      },
      "Aaj ki delivery complete mark ho gayi."
    );
  }

  async function undoDelivered(
    subscriber
  ) {
    await updateSubscriber(
      subscriber,
      {
        deliveryStatus:
          "pending",

        lastDeliveredAt:
          null,
      },
      "Aaj ki delivery pending kar di gayi.",
      "Delivered status undo karna hai?"
    );
  }

  async function togglePause(
    subscriber
  ) {
    const currentlyPaused =
      normalizeText(
        subscriber.status
      ) === "paused";

    await updateSubscriber(
      subscriber,
      {
        status:
          currentlyPaused
            ? "active"
            : "paused",
      },
      currentlyPaused
        ? "Subscription resume ho gaya."
        : "Subscription pause ho gaya.",
      currentlyPaused
        ? "Subscription resume karna hai?"
        : "Subscription pause karna hai?"
    );
  }

  async function handleRemove(
    subscriber
  ) {
    if (!subscriber?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        `Remove ${
          subscriber.customerName ||
          "this customer"
        } from subscribers?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingSubscriberId(
        subscriber.id
      );

      await removeSubscription(
        subscriber.id,
        vendor?.id
      );

      setSubscribers(
        (currentSubscribers) =>
          currentSubscribers.filter(
            (currentSubscriber) =>
              currentSubscriber.id !==
              subscriber.id
          )
      );

      setSelectedSubscriber(
        null
      );

      alert(
        "Subscriber removed successfully."
      );
    } catch (removeError) {
      console.error(
        "Remove subscriber failed:",
        removeError
      );

      alert(
        removeError?.message ||
          "Subscriber remove nahi hua."
      );
    } finally {
      setUpdatingSubscriberId(
        ""
      );
    }
  }

  const vendorName =
    vendor?.businessName ||
    vendor?.name ||
    "Tiffin Vendor";

  return (
    <div className="min-h-screen bg-[#fffaf5] px-4 pb-28 pt-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[26px] font-black tracking-tight text-slate-950">
            Subscribers
          </h1>

          <p className="mt-1 truncate text-sm font-bold text-slate-500">
            {vendorName}
          </p>

          <p className="mt-1 text-xs font-bold text-slate-400">
            Monthly customers aur
            daily delivery manage
            karo.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            loadSubscribers({
              silent: true,
            })
          }
          disabled={refreshing}
          className="shrink-0 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-xs font-black text-orange-600 disabled:opacity-60"
        >
          {refreshing
            ? "Refreshing..."
            : "↻ Refresh"}
        </button>
      </header>

      <section className="mt-6 grid grid-cols-4 gap-2">
        <DeliveryStat
          title="Total"
          value={stats.total}
          icon="👥"
        />

        <DeliveryStat
          title="Active"
          value={stats.active}
          icon="✅"
        />

        <DeliveryStat
          title="Delivered"
          value={
            stats.delivered
          }
          icon="🚚"
        />

        <DeliveryStat
          title="Pending"
          value={stats.pending}
          icon="⏳"
        />
      </section>

      <section className="mt-5">
        <label className="relative block">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
            🔍
          </span>

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Name, phone, plan ya address"
            className="w-full rounded-2xl border border-orange-100 bg-white py-4 pl-12 pr-11 text-sm font-bold outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
              className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-slate-100 text-sm font-black text-slate-600"
            >
              ✕
            </button>
          )}
        </label>
      </section>

      <section className="mt-5 flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map(
          (filter) => (
            <button
              key={filter}
              type="button"
              onClick={() =>
                setActiveFilter(
                  filter
                )
              }
              className={`shrink-0 rounded-2xl px-4 py-3 text-xs font-black transition ${
                activeFilter ===
                filter
                  ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20"
                  : "border border-orange-100 bg-white text-slate-700"
              }`}
            >
              {filter}{" "}

              <span
                className={`ml-1 rounded-full px-2 py-0.5 ${
                  activeFilter ===
                  filter
                    ? "bg-white/20"
                    : "bg-orange-50 text-orange-600"
                }`}
              >
                {
                  filterCounts[
                    filter
                  ]
                }
              </span>
            </button>
          )
        )}
      </section>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          ⚠️ {error}
        </div>
      )}

      <section className="mt-5 space-y-4">
        {loading ? (
          <SubscriberSkeleton />
        ) : filteredSubscribers.length ===
          0 ? (
          <EmptySubscribers
            activeFilter={
              activeFilter
            }
            search={search}
          />
        ) : (
          filteredSubscribers.map(
            (
              subscriber,
              index
            ) => (
              <SubscriberCard
                key={
                  subscriber.id
                }
                subscriber={
                  subscriber
                }
                index={index}
                updating={
                  updatingSubscriberId ===
                  subscriber.id
                }
                onOpen={() =>
                  setSelectedSubscriber(
                    subscriber
                  )
                }
                onRenew={() =>
                  renewSubscriber(
                    subscriber
                  )
                }
                onDelivered={() =>
                  markDelivered(
                    subscriber
                  )
                }
                onUndoDelivered={() =>
                  undoDelivered(
                    subscriber
                  )
                }
              />
            )
          )
        )}
      </section>

      {selectedSubscriber && (
        <SubscriberDetailsModal
          vendor={vendor}
          subscriber={
            selectedSubscriber
          }
          updating={
            updatingSubscriberId ===
            selectedSubscriber.id
          }
          onClose={() =>
            setSelectedSubscriber(
              null
            )
          }
          onRenew={() =>
            renewSubscriber(
              selectedSubscriber
            )
          }
          onDelivered={() =>
            markDelivered(
              selectedSubscriber
            )
          }
          onUndoDelivered={() =>
            undoDelivered(
              selectedSubscriber
            )
          }
          onTogglePause={() =>
            togglePause(
              selectedSubscriber
            )
          }
          onRemove={() =>
            handleRemove(
              selectedSubscriber
            )
          }
        />
      )}
    </div>
  );
}

function SubscriberCard({
  subscriber,
  index,
  updating,
  onOpen,
  onRenew,
  onDelivered,
  onUndoDelivered,
}) {
  const phone =
    subscriber.customerPhone ||
    subscriber.phone ||
    "";

  const plan =
    getPlanLabel(
      subscriber
    );

  const preference =
    getPreferenceLabel(
      subscriber
    );

  const remainingDays =
    getRemainingDays(
      subscriber.endDate
    );

  const isExpired =
    isExpiredSubscriber(
      subscriber
    );

  const isPaused =
    normalizeText(
      subscriber.status
    ) === "paused";

  const isDeliveredToday =
    checkDeliveredToday(
      subscriber.lastDeliveredAt
    );

  const customerName =
    subscriber.customerName ||
    subscriber.name ||
    "Customer";

  return (
    <article className="rounded-[26px] border border-orange-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar
          index={index}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[17px] font-black text-slate-950">
                {customerName}
              </h3>

              <p className="mt-1 truncate text-xs font-bold text-slate-500">
                {plan} •{" "}
                {preference}
              </p>
            </div>

            <SubscriberStatus
              isExpired={
                isExpired
              }
              isPaused={
                isPaused
              }
              remainingDays={
                remainingDays
              }
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <InfoBox
              label="Phone"
              value={
                phone ||
                "Not added"
              }
            />

            <InfoBox
              label="Today"
              value={
                isDeliveredToday
                  ? "Delivered"
                  : isExpired ||
                    isPaused
                  ? "--"
                  : "Pending"
              }
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onOpen}
              className="rounded-2xl bg-orange-50 py-3 text-xs font-black text-orange-700"
            >
              View Details
            </button>

            {isExpired ? (
              <button
                type="button"
                disabled={updating}
                onClick={onRenew}
                className="rounded-2xl bg-slate-950 py-3 text-xs font-black text-white disabled:opacity-60"
              >
                {updating
                  ? "Updating..."
                  : "Renew 30 Days"}
              </button>
            ) : isDeliveredToday ? (
              <button
                type="button"
                disabled={updating}
                onClick={
                  onUndoDelivered
                }
                className="rounded-2xl bg-green-100 py-3 text-xs font-black text-green-700 disabled:opacity-60"
              >
                {updating
                  ? "Updating..."
                  : "✓ Delivered"}
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  updating ||
                  isPaused
                }
                onClick={
                  onDelivered
                }
                className="rounded-2xl bg-blue-600 py-3 text-xs font-black text-white disabled:opacity-50"
              >
                {updating
                  ? "Updating..."
                  : isPaused
                  ? "Paused"
                  : "Mark Delivered"}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function SubscriberDetailsModal({
  vendor,
  subscriber,
  updating,
  onClose,
  onRenew,
  onDelivered,
  onUndoDelivered,
  onTogglePause,
  onRemove,
}) {
  const phone =
    subscriber.customerPhone ||
    subscriber.phone ||
    "";

  const address =
    subscriber.customerAddress ||
    subscriber.address ||
    "No address";

  const plan =
    getPlanLabel(
      subscriber
    );

  const preference =
    getPreferenceLabel(
      subscriber
    );

  const remainingDays =
    getRemainingDays(
      subscriber.endDate
    );

  const isExpired =
    isExpiredSubscriber(
      subscriber
    );

  const isPaused =
    normalizeText(
      subscriber.status
    ) === "paused";

  const isDeliveredToday =
    checkDeliveredToday(
      subscriber.lastDeliveredAt
    );

  const customerName =
    subscriber.customerName ||
    subscriber.name ||
    "Customer";

  const vendorName =
    vendor?.businessName ||
    vendor?.name ||
    "Tiffin Vendor";

  const whatsappNumber =
    normalizePhone(phone);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/45 px-4 py-5"
      onClick={onClose}
    >
      <div className="mx-auto flex h-full max-w-[430px] items-end">
        <div
          className="max-h-[94vh] w-full overflow-y-auto rounded-t-[32px] bg-white p-5 shadow-2xl"
          onClick={(
            event
          ) =>
            event.stopPropagation()
          }
        >
          <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-slate-200" />

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
                Subscriber Details
              </p>

              <h2 className="mt-2 truncate text-2xl font-black text-slate-950">
                {customerName}
              </h2>

              <p className="mt-1 truncate text-sm font-bold text-slate-500">
                {vendorName}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-2xl font-black"
            >
              ×
            </button>
          </div>

          <section className="mt-5 grid grid-cols-3 gap-3">
            <MiniStat
              title="Price"
              value={`₹${
                subscriber.price ||
                subscriber.monthlyPrice ||
                0
              }`}
            />

            <MiniStat
              title="Days Left"
              value={
                isExpired
                  ? "Expired"
                  : `${remainingDays}d`
              }
            />

            <MiniStat
              title="Today"
              value={
                isDeliveredToday
                  ? "Done"
                  : isPaused
                  ? "Paused"
                  : "Pending"
              }
            />
          </section>

          <section className="mt-5 rounded-[24px] bg-orange-50 p-4">
            <InfoLine
              label="Phone"
              value={
                phone ||
                "No phone"
              }
            />

            <InfoLine
              label="Address"
              value={address}
            />

            <InfoLine
              label="Plan"
              value={plan}
            />

            <InfoLine
              label="Preference"
              value={preference}
            />

            <InfoLine
              label="Start Date"
              value={formatDate(
                subscriber.startDate
              )}
            />

            <InfoLine
              label="End Date"
              value={formatDate(
                subscriber.endDate
              )}
            />

            <InfoLine
              label="Status"
              value={
                isExpired
                  ? "expired"
                  : subscriber.status ||
                    "active"
              }
            />
          </section>

          {subscriber.notes && (
            <section className="mt-4 rounded-[24px] bg-yellow-50 p-4">
              <p className="text-xs font-black text-slate-500">
                Notes
              </p>

              <p className="mt-1 text-sm font-bold text-slate-800">
                {
                  subscriber.notes
                }
              </p>
            </section>
          )}

          <section className="mt-5 grid grid-cols-2 gap-3">
            <a
              href={
                phone
                  ? `tel:${phone}`
                  : undefined
              }
              className={`rounded-2xl py-4 text-center text-sm font-black ${
                phone
                  ? "bg-orange-600 text-white"
                  : "pointer-events-none bg-slate-100 text-slate-400"
              }`}
            >
              📞 Call
            </a>

            <a
              href={
                whatsappNumber
                  ? `https://wa.me/${whatsappNumber}`
                  : undefined
              }
              target="_blank"
              rel="noreferrer"
              className={`rounded-2xl py-4 text-center text-sm font-black ${
                whatsappNumber
                  ? "bg-green-600 text-white"
                  : "pointer-events-none bg-slate-100 text-slate-400"
              }`}
            >
              💬 WhatsApp
            </a>

            {isDeliveredToday ? (
              <button
                type="button"
                disabled={updating}
                onClick={
                  onUndoDelivered
                }
                className="rounded-2xl bg-green-100 py-4 text-sm font-black text-green-700 disabled:opacity-60"
              >
                ✓ Delivered Today
              </button>
            ) : (
              <button
                type="button"
                disabled={
                  updating ||
                  isExpired ||
                  isPaused
                }
                onClick={
                  onDelivered
                }
                className="rounded-2xl bg-blue-600 py-4 text-sm font-black text-white disabled:opacity-50"
              >
                Mark Delivered
              </button>
            )}

            <button
              type="button"
              disabled={updating}
              onClick={onRenew}
              className="rounded-2xl bg-slate-950 py-4 text-sm font-black text-white disabled:opacity-60"
            >
              Renew 30 Days
            </button>

            <button
              type="button"
              disabled={
                updating ||
                isExpired
              }
              onClick={
                onTogglePause
              }
              className={`rounded-2xl py-4 text-sm font-black disabled:opacity-50 ${
                isPaused
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {isPaused
                ? "Resume Plan"
                : "Pause Plan"}
            </button>

            <button
              type="button"
              disabled={updating}
              onClick={onRemove}
              className="rounded-2xl bg-red-50 py-4 text-sm font-black text-red-600 disabled:opacity-60"
            >
              Remove Subscriber
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

function DeliveryStat({
  title,
  value,
  icon,
}) {
  return (
    <div className="rounded-[20px] border border-orange-100 bg-white px-2 py-3 text-center shadow-sm">
      <div className="text-lg">
        {icon}
      </div>

      <h3 className="mt-1 text-2xl font-black text-orange-600">
        {value}
      </h3>

      <p className="mt-1 truncate text-[9px] font-black uppercase text-slate-500">
        {title}
      </p>
    </div>
  );
}

function InfoBox({
  label,
  value,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}

function SubscriberStatus({
  isExpired,
  isPaused,
  remainingDays,
}) {
  if (isExpired) {
    return (
      <span className="shrink-0 rounded-full bg-red-100 px-3 py-2 text-[10px] font-black text-red-700">
        Expired
      </span>
    );
  }

  if (isPaused) {
    return (
      <span className="shrink-0 rounded-full bg-yellow-100 px-3 py-2 text-[10px] font-black text-yellow-700">
        Paused
      </span>
    );
  }

  return (
    <span className="shrink-0 rounded-full bg-green-100 px-3 py-2 text-[10px] font-black text-green-700">
      {remainingDays} Days
    </span>
  );
}

function MiniStat({
  title,
  value,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <p className="text-[10px] font-black text-slate-500">
        {title}
      </p>

      <p className="mt-1 truncate text-sm font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

function InfoLine({
  label,
  value,
}) {
  return (
    <div className="border-b border-orange-100 py-3 last:border-b-0">
      <p className="text-xs font-black text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-slate-900">
        {value || "--"}
      </p>
    </div>
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
    <div className="grid h-[58px] w-[58px] shrink-0 place-items-center rounded-full bg-orange-50 text-3xl">
      {
        avatars[
          index %
            avatars.length
        ]
      }
    </div>
  );
}

function EmptySubscribers({
  activeFilter,
  search,
}) {
  return (
    <div className="rounded-[26px] border border-orange-100 bg-white px-5 py-14 text-center shadow-sm">
      <div className="text-6xl">
        👥
      </div>

      <h2 className="mt-4 text-xl font-black text-slate-950">
        No Subscribers
      </h2>

      <p className="mt-2 text-sm font-bold text-slate-500">
        {search
          ? "Search ke according koi subscriber nahi mila."
          : activeFilter ===
              "All"
          ? "Is vendor ke monthly subscribers abhi nahi hain."
          : `${activeFilter} subscriber abhi nahi hai.`}
      </p>
    </div>
  );
}

function SubscriberSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(
        (item) => (
          <div
            key={item}
            className="animate-pulse rounded-[26px] border border-orange-100 bg-white p-4"
          >
            <div className="flex gap-3">
              <div className="h-14 w-14 rounded-full bg-slate-200" />

              <div className="flex-1">
                <div className="h-4 w-32 rounded bg-slate-200" />

                <div className="mt-3 h-3 w-24 rounded bg-slate-100" />

                <div className="mt-4 h-20 rounded-2xl bg-slate-100" />
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function checkFilter(
  subscriber,
  activeFilter
) {
  if (activeFilter === "All") {
    return true;
  }

  if (activeFilter === "Active") {
    return isActiveSubscriber(
      subscriber
    );
  }

  if (
    activeFilter ===
    "Delivered Today"
  ) {
    return (
      isActiveSubscriber(
        subscriber
      ) &&
      checkDeliveredToday(
        subscriber.lastDeliveredAt
      )
    );
  }

  if (
    activeFilter ===
    "Pending Today"
  ) {
    return (
      isActiveSubscriber(
        subscriber
      ) &&
      !checkDeliveredToday(
        subscriber.lastDeliveredAt
      )
    );
  }

  if (activeFilter === "Expired") {
    return isExpiredSubscriber(
      subscriber
    );
  }

  return true;
}

function getPlanLabel(
  subscriber
) {
  const type =
    subscriber.mealType ||
    subscriber.planName ||
    subscriber.planType ||
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
      "lunch+dinner"
  ) {
    return "Lunch + Dinner";
  }

  return (
    subscriber.planName ||
    subscriber.planType ||
    "Monthly Plan"
  );
}

function getPreferenceLabel(
  subscriber
) {
  const preference =
    subscriber.mealPreference ||
    subscriber.preference ||
    "veg";

  const normalized =
    normalizeText(preference);

  return [
    "non-veg",
    "nonveg",
    "non_veg",
  ].includes(normalized)
    ? "Non-Veg"
    : "Veg";
}

function getRemainingDays(
  endDate
) {
  const end =
    toDate(endDate);

  if (!end) {
    return 0;
  }

  const now =
    new Date();

  const endOfToday =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  const endDay =
    new Date(
      end.getFullYear(),
      end.getMonth(),
      end.getDate()
    );

  const difference =
    endDay.getTime() -
    endOfToday.getTime();

  const days =
    Math.ceil(
      difference /
        (1000 *
          60 *
          60 *
          24)
    );

  return Math.max(
    0,
    days
  );
}

function isExpiredSubscriber(
  subscriber
) {
  return (
    getRemainingDays(
      subscriber.endDate
    ) === 0
  );
}

function isActiveSubscriber(
  subscriber
) {
  const status =
    normalizeText(
      subscriber.status
    );

  return (
    ![
      "removed",
      "cancelled",
      "paused",
    ].includes(status) &&
    !isExpiredSubscriber(
      subscriber
    )
  );
}

function getRenewBaseDate(
  endDate
) {
  const today =
    new Date();

  const currentEnd =
    toDate(endDate);

  if (!currentEnd) {
    return today;
  }

  return currentEnd >
    today
    ? currentEnd
    : today;
}

function checkDeliveredToday(
  value
) {
  const deliveredDate =
    toDate(value);

  if (!deliveredDate) {
    return false;
  }

  const today =
    new Date();

  return (
    deliveredDate.getFullYear() ===
      today.getFullYear() &&
    deliveredDate.getMonth() ===
      today.getMonth() &&
    deliveredDate.getDate() ===
      today.getDate()
  );
}

function formatDate(value) {
  const date =
    toDate(value);

  if (!date) {
    return "--";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function getTimeMs(value) {
  const date =
    toDate(value);

  return date
    ? date.getTime()
    : 0;
}

function toDate(value) {
  if (!value) {
    return null;
  }

  const date =
    value?.seconds
      ? new Date(
          value.seconds *
            1000
        )
      : value?.toDate
      ? value.toDate()
      : new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizePhone(phone) {
  const digits =
    String(phone || "")
      .replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (
    digits.length === 10
  ) {
    return `91${digits}`;
  }

  if (
    digits.length === 12 &&
    digits.startsWith("91")
  ) {
    return digits;
  }

  return digits;
}