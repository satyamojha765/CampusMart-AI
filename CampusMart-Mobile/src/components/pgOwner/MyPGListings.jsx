import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

const filters = [
  {
    id: "all",
    label: "All",
  },
  {
    id: "approved",
    label: "Approved",
  },
  {
    id: "pending",
    label: "Pending",
  },
  {
    id: "rejected",
    label: "Rejected",
  },
];

export default function MyPGListings({
  setActiveTab,
  onEdit,
}) {
  const { currentUser } = useAuth();

  const [listings, setListings] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const [updatingId, setUpdatingId] = useState("");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    if (!currentUser) {
      setListings([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const listingsQuery = query(
      collection(db, "pgs"),
      where("ownerId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      listingsQuery,
      (snapshot) => {
        const list = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .sort((a, b) => {
            const timeA =
              a.createdAt?.seconds ||
              a.createdAt?.toMillis?.() ||
              0;

            const timeB =
              b.createdAt?.seconds ||
              b.createdAt?.toMillis?.() ||
              0;

            return timeB - timeA;
          });

        setListings(list);
        setLoading(false);
      },
      (error) => {
        console.error("My PG listings error:", error);
        setListings([]);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  const filteredListings = useMemo(() => {
    if (activeFilter === "all") {
      return listings;
    }

    return listings.filter(
      (item) =>
        (item.approvalStatus || "pending") ===
        activeFilter
    );
  }, [listings, activeFilter]);

  const counts = useMemo(() => {
    return {
      all: listings.length,

      approved: listings.filter(
        (item) =>
          item.approvalStatus === "approved"
      ).length,

      pending: listings.filter(
        (item) =>
          (item.approvalStatus || "pending") ===
          "pending"
      ).length,

      rejected: listings.filter(
        (item) =>
          item.approvalStatus === "rejected"
      ).length,
    };
  }, [listings]);

  const analytics = useMemo(() => {
    return {
      views: listings.reduce(
        (total, item) =>
          total + (Number(item.views) || 0),
        0
      ),

      saves: listings.reduce(
        (total, item) =>
          total + (Number(item.wishlistCount) || 0),
        0
      ),

      contacts: listings.reduce(
        (total, item) =>
          total + (Number(item.contactCount) || 0),
        0
      ),
    };
  }, [listings]);

  async function toggleListingStatus(item) {
    if (
      !currentUser ||
      updatingId ||
      item.ownerId !== currentUser.uid
    ) {
      return;
    }

    try {
      setUpdatingId(item.id);

      await updateDoc(doc(db, "pgs", item.id), {
        active: item.active === false,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error(
        "PG active status update error:",
        error
      );

      alert(error.message);
    } finally {
      setUpdatingId("");
    }
  }

  async function deleteListing(item) {
    if (
      !currentUser ||
      deletingId ||
      item.ownerId !== currentUser.uid
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Kya aap "${
        item.name || "is PG"
      }" ko permanently delete karna chahte hain?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(item.id);
      await deleteDoc(doc(db, "pgs", item.id));
    } catch (error) {
      console.error("PG delete error:", error);
      alert(error.message);
    } finally {
      setDeletingId("");
    }
  }

  function handleEdit(item) {
    if (onEdit) {
      onEdit(item);
      return;
    }

    alert("Edit form unavailable");
  }

  return (
    <section className="px-4 py-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black text-blue-600">
            Property management
          </p>

          <h2 className="mt-1 text-3xl font-black tracking-tight">
            My PG Listings
          </h2>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Listings aur student interest realtime manage
            karo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab("add")}
          className="shrink-0 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20"
        >
          + Add PG
        </button>
      </div>

      {!loading && listings.length > 0 && (
        <div className="mt-5 grid grid-cols-3 gap-2">
          <SummaryAnalytics
            icon="👁"
            label="Views"
            value={analytics.views}
          />

          <SummaryAnalytics
            icon="❤️"
            label="Saves"
            value={analytics.saves}
          />

          <SummaryAnalytics
            icon="📞"
            label="Contacts"
            value={analytics.contacts}
          />
        </div>
      )}

      <div className="mt-6 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map((filter) => {
          const active = activeFilter === filter.id;

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() =>
                setActiveFilter(filter.id)
              }
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-3 text-sm font-black transition ${
                active
                  ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              <span>{filter.label}</span>

              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {counts[filter.id]}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <ListingsSkeleton />
      ) : filteredListings.length === 0 ? (
        <EmptyListings
          activeFilter={activeFilter}
          setActiveTab={setActiveTab}
        />
      ) : (
        <div className="mt-5 space-y-4">
          {filteredListings.map((item) => (
            <ListingCard
              key={item.id}
              item={item}
              updating={updatingId === item.id}
              deleting={deletingId === item.id}
              onToggle={() =>
                toggleListingStatus(item)
              }
              onDelete={() =>
                deleteListing(item)
              }
              onEdit={() =>
                handleEdit(item)
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ListingCard({
  item,
  updating,
  deleting,
  onToggle,
  onDelete,
  onEdit,
}) {
  const image =
    item.images?.[0] ||
    item.image ||
    "";

  const status =
    item.approvalStatus || "pending";

  const statusConfig = {
    approved: {
      label: "Approved",
      icon: "✓",
      className:
        "bg-green-50 text-green-700 border-green-200",
    },

    pending: {
      label: "Pending",
      icon: "⏳",
      className:
        "bg-amber-50 text-amber-700 border-amber-200",
    },

    rejected: {
      label: "Rejected",
      icon: "!",
      className:
        "bg-red-50 text-red-700 border-red-200",
    },
  };

  const currentStatus =
    statusConfig[status] ||
    statusConfig.pending;

  const sharing = Array.isArray(item.sharing)
    ? item.sharing
        .map(capitalize)
        .join(" / ")
    : capitalize(item.sharing || "Flexible");

  const isActive = item.active !== false;

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
        {image ? (
          <img
            src={image}
            alt={item.name || "PG"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-7xl">
            🏠
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
          <span
            className={`rounded-full border px-3 py-1.5 text-xs font-black shadow-sm ${currentStatus.className}`}
          >
            {currentStatus.icon}{" "}
            {currentStatus.label}
          </span>

          <span
            className={`rounded-full px-3 py-1.5 text-xs font-black shadow-sm ${
              isActive
                ? "bg-green-600 text-white"
                : "bg-slate-800 text-white"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>

        {Number(item.availableBeds) > 0 && (
          <span className="absolute bottom-3 left-3 rounded-full bg-slate-950/80 px-3 py-1.5 text-xs font-black text-white backdrop-blur">
            🛏 {item.availableBeds} beds available
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-black">
              {item.name || "Student PG"}
            </h3>

            <p className="mt-1 truncate text-sm font-semibold text-slate-500">
              📍{" "}
              {item.location ||
                item.city ||
                "Asansol"}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-xl font-black text-blue-600">
              ₹
              {Number(
                item.rent || 0
              ).toLocaleString("en-IN")}
            </p>

            <p className="text-[10px] font-bold text-slate-400">
              per month
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black capitalize text-blue-700">
            {item.gender || "Students"}
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
            {sharing}
          </span>

          {item.foodIncluded && (
            <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-700">
              🍛 Food
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-[20px] bg-slate-50 p-3">
          <ListingAnalytics
            icon="👁"
            label="Views"
            value={item.views}
          />

          <ListingAnalytics
            icon="❤️"
            label="Saves"
            value={item.wishlistCount}
          />

          <ListingAnalytics
            icon="📞"
            label="Contacts"
            value={item.contactCount}
          />
        </div>

        {(Number(item.callCount) > 0 ||
          Number(item.whatsappCount) > 0) && (
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
            <p className="text-xs font-bold text-slate-500">
              Contact breakdown
            </p>

            <div className="flex gap-3 text-xs font-black">
              <span className="text-blue-600">
                📞 {formatNumber(item.callCount)}
              </span>

              <span className="text-green-600">
                💬 {formatNumber(item.whatsappCount)}
              </span>
            </div>
          </div>
        )}

        {status === "pending" && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">⏳</span>

              <div>
                <p className="text-sm font-black text-amber-900">
                  Waiting for admin approval
                </p>

                <p className="mt-1 text-xs font-semibold leading-5 text-amber-700">
                  Approval ke baad listing public PG page
                  par show hogi.
                </p>
              </div>
            </div>
          </div>
        )}

        {status === "rejected" && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>

              <div>
                <p className="text-sm font-black text-red-900">
                  Listing rejected
                </p>

                <p className="mt-1 text-xs font-semibold leading-5 text-red-700">
                  {item.rejectionReason ||
                    item.rejectReason ||
                    "Admin ne rejection reason provide nahi kiya."}
                </p>
              </div>
            </div>
          </div>
        )}

        {status === "approved" &&
          !isActive && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-black text-slate-700">
                Listing hidden hai
              </p>

              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                Active karne ke baad ye public PG page
                par dobara show hogi.
              </p>
            </div>
          )}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-2xl bg-blue-50 px-3 py-3 text-sm font-black text-blue-700 transition active:scale-95"
          >
            ✏️ Edit
          </button>

          <button
            type="button"
            onClick={onToggle}
            disabled={updating}
            className={`rounded-2xl px-3 py-3 text-sm font-black transition active:scale-95 disabled:opacity-60 ${
              isActive
                ? "bg-amber-50 text-amber-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {updating
              ? "Updating..."
              : isActive
              ? "⏸ Make Inactive"
              : "▶ Make Active"}
          </button>

          {status === "approved" ? (
            <Link
              to={`/pg/${item.id}`}
              className="rounded-2xl bg-slate-100 px-3 py-3 text-center text-sm font-black text-slate-700 transition active:scale-95"
            >
              👁 View Public
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="rounded-2xl bg-slate-100 px-3 py-3 text-sm font-black text-slate-400"
            >
              👁 Not Public
            </button>
          )}

          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="rounded-2xl bg-red-50 px-3 py-3 text-sm font-black text-red-600 transition active:scale-95 disabled:opacity-60"
          >
            {deleting
              ? "Deleting..."
              : "🗑 Delete"}
          </button>
        </div>
      </div>
    </article>
  );
}

function SummaryAnalytics({
  icon,
  label,
  value,
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white p-3 text-center shadow-sm">
      <p className="text-xl">
        {icon}
      </p>

      <p className="mt-1 text-lg font-black">
        {formatNumber(value)}
      </p>

      <p className="text-[9px] font-bold uppercase text-slate-400">
        {label}
      </p>
    </div>
  );
}

function ListingAnalytics({
  icon,
  label,
  value,
}) {
  return (
    <div className="text-center">
      <p className="text-base">
        {icon}
      </p>

      <p className="mt-1 text-sm font-black">
        {formatNumber(value)}
      </p>

      <p className="text-[9px] font-bold text-slate-400">
        {label}
      </p>
    </div>
  );
}

function EmptyListings({
  activeFilter,
  setActiveTab,
}) {
  const filteredEmpty =
    activeFilter !== "all";

  return (
    <div className="mt-6 rounded-[30px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div className="text-6xl">
        {filteredEmpty ? "🔍" : "🏠"}
      </div>

      <h3 className="mt-5 text-2xl font-black">
        {filteredEmpty
          ? `No ${activeFilter} listings`
          : "No PG listing yet"}
      </h3>

      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {filteredEmpty
          ? "Dusra filter select karke listings check karo."
          : "Apna pehla PG add karke admin approval ke liye submit karo."}
      </p>

      {!filteredEmpty && (
        <button
          type="button"
          onClick={() =>
            setActiveTab("add")
          }
          className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 font-black text-white shadow-lg shadow-blue-600/20"
        >
          + Add Your First PG
        </button>
      )}
    </div>
  );
}

function ListingsSkeleton() {
  return (
    <div className="mt-5 space-y-4">
      {Array.from({ length: 3 }).map(
        (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[28px] border border-slate-200 bg-white"
          >
            <div className="aspect-[16/9] animate-pulse bg-slate-200" />

            <div className="space-y-4 p-4">
              <div className="h-6 w-1/2 animate-pulse rounded-full bg-slate-200" />
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />

              <div className="h-20 animate-pulse rounded-2xl bg-slate-200" />

              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: 4 }).map(
                  (_, buttonIndex) => (
                    <div
                      key={buttonIndex}
                      className="h-11 animate-pulse rounded-2xl bg-slate-200"
                    />
                  )
                )}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function capitalize(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}