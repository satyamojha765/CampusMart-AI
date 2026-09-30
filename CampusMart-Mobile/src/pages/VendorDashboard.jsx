import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DashboardHome from "../components/vendor/DashboardHome";
import MenuManager from "../components/vendor/MenuManager";
import OrdersManager from "../components/vendor/OrdersManager";
import SubscribersManager from "../components/vendor/SubscribersManager";
import VendorSettings from "../components/vendor/VendorSettings";
import TodayDeliveryManager from "../components/vendor/TodayDeliveryManager";

const MAAR_RANNA_VENDOR = {
  id: "maar-ranna",
  businessName: "Maa'r Ranna",
  vendorType: "tiffin",
  area: "Asansol, West Bengal",
};

export default function VendorDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const vendor = useMemo(() => MAAR_RANNA_VENDOR, []);

  const tabs = [
    { id: "dashboard", label: "Home", icon: "🏠" },
    { id: "orders", label: "Orders", icon: "📦" },
    { id: "delivery", label: "Delivery", icon: "🚚" },
    { id: "subscribers", label: "Subs", icon: "👥" },
    { id: "menu", label: "Menu", icon: "🍱" },
  ];

  function renderTab() {
    if (activeTab === "dashboard") {
      return <DashboardHome vendor={vendor} setActiveTab={setActiveTab} />;
    }

    if (activeTab === "orders") {
      return <OrdersManager vendor={vendor} />;
    }

    if (activeTab === "delivery") {
      return <TodayDeliveryManager vendor={vendor} />;
    }

    if (activeTab === "subscribers") {
      return <SubscribersManager vendor={vendor} />;
    }

    if (activeTab === "menu") {
      return <MenuManager vendor={vendor} />;
    }

    if (activeTab === "settings") {
      return <VendorSettings vendor={vendor} />;
    }

    return <DashboardHome vendor={vendor} setActiveTab={setActiveTab} />;
  }

  return (
    <div className="min-h-screen bg-[#f8f4ef] text-[#111111]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-white shadow-2xl">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-orange-100 bg-white px-4 py-3">
  <div>
    <h1 className="text-lg font-black">🍱 Maa'r Ranna</h1>
    <p className="text-xs font-bold text-slate-500">
      Vendor Dashboard
    </p>
  </div>

  <Link
    to="/home"
    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700 transition"
  >
    🏠 CampusMart
  </Link>
</header>

        <main className="pb-24">{renderTab()}</main>

        <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-orange-100 bg-white/95 backdrop-blur-xl">
          <div className="grid grid-cols-5 px-2 py-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[10px] font-black transition ${
                    active
                      ? "bg-orange-50 text-orange-600"
                      : "text-slate-600"
                  }`}
                >
                  <span className="text-xl leading-none">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}