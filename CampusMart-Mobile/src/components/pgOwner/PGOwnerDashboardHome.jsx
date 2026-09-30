import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

export default function PGOwnerDashboardHome({
  setActiveTab,
}) {
  const { currentUser } = useAuth();

  const [listings, setListings] = useState([]);
  const [viewRecords, setViewRecords] = useState([]);

  const [listingsLoading, setListingsLoading] = useState(true);
  const [viewsLoading, setViewsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setListings([]);
      setListingsLoading(false);
      return;
    }

    setListingsLoading(true);

    const listingsQuery = query(
      collection(db, "pgs"),
      where("ownerId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      listingsQuery,
      (snapshot) => {
        const list = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setListings(list);
        setListingsLoading(false);
      },
      (error) => {
        console.error("PG dashboard listings error:", error);
        setListings([]);
        setListingsLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setViewRecords([]);
      setViewsLoading(false);
      return;
    }

    setViewsLoading(true);

    const viewsQuery = query(
      collection(db, "pgViews"),
      where("ownerId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      viewsQuery,
      (snapshot) => {
        const views = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setViewRecords(views);
        setViewsLoading(false);
      },
      (error) => {
        console.error("PG views load error:", error);
        setViewRecords([]);
        setViewsLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  const viewsByPG = useMemo(() => {
    return viewRecords.reduce((result, view) => {
      if (!view.pgId) {
        return result;
      }

      result[view.pgId] = (result[view.pgId] || 0) + 1;

      return result;
    }, {});
  }, [viewRecords]);

  const listingsWithAnalytics = useMemo(() => {
    return listings.map((item) => ({
      ...item,
      uniqueViews: viewsByPG[item.id] || 0,
    }));
  }, [listings, viewsByPG]);

  const stats = useMemo(() => {
    const approved = listingsWithAnalytics.filter(
      (item) => item.approvalStatus === "approved"
    ).length;

    const pending = listingsWithAnalytics.filter(
      (item) =>
        (item.approvalStatus || "pending") === "pending"
    ).length;

    const rejected = listingsWithAnalytics.filter(
      (item) => item.approvalStatus === "rejected"
    ).length;

    const inactive = listingsWithAnalytics.filter(
      (item) => item.active === false
    ).length;

    const totalWishlist = listingsWithAnalytics.reduce(
      (total, item) =>
        total + (Number(item.wishlistCount) || 0),
      0
    );

    const totalContacts = listingsWithAnalytics.reduce(
      (total, item) =>
        total + (Number(item.contactCount) || 0),
      0
    );

    const totalCalls = listingsWithAnalytics.reduce(
      (total, item) =>
        total + (Number(item.callCount) || 0),
      0
    );

    const totalWhatsApp = listingsWithAnalytics.reduce(
      (total, item) =>
        total + (Number(item.whatsappCount) || 0),
      0
    );

    return {
      total: listingsWithAnalytics.length,
      approved,
      pending,
      rejected,
      inactive,

      totalViews: viewRecords.length,
      totalWishlist,
      totalContacts,
      totalCalls,
      totalWhatsApp,
    };
  }, [listingsWithAnalytics, viewRecords]);

  const recentListings = useMemo(() => {
    return [...listingsWithAnalytics]
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
      })
      .slice(0, 3);
  }, [listingsWithAnalytics]);

  const bestPerformingListing = useMemo(() => {
    if (listingsWithAnalytics.length === 0) {
      return null;
    }

    return [...listingsWithAnalytics].sort((a, b) => {
      const scoreA =
        (Number(a.uniqueViews) || 0) +
        (Number(a.wishlistCount) || 0) * 3 +
        (Number(a.contactCount) || 0) * 5;

      const scoreB =
        (Number(b.uniqueViews) || 0) +
        (Number(b.wishlistCount) || 0) * 3 +
        (Number(b.contactCount) || 0) * 5;

      return scoreB - scoreA;
    })[0];
  }, [listingsWithAnalytics]);

  const loading = listingsLoading || viewsLoading;

  return (
    <div className="px-4 py-5">
      <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-blue-950 via-blue-700 to-blue-500 p-6 text-white shadow-xl shadow-blue-900/20">
        <div className="absolute -right-14 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />

        <div className="relative z-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-300">
            PG Management
          </p>

          <h2 className="mt-2 text-3xl font-black leading-tight">
            Manage your PG
            <br />
            from one place.
          </h2>

          <p className="mt-3 max-w-[270px] text-sm font-semibold leading-6 text-blue-100">
            Listings manage karo aur students ka interest
            realtime track karo.
          </p>

          <button
            type="button"
            onClick={() => setActiveTab("add")}
            className="mt-5 rounded-2xl bg-yellow-400 px-5 py-3 font-black text-slate-950 shadow-lg"
          >
            + Add New PG
          </button>
        </div>

        <div className="absolute bottom-4 right-3 text-7xl">
          🏠
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-black text-blue-600">
              Performance
            </p>

            <h3 className="mt-1 text-2xl font-black">
              Your analytics
            </h3>
          </div>

          {!loading && (
            <p className="text-xs font-bold text-slate-400">
              Realtime
            </p>
          )}
        </div>

        {loading ? (
          <AnalyticsSkeleton />
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <AnalyticsCard
              icon="👁"
              label="Unique Views"
              value={stats.totalViews}
              helper="Different students"
              className="bg-blue-50 text-blue-700"
            />

            <AnalyticsCard
              icon="❤️"
              label="Total Saves"
              value={stats.totalWishlist}
              helper="Wishlist interest"
              className="bg-red-50 text-red-700"
            />

            <AnalyticsCard
              icon="📞"
              label="Contacts"
              value={stats.totalContacts}
              helper="Call + WhatsApp"
              className="bg-green-50 text-green-700"
            />

            <AnalyticsCard
              icon="🏠"
              label="Listings"
              value={stats.total}
              helper={`${stats.approved} approved`}
              className="bg-purple-50 text-purple-700"
            />
          </div>
        )}
      </section>

      {!loading && stats.totalContacts > 0 && (
        <section className="mt-5 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-blue-600">
                Contact breakdown
              </p>

              <h3 className="mt-1 text-xl font-black">
                Student enquiries
              </h3>
            </div>

            <div className="text-3xl">📊</div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-2xl font-black text-blue-700">
                {formatNumber(stats.totalCalls)}
              </p>

              <p className="mt-1 text-xs font-black text-blue-600">
                📞 Call clicks
              </p>
            </div>

            <div className="rounded-2xl bg-green-50 p-4">
              <p className="text-2xl font-black text-green-700">
                {formatNumber(stats.totalWhatsApp)}
              </p>

              <p className="mt-1 text-xs font-black text-green-600">
                💬 WhatsApp clicks
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="mt-7">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-black text-blue-600">
              Overview
            </p>

            <h3 className="mt-1 text-2xl font-black">
              Listing summary
            </h3>
          </div>

          {!loading && (
            <p className="text-xs font-bold text-slate-400">
              {stats.total} total
            </p>
          )}
        </div>

        {loading ? (
          <StatsSkeleton />
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatCard
              icon="✅"
              label="Approved"
              value={stats.approved}
              helper="Visible publicly"
              color="bg-green-50 text-green-700"
            />

            <StatCard
              icon="⏳"
              label="Pending"
              value={stats.pending}
              helper="Waiting approval"
              color="bg-amber-50 text-amber-700"
            />

            <StatCard
              icon="⚠️"
              label="Rejected"
              value={stats.rejected}
              helper="Needs changes"
              color="bg-red-50 text-red-700"
            />

            <StatCard
              icon="🚫"
              label="Inactive"
              value={stats.inactive}
              helper="Hidden listings"
              color="bg-slate-100 text-slate-700"
            />
          </div>
        )}
      </section>

      {!loading && bestPerformingListing && (
        <section className="mt-7">
          <div>
            <p className="text-sm font-black text-blue-600">
              Best performance
            </p>

            <h3 className="mt-1 text-2xl font-black">
              Top listing
            </h3>
          </div>

          <TopListing item={bestPerformingListing} />
        </section>
      )}

      <section className="mt-7">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-blue-600">
              Latest activity
            </p>

            <h3 className="mt-1 text-2xl font-black">
              Recent listings
            </h3>
          </div>

          {listingsWithAnalytics.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("listings")}
              className="text-sm font-black text-blue-600"
            >
              View all
            </button>
          )}
        </div>

        {loading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-[24px] bg-slate-100"
              />
            ))}
          </div>
        ) : recentListings.length === 0 ? (
          <div className="mt-4 rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-7 text-center">
            <div className="text-5xl">🏠</div>

            <h4 className="mt-4 text-xl font-black">
              No PG added yet
            </h4>

            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Apna pehla PG add karo aur admin approval
              ke liye submit karo.
            </p>

            <button
              type="button"
              onClick={() => setActiveTab("add")}
              className="mt-5 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white"
            >
              Add Your First PG
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {recentListings.map((item) => (
              <RecentListing
                key={item.id}
                item={item}
              />
            ))}
          </div>
        )}
      </section>

      {stats.rejected > 0 && (
        <section className="mt-6 rounded-[26px] border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>

            <div>
              <h3 className="font-black text-red-800">
                {stats.rejected} listing rejected
              </h3>

              <p className="mt-1 text-sm font-semibold leading-6 text-red-700">
                Rejection reason check karke property details
                update karo.
              </p>

              <button
                type="button"
                onClick={() => setActiveTab("listings")}
                className="mt-3 text-sm font-black text-red-700 underline"
              >
                Open My PGs
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function AnalyticsCard({
  icon,
  label,
  value,
  helper,
  className,
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${className}`}
      >
        {icon}
      </div>

      <p className="mt-4 text-3xl font-black">
        {formatNumber(value)}
      </p>

      <p className="mt-1 text-sm font-black text-slate-700">
        {label}
      </p>

      <p className="mt-1 text-[11px] font-bold text-slate-400">
        {helper}
      </p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  helper,
  color,
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${color}`}
      >
        {icon}
      </div>

      <p className="mt-4 text-3xl font-black">
        {formatNumber(value)}
      </p>

      <p className="mt-1 text-sm font-black text-slate-700">
        {label}
      </p>

      <p className="mt-1 text-[11px] font-bold text-slate-400">
        {helper}
      </p>
    </div>
  );
}

function TopListing({ item }) {
  const image =
    item.images?.[0] ||
    item.image ||
    "";

  return (
    <article className="mt-4 overflow-hidden rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm">
      <div className="relative aspect-[16/8] overflow-hidden bg-slate-100">
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

        <span className="absolute left-3 top-3 rounded-full bg-yellow-400 px-3 py-1.5 text-xs font-black text-slate-950 shadow-lg">
          🏆 Top Listing
        </span>
      </div>

      <div className="p-4">
        <h4 className="truncate text-xl font-black">
          {item.name || "Student PG"}
        </h4>

        <p className="mt-1 truncate text-sm font-semibold text-slate-500">
          📍 {item.location || item.city || "Asansol"}
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniAnalytics
            icon="👁"
            value={item.uniqueViews}
            label="Views"
          />

          <MiniAnalytics
            icon="❤️"
            value={item.wishlistCount}
            label="Saves"
          />

          <MiniAnalytics
            icon="📞"
            value={item.contactCount}
            label="Contacts"
          />
        </div>
      </div>
    </article>
  );
}

function RecentListing({ item }) {
  const image =
    item.images?.[0] ||
    item.image ||
    "";

  const status = item.approvalStatus || "pending";

  const statusStyles = {
    approved: "bg-green-50 text-green-700",
    pending: "bg-amber-50 text-amber-700",
    rejected: "bg-red-50 text-red-700",
  };

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex gap-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-3xl">
          {image ? (
            <img
              src={image}
              alt={item.name || "PG"}
              className="h-full w-full object-cover"
            />
          ) : (
            "🏠"
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate font-black">
              {item.name || "Student PG"}
            </h4>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black capitalize ${
                statusStyles[status] ||
                statusStyles.pending
              }`}
            >
              {status}
            </span>
          </div>

          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            📍 {item.location || item.city || "Asansol"}
          </p>

          <p className="mt-2 font-black text-blue-600">
            ₹{Number(item.rent || 0).toLocaleString("en-IN")}

            <span className="text-[10px] font-bold text-slate-400">
              {" "}
              / month
            </span>
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
        <MiniAnalytics
          icon="👁"
          value={item.uniqueViews}
          label="Views"
        />

        <MiniAnalytics
          icon="❤️"
          value={item.wishlistCount}
          label="Saves"
        />

        <MiniAnalytics
          icon="📞"
          value={item.contactCount}
          label="Contacts"
        />
      </div>
    </article>
  );
}

function MiniAnalytics({
  icon,
  value,
  label,
}) {
  return (
    <div className="rounded-xl bg-white p-2 text-center shadow-sm">
      <p className="text-xs">{icon}</p>

      <p className="mt-1 text-sm font-black text-slate-800">
        {formatNumber(value)}
      </p>

      <p className="text-[9px] font-bold text-slate-400">
        {label}
      </p>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-40 animate-pulse rounded-[24px] bg-slate-100"
        />
      ))}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-40 animate-pulse rounded-[24px] bg-slate-100"
        />
      ))}
    </div>
  );
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}