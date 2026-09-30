import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { createSubscription } from "../features/vendor/services/subscriptionService";
import { createOrder } from "../features/vendor/services/orderService";

const MAAR_RANNA_VENDOR = {
  id: "maar-ranna",
  businessName: "Maa'r Ranna",
  vendorType: "tiffin",
};

const PLAN_OPTIONS = {
  LUNCH: {
    id: "lunch",
    title: "Lunch Only",
    emoji: "🍱",
    price: 1800,
    description: "Monthly lunch tiffin",
  },
  DINNER: {
    id: "dinner",
    title: "Dinner Only",
    emoji: "🌙",
    price: 1800,
    description: "Monthly dinner tiffin",
  },
  BOTH: {
    id: "lunch_dinner",
    title: "Lunch + Dinner",
    emoji: "🍱🌙",
    price: 3200,
    description: "Monthly lunch and dinner",
  },
};

export default function TiffinSubscribe() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [customerName, setCustomerName] = useState(
    currentUser?.displayName || ""
  );
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(PLAN_OPTIONS.LUNCH.id);
  const [mealPreference, setMealPreference] = useState("veg");
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const plan =
    Object.values(PLAN_OPTIONS).find((item) => item.id === selectedPlan) ||
    PLAN_OPTIONS.LUNCH;

  const price =
    mealPreference === "non-veg" ? Number(plan.price) + 400 : Number(plan.price);

  function getEndDate(dateString) {
    const date = new Date(dateString);
    date.setDate(date.getDate() + 30);
    return date;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!customerName.trim() || !phone.trim() || !address.trim() || !startDate) {
      alert("Please fill all required fields");
      return;
    }

    if (!currentUser) {
      alert("Please login first");
      return;
    }

    try {
      setSaving(true);

      const startTimestamp = Timestamp.fromDate(new Date(startDate));
      const endTimestamp = Timestamp.fromDate(getEndDate(startDate));

      const subscriptionId = await createSubscription({
        vendorId: MAAR_RANNA_VENDOR.id,
        vendorType: MAAR_RANNA_VENDOR.vendorType,
        userId: currentUser.uid,
        customerName: customerName.trim(),
        customerPhone: phone.trim(),
        customerAddress: address.trim(),
        planName: plan.title,
        mealType: selectedPlan,
        mealPreference,
        price,
        startDate: startTimestamp,
        endDate: endTimestamp,
        notes: notes.trim(),
      });

      await createOrder({
        vendorId: MAAR_RANNA_VENDOR.id,
        vendorType: MAAR_RANNA_VENDOR.vendorType,
        userId: currentUser.uid,
        subscriptionId,
        customerName: customerName.trim(),
        customerPhone: phone.trim(),
        customerAddress: address.trim(),
        items: [
          {
            name: `${plan.title} Monthly Tiffin`,
            mealType: selectedPlan,
            mealPreference,
            quantity: 1,
            price,
          },
        ],
        totalAmount: price,
        paymentStatus: "pending",
        deliveryDate: startTimestamp,
        notes: notes.trim(),
      });

      alert("Monthly subscription request submitted!");
      navigate("/tiffin");
    } catch (error) {
      console.error("Subscription submission failed:", error);
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fffaf5] text-slate-950 pb-24">
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-orange-100">
        <div className="px-4 py-4 flex items-center justify-between">
          <Link to="/tiffin" className="text-2xl font-black">
            ←
          </Link>

          <h1 className="text-xl font-black">Monthly Plan</h1>

          <span className="text-2xl">🍱</span>
        </div>
      </div>

      <main className="px-4 py-5 max-w-xl mx-auto">
        <section className="rounded-[30px] bg-gradient-to-r from-orange-100 to-yellow-50 border border-orange-200 p-6 shadow-lg">
          <div className="text-6xl">🍱</div>

          <h2 className="mt-4 text-3xl font-black text-orange-700">
            Subscribe Maa&apos;r Ranna
          </h2>

          <p className="mt-2 font-bold text-slate-700">
            Choose lunch, dinner, or both for monthly homemade tiffin service.
          </p>

          <div className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-sm font-black text-orange-700">
            Current Plan: ₹{price} / month
          </div>
        </section>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
          <InputBox
            label="Full Name *"
            value={customerName}
            onChange={setCustomerName}
            placeholder="Enter your name"
          />

          <InputBox
            label="Phone Number *"
            value={phone}
            onChange={setPhone}
            placeholder="Enter WhatsApp/mobile number"
            type="tel"
          />

          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
              Delivery Address *
            </label>

            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Hostel / PG / full delivery address"
              rows="4"
              className="w-full rounded-3xl border border-orange-100 bg-white px-4 py-4 font-bold outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
              Meal Plan *
            </label>

            <div className="grid gap-3">
              {Object.values(PLAN_OPTIONS).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedPlan(item.id)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    selectedPlan === item.id
                      ? "border-orange-500 bg-orange-50"
                      : "border-orange-100 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black">
                        {item.emoji} {item.title}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        {item.description}
                      </p>
                    </div>

                    <p className="text-lg font-black text-orange-600">
                      ₹{item.price}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
              Food Preference *
            </label>

            <div className="grid grid-cols-2 gap-3">
              <PreferenceButton
                active={mealPreference === "veg"}
                title="Veg"
                emoji="🌱"
                subtitle="Regular price"
                onClick={() => setMealPreference("veg")}
              />

              <PreferenceButton
                active={mealPreference === "non-veg"}
                title="Non-Veg"
                emoji="🍗"
                subtitle="+ ₹400/month"
                onClick={() => setMealPreference("non-veg")}
              />
            </div>
          </div>

          <InputBox
            label="Start Date *"
            value={startDate}
            onChange={setStartDate}
            type="date"
          />

          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Example: No onion, deliver after 1 PM..."
              rows="3"
              className="w-full rounded-3xl border border-orange-100 bg-white px-4 py-4 font-bold outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div className="rounded-3xl bg-white border border-orange-100 p-5 shadow-sm">
            <p className="text-sm font-black text-slate-500">Selected Plan</p>
            <h3 className="mt-2 text-xl font-black">
              {plan.emoji} {plan.title}
            </h3>
            <p className="mt-1 text-sm font-bold text-slate-500 capitalize">
              {mealPreference}
            </p>

            <div className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-center text-2xl font-black text-orange-600">
              ₹{price} / month
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-2 rounded-3xl bg-orange-600 px-5 py-4 text-lg font-black text-white shadow-lg shadow-orange-600/25 disabled:opacity-60"
          >
            {saving ? "Submitting..." : "Submit Subscription"}
          </button>
        </form>
      </main>
    </div>
  );
}

function InputBox({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-3xl border border-orange-100 bg-white px-4 py-4 font-bold outline-none focus:ring-2 focus:ring-orange-400"
      />
    </div>
  );
}

function PreferenceButton({ active, title, emoji, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border p-4 text-left font-black transition ${
        active
          ? "border-orange-500 bg-orange-50 text-orange-700"
          : "border-orange-100 bg-white text-slate-800"
      }`}
    >
      {emoji} {title}
      <span className="mt-1 block text-sm font-bold opacity-80">
        {subtitle}
      </span>
    </button>
  );
}