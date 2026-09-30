import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getTodayDayId,
  getWeeklyMenu,
} from "../features/vendor/services/menuService";
import { DEFAULT_WEEKLY_MENU } from "../features/vendor/constants/menuConstants";
import { getVendorById } from "../features/vendor/services/vendorService";
import { getDeliveriesByUser } from "../features/vendor/services/deliveryService";
import { getSubscriptionsByUser } from "../features/vendor/services/subscriptionService";
import { useAuth } from "../context/AuthContext";

const VENDOR_ID = "maar-ranna";

const fallbackVendor = {
  businessName: "Maa'r Ranna",
  name: "Maa'r Ranna",
  tagline: "Ghar jaisa khana, har din.",
  city: "Asansol",
  area: "Asansol",
  deliveryArea: "Asansol",
  deliveryStatus: "Coming Soon",
  active: true,
  isOpen: true,
  whatsapp: "",
  phone: "",
  rating: "--",
  deliveryTime: "--",
};

export default function Tiffin() {
  const { currentUser } = useAuth();

  const [vendor, setVendor] = useState(fallbackVendor);
  const [weeklyMenu, setWeeklyMenu] = useState(DEFAULT_WEEKLY_MENU);
  const [deliveries, setDeliveries] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTiffinPage() {
      try {
        setLoading(true);

        const [vendorData, menuData] = await Promise.all([
          getVendorById(VENDOR_ID),
          getWeeklyMenu(VENDOR_ID),
        ]);

        if (vendorData) {
          setVendor({
            ...fallbackVendor,
            ...vendorData,
            name: vendorData.businessName || vendorData.name || "Maa'r Ranna",
          });
        }

        setWeeklyMenu(menuData || DEFAULT_WEEKLY_MENU);

        if (currentUser?.uid) {
          const [deliveryList, subscriptionList] = await Promise.all([
            getDeliveriesByUser(currentUser.uid),
            getSubscriptionsByUser(currentUser.uid),
          ]);

          setDeliveries(
            deliveryList.filter((item) => item.vendorId === VENDOR_ID)
          );

          setSubscriptions(
            subscriptionList.filter((item) => item.vendorId === VENDOR_ID)
          );
        }
      } catch (error) {
        console.error("Tiffin page load failed:", error);
        alert(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadTiffinPage();
  }, [currentUser?.uid]);

  const todayDayId = getTodayDayId();

  const todayMenu = useMemo(() => {
    return weeklyMenu?.[todayDayId] || DEFAULT_WEEKLY_MENU[todayDayId];
  }, [weeklyMenu, todayDayId]);

  const latestSubscription = useMemo(() => {
    if (!subscriptions.length) return null;

    return [...subscriptions].sort(
      (a, b) => getTimeMs(b.createdAt) - getTimeMs(a.createdAt)
    )[0];
  }, [subscriptions]);

  const deliveryHistory = useMemo(() => {
    return buildLastSevenDaysHistory(deliveries, subscriptions);
  }, [deliveries, subscriptions]);

  const whatsappNumber = vendor.whatsapp || vendor.phone || "";

  const whatsappLink = whatsappNumber
    ? `https://wa.me/91${whatsappNumber}?text=${encodeURIComponent(
        `Hello ${vendor.name || vendor.businessName}, I want to order tiffin.`
      )}`
    : "";

  return (
    <div className="min-h-screen bg-[#fffaf5] text-slate-950 pb-24">
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-orange-100">
        <div className="px-4 py-4 flex items-center justify-between">
          <Link to="/home" className="text-2xl font-black">
            ←
          </Link>

          <h1 className="text-xl font-black">Tiffin Service</h1>

          <span className="text-2xl">♡</span>
        </div>
      </div>

      <main className="px-4 py-5 max-w-5xl mx-auto">
        <section className="rounded-[30px] overflow-hidden bg-gradient-to-r from-orange-100 to-yellow-50 border border-orange-200 shadow-lg">
          <div className="p-6">
            <div className="text-6xl mb-4">🍱</div>

            <h2 className="text-4xl font-black text-orange-700">
              {vendor.name || vendor.businessName}
            </h2>

            <p className="mt-2 text-lg font-bold text-slate-700">
              {vendor.tagline || "Ghar jaisa khana, har din."}
            </p>

            <div className="mt-5 inline-flex px-4 py-2 rounded-full bg-orange-600 text-white font-black">
              {vendor.active === false || vendor.isOpen === false
                ? "Currently Closed"
                : "Fresh • Hygienic • Homemade"}
            </div>
          </div>
        </section>

        {loading && (
          <div className="mt-4 rounded-3xl bg-white border border-orange-100 p-4 text-center font-black text-orange-600">
            Loading Maa&apos;r Ranna...
          </div>
        )}

        <section className="mt-4 grid grid-cols-2 gap-3">
          <InfoCard
            icon="📍"
            title="Delivering in"
            value={vendor.deliveryArea || vendor.area || vendor.city}
          />

          <InfoCard
            icon="🛵"
            title="Delivery"
            value={vendor.deliveryStatus || "Coming Soon"}
          />
        </section>

        <SectionTitle
          title="Today's Menu"
          badge={vendor.isOpen === false ? "Closed" : "Available"}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MealMenuCard
            icon="🍱"
            title="Today's Lunch"
            meal={todayMenu?.lunch}
          />

          <MealMenuCard
            icon="🌙"
            title="Today's Dinner"
            meal={todayMenu?.dinner}
          />
        </div>

        <div className="mt-4 rounded-3xl bg-white border border-orange-100 p-4 text-center font-bold text-slate-600 shadow-sm">
          🔔 Menu changes daily. Please confirm availability before ordering.
        </div>

        <SectionTitle title="Our Plans" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PlanCard
            label="Daily Lunch"
            title="Lunch Tiffin"
            price={
              todayMenu?.lunch?.price
                ? `₹${todayMenu.lunch.price}`
                : "Price will be updated soon"
            }
          />

          <div className="space-y-3">
            <PlanCard
              label="Daily Dinner"
              title="Dinner Tiffin"
              price={
                todayMenu?.dinner?.price
                  ? `₹${todayMenu.dinner.price}`
                  : "Price will be updated soon"
              }
            />

            <Link
              to="/subscribe-tiffin"
              className="block w-full rounded-3xl bg-orange-600 py-4 text-center text-lg font-black text-white shadow-lg shadow-orange-600/30 transition hover:bg-orange-700"
            >
              🍱 Subscribe Monthly
            </Link>
          </div>
        </div>

        {currentUser && (
          <>
            <SectionTitle title="My Delivery History" />

            <section className="rounded-[28px] bg-white border border-orange-100 p-4 shadow-sm">
              {subscriptions.length === 0 ? (
                <div className="py-6 text-center">
                  <div className="text-5xl">📅</div>
                  <h3 className="mt-3 text-xl font-black">
                    No active subscription
                  </h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    Subscribe monthly to track daily delivery.
                  </p>
                </div>
              ) : latestSubscription?.status === "removed" ? (
                <div className="py-8 text-center">
                  <div className="text-6xl">🚫</div>

                  <h3 className="mt-4 text-2xl font-black text-red-600">
                    Subscription Removed
                  </h3>

                  <p className="mt-2 text-sm font-bold text-slate-500">
                    Your monthly subscription has been removed by the vendor.
                  </p>

                  <Link
                    to="/subscribe-tiffin"
                    className="mt-5 inline-block rounded-2xl bg-orange-600 px-6 py-3 text-sm font-black text-white"
                  >
                    Subscribe Again
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveryHistory.map((item) => (
                    <DeliveryHistoryRow key={item.date} item={item} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <section className="mt-5 rounded-[28px] bg-white border border-orange-100 p-4 shadow-sm">
          <div className="grid grid-cols-3 divide-x divide-slate-200 text-center">
            <Stat icon="⭐" value={vendor.rating || "--"} label="Ratings" />
            <Stat
              icon="🕒"
              value={vendor.deliveryTime || "--"}
              label="Delivery Time"
            />
            <Stat
              icon="📍"
              value={vendor.city || "Asansol"}
              label="Delivery Area"
            />
          </div>
        </section>

        <section className="mt-5 rounded-[28px] bg-green-50 border border-green-200 p-5 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black">Order on WhatsApp</h3>
            <p className="text-sm font-bold text-slate-600 mt-1">
              {whatsappNumber
                ? "Tap to order directly."
                : "Number will be updated soon."}
            </p>
          </div>

          {whatsappNumber ? (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3 rounded-2xl bg-green-600 text-white font-black shadow-lg"
            >
              Order
            </a>
          ) : (
            <button
              disabled
              className="px-5 py-3 rounded-2xl border border-green-500 text-green-700 font-black bg-white"
            >
              Coming Soon
            </button>
          )}
        </section>

        <SectionTitle title={`Why Choose ${vendor.name || "Maa'r Ranna"}?`} />

        <div className="grid grid-cols-2 gap-3">
          <WhyCard icon="🏠" text="Ghar jaisa taste" />
          <WhyCard icon="🛡️" text="Clean & hygienic" />
          <WhyCard icon="🍽️" text="Freshly cooked" />
          <WhyCard icon="❤️" text="Made with love" />
        </div>
      </main>
    </div>
  );
}

function SectionTitle({ title, badge }) {
  return (
    <div className="mt-7 mb-4 flex items-center justify-between">
      <h2 className="text-2xl font-black">{title}</h2>

      {badge && (
        <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-xs font-black">
          {badge}
        </span>
      )}
    </div>
  );
}

function InfoCard({ icon, title, value }) {
  return (
    <div className="rounded-3xl bg-white border border-orange-100 p-4 shadow-sm">
      <div className="text-3xl">{icon}</div>
      <p className="mt-2 text-xs font-bold text-slate-500">{title}</p>
      <h3 className="text-lg font-black">{value}</h3>
    </div>
  );
}

function MealMenuCard({ icon, title, meal }) {
  const isAvailable = meal?.available !== false;
  const items = meal?.items || [];

  return (
    <div
      className={`rounded-[26px] border p-5 shadow-sm ${
        isAvailable
          ? "bg-orange-50 border-orange-200 text-orange-700"
          : "bg-slate-50 border-slate-200 text-slate-500"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-4xl">{icon}</div>
          <h3 className="mt-4 text-xl font-black">{title}</h3>
          <p className="text-sm font-bold text-slate-600 mt-1">
            {isAvailable ? "Available today" : "Not available today"}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            isAvailable
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {isAvailable ? "OPEN" : "CLOSED"}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-dashed bg-white/70 px-4 py-3 text-sm font-black">
        {items.length > 0 ? (
          <ul className="space-y-1">
            {items.map((item, index) => (
              <li key={index}>• {item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-center">Menu will be updated soon</p>
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-center text-xl font-black text-orange-600">
        {meal?.price ? `₹${meal.price}` : "Price Soon"}
      </div>
    </div>
  );
}

function PlanCard({ label, title, price }) {
  return (
    <div className="rounded-[26px] bg-white border border-orange-100 p-5 shadow-sm">
      <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-xs font-black uppercase">
        {label}
      </span>

      <h3 className="mt-4 text-xl font-black">{title}</h3>

      <div className="mt-5 rounded-2xl border border-dashed border-orange-300 px-4 py-3 text-center text-orange-600 font-black">
        {price}
      </div>
    </div>
  );
}

function DeliveryHistoryRow({ item }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3">
      <div>
        <h3 className="text-sm font-black text-slate-900">
          {formatDateLabel(item.date)}
        </h3>
        <p className="mt-1 text-xs font-bold text-slate-500">
          {item.isFuture
            ? "Upcoming"
            : item.delivered
            ? "Delivered successfully"
            : "Not delivered"}
        </p>
      </div>

      <div
        className={`grid h-10 w-10 place-items-center rounded-full text-xl font-black ${
          item.isFuture
            ? "bg-slate-100 text-slate-400"
            : item.delivered
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-600"
        }`}
      >
        {item.isFuture ? "•" : item.delivered ? "✓" : "×"}
      </div>
    </div>
  );
}

function Stat({ icon, value, label }) {
  return (
    <div className="px-2">
      <div className="text-2xl">{icon}</div>
      <h3 className="mt-1 font-black">{value}</h3>
      <p className="text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function WhyCard({ icon, text }) {
  return (
    <div className="rounded-2xl bg-white border border-orange-100 p-4 font-black shadow-sm">
      <span className="mr-2">{icon}</span>
      {text}
    </div>
  );
}

function buildLastSevenDaysHistory(deliveries, subscriptions) {
  const activeSubscription =
    subscriptions.find((item) => item.status !== "removed") || subscriptions[0];

  const startDate = activeSubscription?.startDate
    ? toDate(activeSubscription.startDate)
    : null;

  const deliveredDates = new Set(
    deliveries
      .filter((item) => item.status === "delivered")
      .map((item) => item.deliveryDate)
  );

  const days = [];

  for (let i = 6; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    const dateString = toDateString(date);
    const isFuture = date > new Date();

    const isBeforeSubscription =
      startDate && stripTime(date) < stripTime(startDate);

    days.push({
      date: dateString,
      delivered: deliveredDates.has(dateString),
      isFuture,
      isBeforeSubscription,
    });
  }

  return days.filter((item) => !item.isBeforeSubscription);
}

function toDate(value) {
  if (!value) return null;

  if (value?.seconds) {
    return new Date(value.seconds * 1000);
  }

  return new Date(value);
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateString(date) {
  return date.toISOString().split("T")[0];
}

function formatDateLabel(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return dateString;

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