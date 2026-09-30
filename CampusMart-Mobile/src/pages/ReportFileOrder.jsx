import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import MyReportFileOrders from "./MyReportFileOrders";

export default function ReportFileOrder() {
  const PRICE_PER_FILE = 20;
  const { currentUser, userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState("order");
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [note, setNote] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  const totalAmount = useMemo(() => quantity * PRICE_PER_FILE, [quantity]);

  function decreaseQty() {
    setQuantity((q) => Math.max(1, q - 1));
  }

  function increaseQty() {
    setQuantity((q) => Math.min(50, q + 1));
  }

  async function placeOrder() {
    if (!currentUser) return alert("Please login first.");
    if (placingOrder) return;

    try {
      setPlacingOrder(true);

      await addDoc(collection(db, "reportFileOrders"), {
        userId: currentUser.uid,
        userName:
          userProfile?.name ||
          userProfile?.fullName ||
          currentUser.displayName ||
          "Student",
        userEmail: currentUser.email || "",
        userPhone: userProfile?.phone || userProfile?.mobile || "",
        serviceType: "report_file",
        itemName: "Premium A4 Report File",
        quantity,
        pricePerFile: PRICE_PER_FILE,
        totalAmount,
        paymentMethod,
        paymentStatus: paymentMethod === "COD" ? "Pending" : "Online Pending",
        pickupLocation: "Gabbar PG",
        pickupTiming: "10:00 AM - 8:00 PM",
        note: note.trim(),
        orderStatus: "Pending",
        createdAt: serverTimestamp(),
      });

      setQuantity(1);
      setPaymentMethod("COD");
      setNote("");
      setActiveTab("orders");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.log(error);
      alert("Order place nahi hua. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-950 dark:text-white pb-28">
      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6 py-4">
        <div className="sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-2 pb-3 bg-[#f8fafc]/90 dark:bg-slate-950/90 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <Link
              to="/home"
              className="h-11 w-11 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center font-black shadow-sm active:scale-95"
            >
              ←
            </Link>

            <div className="text-center">
              <h1 className="text-lg font-black leading-tight">Report File</h1>
              <p className="text-xs font-bold text-slate-500">₹20/file • Gabbar PG</p>
            </div>

            <button
              onClick={() => setActiveTab("orders")}
              className="h-11 w-11 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm"
            >
              📦
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 rounded-[22px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 shadow-sm">
            <button
              onClick={() => setActiveTab("order")}
              className={`rounded-[17px] py-3 text-sm font-black transition ${
                activeTab === "order"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                  : "text-slate-500"
              }`}
            >
              🛒 Order
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`rounded-[17px] py-3 text-sm font-black transition ${
                activeTab === "orders"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                  : "text-slate-500"
              }`}
            >
              📦 My Orders
            </button>
          </div>
        </div>

        {activeTab === "orders" ? (
          <MyReportFileOrders onOrderNow={() => setActiveTab("order")} />
        ) : (
          <>
            <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-blue-950 via-blue-700 to-blue-500 p-5 sm:p-7 text-white shadow-xl shadow-blue-900/20">
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex rounded-full bg-yellow-300 text-slate-950 px-3 py-1.5 text-xs font-black">
                      CampusMart Service
                    </span>

                    <h2 className="mt-4 text-3xl sm:text-5xl font-black leading-tight">
                      Premium A4 Report File
                    </h2>

                    <p className="mt-2 text-sm sm:text-base text-blue-100 font-semibold max-w-xl">
                      Order easily and collect from Gabbar PG.
                    </p>
                  </div>

                  <div className="h-16 w-16 shrink-0 rounded-[24px] bg-white/15 backdrop-blur flex items-center justify-center text-4xl shadow-lg">
                    📘
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <HeroMini label="Price" value="₹20" />
                  <HeroMini label="Payment" value="COD/UPI" />
                  <HeroMini label="Pickup" value="Gabbar PG" />
                </div>
              </div>

              <div className="absolute -right-8 -bottom-10 text-[130px] opacity-15">
                📄
              </div>
            </section>

            <section className="mt-4 rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black">Quantity</h3>
                  <p className="text-sm font-bold text-slate-500">₹20 per file</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={decreaseQty}
                    className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-2xl font-black active:scale-95"
                  >
                    -
                  </button>

                  <div className="min-w-[58px] text-center">
                    <p className="text-3xl font-black">{quantity}</p>
                  </div>

                  <button
                    onClick={increaseQty}
                    className="h-12 w-12 rounded-2xl bg-blue-600 text-white text-2xl font-black shadow-lg shadow-blue-600/25 active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-3xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-500">Total Amount</p>
                  <p className="text-3xl font-black text-blue-600">₹{totalAmount}</p>
                </div>
                <p className="font-black text-slate-600 dark:text-slate-300">
                  {quantity} × ₹20
                </p>
              </div>
            </section>

            <section className="mt-4 rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <h3 className="text-lg font-black mb-4">Payment</h3>

              <div className="grid gap-3">
                <PaymentOption
                  active={paymentMethod === "COD"}
                  title="Cash on Pickup"
                  text="Pay while collecting from Gabbar PG."
                  icon="💵"
                  onClick={() => setPaymentMethod("COD")}
                />

                <PaymentOption
                  active={paymentMethod === "ONLINE"}
                  title="Pay Online"
                  text="UPI / online payment option."
                  icon="💳"
                  onClick={() => setPaymentMethod("ONLINE")}
                />
              </div>
            </section>

            <section className="mt-4 rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-3xl">
                  📍
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-black">Gabbar PG</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    Pickup location for your report file.
                  </p>
                  <p className="mt-2 text-sm font-black text-blue-600">
                    10:00 AM - 8:00 PM
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-4 rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <h3 className="text-lg font-black mb-3">Additional Note</h3>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Example: Need black cover, urgent order..."
                rows="3"
                className="w-full resize-none rounded-3xl bg-slate-100 dark:bg-slate-800 px-4 py-4 outline-none font-bold placeholder:text-slate-400"
              />
            </section>

            <section className="mt-4 rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <button
                onClick={() => setShowDetails((v) => !v)}
                className="w-full flex items-center justify-between"
              >
                <span className="text-lg font-black">Details & Help</span>
                <span className="text-xl font-black">{showDetails ? "−" : "+"}</span>
              </button>

              {showDetails && (
                <div className="mt-5 grid gap-3">
                  <FeatureRow icon="⚡" title="Fast Ready" text="Prepared quickly for students." />
                  <FeatureRow icon="🏆" title="Premium Quality" text="Clean A4 report file finish." />
                  <FeatureRow icon="💰" title="Only ₹20" text="Affordable price for every student." />
                  <FeatureRow icon="☎️" title="Contact" text="Contact option will be added next." />
                </div>
              )}
            </section>

            <section className="mt-4 rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <h3 className="text-lg font-black mb-4">Order Summary</h3>

              <div className="space-y-4 text-sm font-bold">
                <SummaryRow label={`Report File × ${quantity}`} value={`₹${totalAmount}`} />
                <SummaryRow
                  label="Payment"
                  value={paymentMethod === "COD" ? "Cash on Pickup" : "Online"}
                />
                <SummaryRow label="Pickup" value="Gabbar PG" />

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-between text-xl font-black">
                  <span>Total</span>
                  <span className="text-blue-600">₹{totalAmount}</span>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {activeTab === "order" && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 p-4">
          <div className="mx-auto max-w-5xl flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs font-black text-slate-500">
                {quantity} file{quantity > 1 ? "s" : ""} selected
              </p>
              <p className="text-2xl font-black text-blue-600">₹{totalAmount}</p>
            </div>

            <button
              onClick={placeOrder}
              disabled={placingOrder}
              className="flex-1 rounded-2xl bg-blue-600 disabled:bg-blue-400 text-white py-4 font-black shadow-lg shadow-blue-600/25 active:scale-95"
            >
              {placingOrder ? "Placing..." : "Place Order →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HeroMini({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/15 backdrop-blur px-3 py-3">
      <p className="text-[11px] font-black text-blue-100">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function PaymentOption({ active, icon, title, text, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-3xl border p-4 transition active:scale-[0.98] ${
        active
          ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30 shadow-sm"
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>

        <div className="flex-1">
          <p className="font-black">{title}</p>
          <p className="text-sm font-bold text-slate-500">{text}</p>
        </div>

        <span className={`text-2xl ${active ? "text-blue-600" : "text-slate-400"}`}>
          {active ? "●" : "○"}
        </span>
      </div>
    </button>
  );
}

function FeatureRow({ icon, title, text }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-100 dark:bg-slate-800 p-4">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-black">{title}</p>
        <p className="text-sm font-bold text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-black text-right">{value}</span>
    </div>
  );
}