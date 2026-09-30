import { useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import {
  getSubscriptionsByVendor,
  removeSubscription,
  updateSubscription,
} from "../../features/vendor/services/subscriptionService";

export default function SubscribersManager({ vendor }) {
  const [subscribers, setSubscribers] = useState([]);
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadSubscribers() {
    if (!vendor?.id) return;

    try {
      setLoading(true);

      const list = await getSubscriptionsByVendor(vendor.id);

      const activeList = list.filter((item) => item.status !== "removed");

      const sorted = [...activeList].sort(
        (a, b) => getTimeMs(b.createdAt) - getTimeMs(a.createdAt)
      );

      setSubscribers(sorted);
    } catch (error) {
      console.error("Failed to load subscribers:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubscribers();
  }, [vendor?.id]);

  const deliveryStats = useMemo(() => {
    const activeSubscribers = subscribers.filter(
      (item) => getRemainingDays(item.endDate) !== 0
    );

    const deliveredToday = activeSubscribers.filter((item) =>
      checkDeliveredToday(item.lastDeliveredAt)
    ).length;

    return {
      total: activeSubscribers.length,
      delivered: deliveredToday,
      pending: activeSubscribers.length - deliveredToday,
    };
  }, [subscribers]);

  const filteredSubscribers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return subscribers;

    return subscribers.filter((item) => {
      const name = (item.customerName || "").toLowerCase();
      const phone = (item.customerPhone || item.phone || "").toLowerCase();
      const plan = getPlanLabel(item).toLowerCase();
      const preference = getPreferenceLabel(item).toLowerCase();

      return (
        name.includes(query) ||
        phone.includes(query) ||
        plan.includes(query) ||
        preference.includes(query)
      );
    });
  }, [subscribers, search]);

  return (
    <div className="min-h-screen bg-white px-5 pb-24 pt-6">
      <header>
        <h1 className="text-[26px] font-black tracking-tight text-[#111111]">
          Subscribers
        </h1>

        <p className="mt-1 text-sm font-bold text-slate-500">
          Tap a customer to view details or remove.
        </p>
      </header>

      <section className="mt-6 grid grid-cols-3 gap-3">
        <DeliveryStat title="Total" value={deliveryStats.total} />
        <DeliveryStat title="Delivered" value={deliveryStats.delivered} />
        <DeliveryStat title="Pending" value={deliveryStats.pending} />
      </section>

      <section className="mt-7 flex items-center gap-3">
        <div className="flex h-[54px] flex-1 items-center gap-3 rounded-[18px] border border-[#ededed] bg-white px-4 shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
          <span className="text-2xl text-slate-400">⌕</span>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subscribers..."
            className="w-full bg-transparent text-[15px] font-semibold text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>

        <button
          type="button"
          onClick={loadSubscribers}
          className="grid h-[54px] w-[54px] place-items-center rounded-[18px] border border-[#ededed] bg-white text-xl shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
        >
          ↻
        </button>
      </section>

      <section className="mt-7 overflow-hidden rounded-[22px] bg-white">
        {loading ? (
          <div className="py-10 text-center text-sm font-black text-slate-500">
            Loading subscribers...
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-5xl">👥</div>

            <h2 className="mt-3 text-xl font-black text-slate-900">
              No Subscribers
            </h2>

            <p className="mt-1 text-sm font-bold text-slate-500">
              Monthly subscribers will appear here.
            </p>
          </div>
        ) : (
          filteredSubscribers.map((subscriber, index) => (
            <SubscriberRow
              key={subscriber.id}
              subscriber={subscriber}
              index={index}
              onOpen={() => setSelectedSubscriber(subscriber)}
              onUpdated={loadSubscribers}
            />
          ))
        )}
      </section>

      {selectedSubscriber && (
        <SubscriberDetailsModal
          vendor={vendor}
          subscriber={selectedSubscriber}
          onClose={() => setSelectedSubscriber(null)}
          onUpdated={() => {
            setSelectedSubscriber(null);
            loadSubscribers();
          }}
        />
      )}
    </div>
  );
}

