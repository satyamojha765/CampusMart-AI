import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import DashboardHome from "../components/vendor/DashboardHome";
import MenuManager from "../components/vendor/MenuManager";
import OrdersManager from "../components/vendor/OrdersManager";
import SubscribersManager from "../components/vendor/SubscribersManager";
import VendorSettings from "../components/vendor/VendorSettings";
import TodayDeliveryManager from "../components/vendor/TodayDeliveryManager";

import { useAuth } from "../context/AuthContext";

import {
  getAllVendors,
  getVendorById,
} from "../features/vendor/services/vendorService";

const ADMIN_EMAIL = "campusmart05@gmail.com";
const ADMIN_VENDOR_STORAGE_KEY =
  "campusmart_admin_selected_vendor";

export default function VendorDashboard() {
  const {
    currentUser,
    userProfile,
    checkingUser,
  } = useAuth();

  const [activeTab, setActiveTab] =
    useState("dashboard");

  const [vendors, setVendors] =
    useState([]);

  const [
    selectedVendorId,
    setSelectedVendorId,
  ] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const email = normalizeText(
    currentUser?.email
  );

  const role = normalizeText(
    userProfile?.role
  );

  const profileVendorId =
    normalizeVendorId(
      userProfile?.vendorId ||
        userProfile?.vendorID ||
        userProfile?.businessId ||
        ""
    );

  const isAdmin =
    email === ADMIN_EMAIL ||
    role === "admin" ||
    role === "superadmin" ||
    role === "super-admin" ||
    userProfile?.isAdmin === true ||
    userProfile?.admin === true;

  const loadDashboard = useCallback(async () => {
    if (checkingUser) {
      return;
    }

    if (!currentUser) {
      setLoading(false);
      setError("Please login first.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (isAdmin) {
        const allVendors = await getAllVendors();

        const tiffinVendors = allVendors
          .filter(isTiffinVendor)
          .map(normalizeVendor);

        setVendors(tiffinVendors);

        if (!tiffinVendors.length) {
          setSelectedVendorId("");
          setError(
            "Firestore vendors collection mein koi tiffin vendor nahi mila."
          );
          return;
        }

        const savedVendorId =
          normalizeVendorId(
            localStorage.getItem(
              ADMIN_VENDOR_STORAGE_KEY
            )
          );

        const selectedExists =
          tiffinVendors.some(
            (vendorItem) =>
              vendorItem.id === savedVendorId
          );

        const nextVendorId =
          selectedExists
            ? savedVendorId
            : tiffinVendors.some(
                (vendorItem) =>
                  vendorItem.id === "maar-ranna"
              )
            ? "maar-ranna"
            : tiffinVendors[0].id;

        setSelectedVendorId(nextVendorId);

        localStorage.setItem(
          ADMIN_VENDOR_STORAGE_KEY,
          nextVendorId
        );

        return;
      }

      if (role !== "vendor") {
        setVendors([]);
        setSelectedVendorId("");
        setError(
          "Is account ko vendor access nahi mila hai."
        );
        return;
      }

      if (!profileVendorId) {
        setVendors([]);
        setSelectedVendorId("");
        setError(
          "users document mein vendorId assigned nahi hai."
        );
        return;
      }

      const vendorData = await getVendorById(
        profileVendorId
      );

      if (!vendorData) {
        setVendors([]);
        setSelectedVendorId("");
        setError(
          `vendors/${profileVendorId} document nahi mila.`
        );
        return;
      }

      const normalizedVendor =
        normalizeVendor(vendorData);

      setVendors([normalizedVendor]);
      setSelectedVendorId(
        normalizedVendor.id
      );
    } catch (loadError) {
      console.error(
        "Vendor dashboard load failed:",
        loadError
      );

      setVendors([]);
      setSelectedVendorId("");
      setError(
        loadError?.message ||
          "Vendor dashboard load nahi hua."
      );
    } finally {
      setLoading(false);
    }
  }, [
    checkingUser,
    currentUser,
    isAdmin,
    profileVendorId,
    role,
  ]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const selectedVendor =
    useMemo(() => {
      return (
        vendors.find(
          (vendorItem) =>
            vendorItem.id ===
            selectedVendorId
        ) || null
      );
    }, [
      vendors,
      selectedVendorId,
    ]);

  function handleVendorChange(event) {
    const nextVendorId =
      normalizeVendorId(
        event.target.value
      );

    setSelectedVendorId(nextVendorId);
    setActiveTab("dashboard");

    localStorage.setItem(
      ADMIN_VENDOR_STORAGE_KEY,
      nextVendorId
    );
  }

  function handleVendorUpdated(
    updatedVendor
  ) {
    if (!updatedVendor?.id) {
      return;
    }

    const normalizedUpdatedVendor =
      normalizeVendor(updatedVendor);

    setVendors((currentVendors) =>
      currentVendors.map(
        (vendorItem) =>
          vendorItem.id ===
          normalizedUpdatedVendor.id
            ? {
                ...vendorItem,
                ...normalizedUpdatedVendor,
              }
            : vendorItem
      )
    );
  }

  const tabs = [
    {
      id: "dashboard",
      label: "Home",
      icon: "🏠",
    },
    {
      id: "orders",
      label: "Orders",
      icon: "📦",
    },
    {
      id: "delivery",
      label: "Delivery",
      icon: "🚚",
    },
    {
      id: "subscribers",
      label: "Subs",
      icon: "👥",
    },
    {
      id: "menu",
      label: "Menu",
      icon: "🍱",
    },
    {
      id: "settings",
      label: "Settings",
      icon: "⚙️",
    },
  ];

  function renderActiveTab() {
    if (!selectedVendor) {
      return null;
    }

    if (activeTab === "dashboard") {
      return (
        <DashboardHome
          key={`dashboard-${selectedVendor.id}`}
          vendor={selectedVendor}
          setActiveTab={setActiveTab}
        />
      );
    }

    if (activeTab === "orders") {
      return (
        <OrdersManager
          key={`orders-${selectedVendor.id}`}
          vendor={selectedVendor}
        />
      );
    }

    if (activeTab === "delivery") {
      return (
        <TodayDeliveryManager
          key={`delivery-${selectedVendor.id}`}
          vendor={selectedVendor}
        />
      );
    }

    if (activeTab === "subscribers") {
      return (
        <SubscribersManager
          key={`subscribers-${selectedVendor.id}`}
          vendor={selectedVendor}
        />
      );
    }

    if (activeTab === "menu") {
      return (
        <MenuManager
          key={`menu-${selectedVendor.id}`}
          vendor={selectedVendor}
        />
      );
    }

    if (activeTab === "settings") {
      return (
        <VendorSettings
          key={`settings-${selectedVendor.id}`}
          vendor={selectedVendor}
          onVendorUpdated={
            handleVendorUpdated
          }
        />
      );
    }

    return null;
  }

  if (checkingUser || loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f4ef] px-5">
        <div className="rounded-[28px] bg-white p-7 text-center shadow-xl">
          <div className="text-6xl">🍱</div>

          <h2 className="mt-4 text-xl font-black">
            Loading Vendor Dashboard
          </h2>
        </div>
      </div>
    );
  }

  if (!selectedVendor) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f4ef] px-5">
        <div className="w-full max-w-md rounded-[28px] bg-white p-7 text-center shadow-xl">
          <div className="text-6xl">⚠️</div>

          <h1 className="mt-4 text-2xl font-black text-red-600">
            Dashboard Not Available
          </h1>

          <p className="mt-3 text-sm font-bold text-slate-600">
            {error}
          </p>

          <Link
            to="/home"
            className="mt-6 block rounded-2xl bg-blue-600 px-5 py-4 font-black text-white"
          >
            Back to CampusMart
          </Link>
        </div>
      </div>
    );
  }

  const vendorName =
    selectedVendor.businessName ||
    selectedVendor.name ||
    "Tiffin Vendor";

  return (
    <div className="min-h-screen bg-[#f8f4ef] text-slate-950">
      <div className="mx-auto min-h-screen max-w-[430px] bg-white shadow-2xl">
        <header className="sticky top-0 z-40 border-b border-orange-100 bg-white">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-black">
                  🍱 {vendorName}
                </h1>

                {isAdmin && (
                  <span className="rounded-full bg-purple-100 px-2 py-1 text-[9px] font-black uppercase text-purple-700">
                    Admin Mode
                  </span>
                )}
              </div>

              <p className="text-xs font-bold text-slate-500">
                {isAdmin
                  ? "All Vendor Management"
                  : "Vendor Dashboard"}
              </p>
            </div>

            <Link
              to="/home"
              className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white"
            >
              Home
            </Link>
          </div>

          {isAdmin && (
            <section className="border-t border-purple-100 bg-purple-50 px-4 py-4">
              <label className="text-xs font-black uppercase text-purple-700">
                Change Vendor
              </label>

              <select
                value={selectedVendorId}
                onChange={handleVendorChange}
                className="mt-2 w-full rounded-2xl border-2 border-purple-300 bg-white px-4 py-4 text-base font-black outline-none"
              >
                {vendors.map(
                  (vendorItem) => (
                    <option
                      key={vendorItem.id}
                      value={vendorItem.id}
                    >
                      {
                        vendorItem.businessName
                      }
                    </option>
                  )
                )}
              </select>

              <p className="mt-2 break-all text-[11px] font-bold text-slate-500">
                Editing: vendors/
                {selectedVendor.id}
              </p>
            </section>
          )}
        </header>

        <main className="pb-24">
          {renderActiveTab()}
        </main>

        <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-orange-100 bg-white/95 backdrop-blur-xl">
          <div className="grid grid-cols-6 px-1 py-2">
            {tabs.map((tab) => {
              const active =
                activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveTab(tab.id)
                  }
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[9px] font-black ${
                    active
                      ? "bg-orange-50 text-orange-600"
                      : "text-slate-600"
                  }`}
                >
                  <span className="text-lg">
                    {tab.icon}
                  </span>

                  <span className="w-full truncate text-center">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

function isTiffinVendor(
  vendor = {}
) {
  const vendorType = normalizeText(
    vendor.vendorType ||
      vendor.category ||
      vendor.serviceType ||
      "tiffin"
  );

  return vendorType === "tiffin";
}

function normalizeVendor(
  vendor = {}
) {
  const businessName =
    vendor.businessName ||
    vendor.name ||
    vendor.vendorName ||
    "Tiffin Vendor";

  return {
    ...vendor,

    id: normalizeVendorId(
      vendor.id
    ),

    businessName,

    name: businessName,

    vendorType:
      vendor.vendorType ||
      vendor.category ||
      "tiffin",

    active:
      vendor.active !== false,

    isOpen:
      vendor.isOpen !== false,
  };
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeVendorId(value) {
  return normalizeText(value)
    .replace(/[–—]/g, "-")
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}