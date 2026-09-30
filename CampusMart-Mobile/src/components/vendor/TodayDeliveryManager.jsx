import { useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import {
  getSubscriptionsByVendor,
  updateSubscription,
} from "../../features/vendor/services/subscriptionService";
import {
  createDelivery,
  getTodayDeliveries,
  getTodayString,
} from "../../features/vendor/services/deliveryService";

export default function TodayDeliveryManager({ vendor }) {
  const [subscribers, setSubscribers] = useState([]);
  const [todayDeliveries, setTodayDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!vendor?.id) return;

    try {
      setLoading(true);

      const [subscriberList, deliveryList] = await Promise.all([
        getSubscriptionsByVendor(vendor.id),
        getTodayDeliveries(vendor.id),
      ]);

      const activeSubscribers = subscriberList.filter(
        (item) =>
          item.status !== "removed" &&
          item.status !== "cancelled" &&
          getRemainingDays(item.endDate) > 0
      );

      setSubscribers(activeSubscribers);
      setTodayDeliveries(deliveryList);
    } catch (err) {
      console.error("Failed to load deliveries:", err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [vendor?.id]);

  const stats = useMemo(() => {
    const delivered = subscribers.filter((item) =>
      isDeliveredToday(item, todayDeliveries)
    ).length;

    return {
      total: subscribers.length,
      delivered,
      pending: subscribers.length - delivered,
    };
  }, [subscribers, todayDeliveries]);

  async function markDelivered(subscriber) {
    try {
      const alreadyDelivered = isDeliveredToday(subscriber, todayDeliveries);

      if (alreadyDelivered) {
        alert("Already marked delivered today.");
        return;
      }

      await updateSubscription(subscriber.id, {
        lastDeliveredAt: Timestamp.now(),
        deliveryStatus: "delivered",
      });

      await createDelivery({
        vendorId: vendor.id,
        vendorType: vendor.vendorType || "tiffin",
        subscriptionId: subscriber.id,
        userId: subscriber.userId,
        customerName: subscriber.customerName || "Customer",
        customerPhone: subscriber.customerPhone || subscriber.phone || "",
        customerAddress:
          subscriber.customerAddress || subscriber.address || "",
        mealType: subscriber.mealType || "",
        mealPreference: subscriber.mealPreference || "veg",
        deliveryDate: getTodayString(),
        status: "delivered",
        deliveredAt: Timestamp.now(),
      });

      await loadData();
    } catch (err) {
      console.error("Mark delivered failed:", err);
      alert(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-white px-5 pb-24 pt-6">
      <header>
        <h1 className="text-[26px] font-black tracking-tight text-[#111111]">
          Today&apos;s Delivery
        </h1>

        <p className="mt-1 text-sm font-bold text-slate-500">
          Mark active subscribers as delivered.
        </p>
      </header>

      <section className="mt-6 grid grid-cols-3 gap-3">
        <Card title="Total" value={stats.total} />
        <Card title="Done" value={stats.delivered} />
        <Card title="Left" value={stats.pending} />
      </section>

      <section className="mt-6 space-y-3">
        {loading ? (
          <div className="rounded-[24px] border border-orange-100 bg-white py-10 text-center font-black text-slate-500">
            Loading deliveries...
          </div>
        ) : subscribers.length === 0 ? (
          <div className="rounded-[24px] border border-orange-100 bg-white py-10 text-center font-black text-slate-500">
            No delivery today
          </div>
        ) : (
          subscribers.map((subscriber, index) => {
            const done = isDeliveredToday(subscriber, todayDeliveries);

            return (
              <DeliveryCard
                key={subscriber.id}
                subscriber={subscriber}
                index={index}
                done={done}
                onDelivered={() => markDelivered(subscriber)}
              />
            );
          })
        )}
      </section>
    </div>
  );
}

function DeliveryCard({ subscriber, index, done, onDelivered }) {
  const phone = subscriber.customerPhone || subscriber.phone || "No phone";
  const address =
    subscriber.customerAddress || subscriber.address || "No address";

  return (
    <article className="rounded-[24px] border border-orange-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-4">
        <Avatar index={index} />

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[17px] font-black text-[#111111]">
            {subscriber.customerName || "Customer"}
          </h2>

          <p className="mt-1 text-sm font-bold text-slate-500">📞 {phone}</p>

          <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-700">
            📍 {address}
          </p>

          <p className="mt-2 text-xs font-black text-orange-600">
            {getPlanLabel(subscriber)} • {getPreferenceLabel(subscriber)}
          </p>
        </div>

        {done ? (
          <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-black text-green-700">
            ✓ Delivered
          </div>
        ) : (
          <button
            type="button"
            onClick={onDelivered}
            className="rounded-full bg-orange-600 px-5 py-3 text-sm font-black text-white"
          >
            Deliver
          </button>
        )}
      </div>
    </article>
  );
}

function Card({ title, value }) {
  return (
    <div className="rounded-[22px] bg-orange-50 p-4 text-center">
      <p className="text-sm font-black text-slate-500">{title}</p>
      <h2 className="mt-2 text-3xl font-black text-orange-600">{value}</h2>
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

function isDeliveredToday(subscriber, deliveries) {
  const today = getTodayString();

  return deliveries.some(
    (item) =>
      item.subscriptionId === subscriber.id &&
      item.deliveryDate === today &&
      item.status === "delivered"
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
  if (!endDate) return 0;

  const end = endDate?.seconds
    ? new Date(endDate.seconds * 1000)
    : new Date(endDate);

  if (Number.isNaN(end.getTime())) return 0;

  const today = new Date();
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

  return diff > 0 ? diff : 0;
}