import { useState } from "react";
import { Link } from "react-router-dom";
import PGOwnerDashboardHome from "../components/pgOwner/PGOwnerDashboardHome";
import AddPG from "../components/pgOwner/AddPG";
import MyPGListings from "../components/pgOwner/MyPGListings";
import EditPG from "../components/pgOwner/EditPG";

const tabs = [
  {
    id: "dashboard",
    label: "Home",
    icon: "🏠",
  },
  {
    id: "add",
    label: "Add PG",
    icon: "➕",
  },
  {
    id: "listings",
    label: "My PGs",
    icon: "🏢",
  },
  {
    id: "status",
    label: "Status",
    icon: "📊",
  },
  {
    id: "settings",
    label: "Settings",
    icon: "⚙️",
  },
];

export default function PGOwnerDashboard() {
  const [activeTab, setActiveTab] =
    useState("dashboard");

  const [
    editingListing,
    setEditingListing,
  ] = useState(null);

  function changeTab(tabId) {
    if (tabId !== "edit") {
      setEditingListing(null);
    }

    setActiveTab(tabId);
  }

  function openEditListing(listing) {
    setEditingListing(listing);
    setActiveTab("edit");
  }

  function closeEditListing() {
    setEditingListing(null);
    setActiveTab("listings");
  }

  function handleEditSuccess() {
    setEditingListing(null);
    setActiveTab("listings");
  }

  function renderTab() {
    if (activeTab === "dashboard") {
      return (
        <PGOwnerDashboardHome
          setActiveTab={changeTab}
        />
      );
    }

    if (activeTab === "add") {
      return (
        <AddPG
          onSuccess={() =>
            changeTab("dashboard")
          }
        />
      );
    }

    if (activeTab === "listings") {
      return (
        <MyPGListings
          setActiveTab={changeTab}
          onEdit={openEditListing}
        />
      );
    }

    if (
      activeTab === "edit" &&
      editingListing
    ) {
      return (
        <EditPG
          listing={editingListing}
          onSuccess={handleEditSuccess}
          onCancel={closeEditListing}
        />
      );
    }

    if (activeTab === "status") {
      return (
        <StatusOverview
          setActiveTab={changeTab}
        />
      );
    }

    if (activeTab === "settings") {
      return (
        <ComingSoonSection
          icon="⚙️"
          title="PG Owner Settings"
          description="Business profile aur account settings yahan available hongi."
          buttonText="Go to Dashboard"
          onClick={() =>
            changeTab("dashboard")
          }
        />
      );
    }

    return (
      <PGOwnerDashboardHome
        setActiveTab={changeTab}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <div className="mx-auto min-h-screen max-w-[470px] bg-white shadow-2xl">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-blue-100 bg-white/95 px-4 py-3 backdrop-blur-xl">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black">
              🏠 PG Owner
            </h1>

            <p className="text-xs font-bold text-slate-500">
              CampusMart Dashboard
            </p>
          </div>

          <Link
            to="/home"
            className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            CampusMart
          </Link>
        </header>

        <main className="min-h-[calc(100vh-70px)] pb-28">
          {renderTab()}
        </main>

        <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[470px] -translate-x-1/2 border-t border-blue-100 bg-white/95 px-2 py-2 backdrop-blur-xl">
          <div className="grid grid-cols-5">
            {tabs.map((tab) => {
              const active =
                activeTab === tab.id ||
                (tab.id === "listings" &&
                  activeTab === "edit");

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    changeTab(tab.id)
                  }
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[10px] font-black transition ${
                    active
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-500"
                  }`}
                >
                  <span className="text-xl leading-none">
                    {tab.icon}
                  </span>

                  <span>
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

function StatusOverview({
  setActiveTab,
}) {
  return (
    <section className="px-4 py-6">
      <div>
        <p className="text-sm font-black text-blue-600">
          Approval tracking
        </p>

        <h2 className="mt-1 text-3xl font-black">
          Listing Status
        </h2>

        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          My PGs section me approved,
          pending aur rejected filters
          available hain.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <StatusCard
          icon="⏳"
          title="Pending"
          description="Listing admin review ka wait kar rahi hai."
          className="border-amber-200 bg-amber-50 text-amber-900"
        />

        <StatusCard
          icon="✅"
          title="Approved"
          description="Active listing public PG page par visible hogi."
          className="border-green-200 bg-green-50 text-green-900"
        />

        <StatusCard
          icon="⚠️"
          title="Rejected"
          description="Admin ka rejection reason My PGs me dikhega."
          className="border-red-200 bg-red-50 text-red-900"
        />
      </div>

      <button
        type="button"
        onClick={() =>
          setActiveTab("listings")
        }
        className="mt-6 w-full rounded-2xl bg-blue-600 py-4 font-black text-white shadow-lg shadow-blue-600/20"
      >
        Open My PG Listings
      </button>
    </section>
  );
}

function StatusCard({
  icon,
  title,
  description,
  className,
}) {
  return (
    <article
      className={`rounded-[24px] border p-5 ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="text-3xl">
          {icon}
        </div>

        <div>
          <h3 className="text-lg font-black">
            {title}
          </h3>

          <p className="mt-1 text-sm font-semibold leading-6 opacity-80">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}

function ComingSoonSection({
  icon,
  title,
  description,
  buttonText,
  onClick,
}) {
  return (
    <section className="px-4 py-8">
      <div className="rounded-[30px] border border-slate-200 bg-white p-7 text-center shadow-sm">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-4xl">
          {icon}
        </div>

        <h2 className="mt-5 text-2xl font-black">
          {title}
        </h2>

        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          {description}
        </p>

        <button
          type="button"
          onClick={onClick}
          className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 font-black text-white shadow-lg shadow-blue-600/20"
        >
          {buttonText}
        </button>
      </div>
    </section>
  );
}