function SubscriberRow({ subscriber, index, onOpen, onUpdated }) {
  const phone = subscriber.customerPhone || subscriber.phone || "";
  const plan = getPlanLabel(subscriber);
  const preference = getPreferenceLabel(subscriber);
  const remainingDays = getRemainingDays(subscriber.endDate);
  const isExpired = remainingDays === 0;
  const isNonVeg = preference === "Non-Veg";
  const isDeliveredToday = checkDeliveredToday(subscriber.lastDeliveredAt);

  async function handleRenew(e) {
    e.stopPropagation();

    try {
      const baseDate = getRenewBaseDate(subscriber.endDate);
      const newEndDate = new Date(baseDate);
      newEndDate.setDate(newEndDate.getDate() + 30);

      await updateSubscription(subscriber.id, {
        status: "active",
        endDate: Timestamp.fromDate(newEndDate),
      });

      alert("Subscription renewed for 30 days.");
      onUpdated();
    } catch (error) {
      console.error("Renew failed:", error);
      alert(error.message);
    }
  }

  async function handleDelivered(e) {
    e.stopPropagation();

    try {
      await updateSubscription(subscriber.id, {
        deliveryStatus: "delivered",
        lastDeliveredAt: Timestamp.now(),
      });

      alert("Marked as delivered today.");
      onUpdated();
    } catch (error) {
      console.error("Delivery update failed:", error);
      alert(error.message);
    }
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full border-b border-[#f1f1f1] py-4 text-left last:border-b-0"
    >
      <div className="flex items-center gap-4">
        <Avatar index={index} />

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-black leading-tight text-[#111111]">
            {subscriber.customerName || "Customer"}
          </h3>

          <p className="mt-1 truncate text-[13px] font-bold text-slate-500">
            {plan}
          </p>

          <div className="mt-2 flex items-center gap-5">
            <p className="text-[15px] font-bold leading-none text-[#111111]">
              {phone || "No phone"}
            </p>

            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isNonVeg ? "bg-red-500" : "bg-green-500"
                }`}
              />

              <span className="text-[14px] font-semibold text-[#111111]">
                {preference}
              </span>
            </div>
          </div>
        </div>

        <div className="min-w-[95px] text-right">
          {isExpired ? (
            <>
              <p className="text-[18px] font-black leading-tight text-red-500">
                Expired
              </p>

              <button
                type="button"
                onClick={handleRenew}
                className="mt-2 text-[15px] font-black text-red-500"
              >
                Renew Now
              </button>
            </>
          ) : (
            <>
              <p className="text-[16px] font-black text-[#111111]">
                {remainingDays} Days Left
              </p>

              <span
                className={`mt-3 inline-flex rounded-[9px] px-3 py-1 text-[13px] font-black ${
                  isDeliveredToday
                    ? "bg-green-100 text-green-600"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {isDeliveredToday ? "Delivered" : "Pending"}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <a
          href={phone ? `tel:${phone}` : undefined}
          onClick={(e) => e.stopPropagation()}
          className="rounded-2xl bg-orange-50 py-3 text-center text-sm font-black text-orange-600"
        >
          Call
        </a>

        <button
          type="button"
          onClick={handleDelivered}
          disabled={isExpired}
          className={`rounded-2xl py-3 text-sm font-black disabled:opacity-50 ${
            isDeliveredToday
              ? "bg-green-100 text-green-700"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          {isDeliveredToday ? "✓ Delivered" : "Delivered"}
        </button>

        <button
          type="button"
          onClick={handleRenew}
          className="rounded-2xl bg-slate-100 py-3 text-sm font-black text-slate-800"
        >
          Renew
        </button>
      </div>
    </button>
  );
}

function SubscriberDetailsModal({ vendor, subscriber, onClose, onUpdated }) {
  const phone = subscriber.customerPhone || subscriber.phone || "";
  const address =
    subscriber.customerAddress || subscriber.address || "No address";
  const plan = getPlanLabel(subscriber);
  const preference = getPreferenceLabel(subscriber);
  const remainingDays = getRemainingDays(subscriber.endDate);
  const isExpired = remainingDays === 0;
  const isDeliveredToday = checkDeliveredToday(subscriber.lastDeliveredAt);

  async function handleRenew() {
    try {
      const baseDate = getRenewBaseDate(subscriber.endDate);
      const newEndDate = new Date(baseDate);
      newEndDate.setDate(newEndDate.getDate() + 30);

      await updateSubscription(subscriber.id, {
        status: "active",
        endDate: Timestamp.fromDate(newEndDate),
      });

      alert("Subscription renewed for 30 days.");
      onUpdated();
    } catch (error) {
      console.error("Renew failed:", error);
      alert(error.message);
    }
  }

  async function handleDelivered() {
    try {
      await updateSubscription(subscriber.id, {
        deliveryStatus: "delivered",
        lastDeliveredAt: Timestamp.now(),
      });

      alert("Marked as delivered today.");
      onUpdated();
    } catch (error) {
      console.error("Delivery update failed:", error);
      alert(error.message);
    }
  }

  async function handleRemove() {
    const confirmed = window.confirm(
      `Remove ${subscriber.customerName || "this customer"} from subscribers?`
    );

    if (!confirmed) return;

    try {
      await removeSubscription(subscriber.id, vendor?.id);

      alert("Subscriber removed successfully.");
      onUpdated();
    } catch (error) {
      console.error("Remove subscriber failed:", error);
      alert(error.message);
    }
  }

  function openWhatsApp() {
    if (!phone) {
      alert("Phone number not available");
      return;
    }

    window.open(`https://wa.me/91${phone}`, "_blank");
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 px-4 py-6">
      <div className="mx-auto flex h-full max-w-[430px] items-end">
        <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[32px] bg-white p-5 shadow-2xl">
          <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-slate-200" />

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">
                Subscriber Details
              </p>

              <h2 className="mt-2 text-2xl font-black text-[#111111]">
                {subscriber.customerName || "Customer"}
              </h2>

              <p className="mt-1 text-sm font-bold text-slate-500">
                {plan} • {preference}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-2xl font-black"
            >
              ×
            </button>
          </div>

          <section className="mt-5 grid grid-cols-3 gap-3">
            <MiniStat title="Price" value={`₹${subscriber.price || 0}`} />
            <MiniStat
              title="Left"
              value={isExpired ? "Expired" : `${remainingDays}d`}
            />
            <MiniStat
              title="Today"
              value={isDeliveredToday ? "Done" : "Pending"}
            />
          </section>

          <section className="mt-5 rounded-[24px] bg-orange-50 p-4">
            <InfoLine label="Phone" value={phone || "No phone"} />
            <InfoLine label="Address" value={address} />
            <InfoLine label="Plan" value={plan} />
            <InfoLine label="Preference" value={preference} />
            <InfoLine label="Start Date" value={formatDate(subscriber.startDate)} />
            <InfoLine label="End Date" value={formatDate(subscriber.endDate)} />
            <InfoLine label="Status" value={subscriber.status || "active"} />
          </section>

          {subscriber.notes && (
            <section className="mt-4 rounded-[24px] bg-yellow-50 p-4">
              <p className="text-xs font-black text-slate-500">Notes</p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {subscriber.notes}
              </p>
            </section>
          )}

          <section className="mt-5 grid grid-cols-2 gap-3">
            <a
              href={phone ? `tel:${phone}` : undefined}
              className="rounded-2xl bg-orange-600 py-4 text-center text-sm font-black text-white"
            >
              Call
            </a>

            <button
              type="button"
              onClick={openWhatsApp}
              className="rounded-2xl bg-green-600 py-4 text-sm font-black text-white"
            >
              WhatsApp
            </button>

            <button
              type="button"
              onClick={handleDelivered}
              disabled={isExpired}
              className={`rounded-2xl py-4 text-sm font-black disabled:opacity-50 ${
                isDeliveredToday
                  ? "bg-green-100 text-green-700"
                  : "bg-blue-600 text-white"
              }`}
            >
              {isDeliveredToday ? "✓ Delivered Today" : "Mark Delivered"}
            </button>

            <button
              type="button"
              onClick={handleRenew}
              className="rounded-2xl bg-slate-900 py-4 text-sm font-black text-white"
            >
              Renew 30 Days
            </button>
          </section>

          <button
            type="button"
            onClick={handleRemove}
            className="mt-4 w-full rounded-2xl bg-red-50 py-4 text-sm font-black text-red-600"
          >
            Remove Subscriber
          </button>
        </div>
      </div>
    </div>
  );
}

function DeliveryStat({ title, value }) {
  return (
    <div className="rounded-[18px] border border-orange-100 bg-white p-4 text-center shadow-sm">
      <p className="text-[11px] font-black text-slate-500">{title}</p>
      <h3 className="mt-2 text-3xl font-black text-orange-600">{value}</h3>
    </div>
  );
}

function MiniStat({ title, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 text-center">
      <p className="text-[10px] font-black text-slate-500">{title}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function InfoLine({ label, value }) {
  return (
    <div className="border-b border-orange-100 py-3 last:border-b-0">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value || "--"}</p>
    </div>
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

function getPlanLabel(subscriber) {
  const type = subscriber.mealType || subscriber.planName || "lunch";

  if (type === "lunch") return "Lunch Only";
  if (type === "dinner") return "Dinner Only";
  if (type === "lunch_dinner") return "Lunch + Dinner";

  return subscriber.planName || "Monthly Plan";
}

function getPreferenceLabel(subscriber) {
  const preference = subscriber.mealPreference || "veg";
  return preference === "non-veg" ? "Non-Veg" : "Veg";
}

function getRemainingDays(endDate) {
  if (!endDate) return "--";

  const end = endDate?.seconds
    ? new Date(endDate.seconds * 1000)
    : new Date(endDate);

  if (Number.isNaN(end.getTime())) return "--";

  const today = new Date();
  const diff = end - today;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  return days > 0 ? days : 0;
}

function getRenewBaseDate(endDate) {
  const today = new Date();

  if (!endDate) return today;

  const currentEnd = endDate?.seconds
    ? new Date(endDate.seconds * 1000)
    : new Date(endDate);

  if (Number.isNaN(currentEnd.getTime())) return today;

  return currentEnd > today ? currentEnd : today;
}

function checkDeliveredToday(value) {
  if (!value) return false;

  const deliveredDate = value?.seconds
    ? new Date(value.seconds * 1000)
    : new Date(value);

  if (Number.isNaN(deliveredDate.getTime())) return false;

  const today = new Date();

  return (
    deliveredDate.getFullYear() === today.getFullYear() &&
    deliveredDate.getMonth() === today.getMonth() &&
    deliveredDate.getDate() === today.getDate()
  );
}

function formatDate(value) {
  if (!value) return "--";

  const date = value?.seconds ? new Date(value.seconds * 1000) : new Date(value);

  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTimeMs(value) {
  if (!value) return 0;
  if (value?.seconds) return value.seconds * 1000;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}