import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import CookFeatureCard from "../components/pg/CookFeatureCard";

const previewPGs = [
  {
    id: "preview-pg-1",
    name: "Campus Nest Boys PG",
    location: "Burnpur, Asansol",
    rent: 4500,
    gender: "boys",
    sharing: ["double", "triple"],
    availableBeds: 3,
    foodIncluded: true,
    verified: true,
    rating: 4.8,
    amenities: ["WiFi", "Food", "CCTV", "RO Water"],
    images: [
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "preview-pg-2",
    name: "Bluebell Girls Residency",
    location: "Court More, Asansol",
    rent: 5200,
    gender: "girls",
    sharing: ["single", "double"],
    availableBeds: 2,
    foodIncluded: true,
    verified: true,
    rating: 4.9,
    amenities: ["WiFi", "Food", "Geyser", "CCTV"],
    images: [
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "preview-pg-3",
    name: "Student Stay Premium PG",
    location: "Chelidanga, Asansol",
    rent: 3800,
    gender: "unisex",
    sharing: ["double", "triple"],
    availableBeds: 5,
    foodIncluded: false,
    verified: false,
    rating: 4.5,
    amenities: ["WiFi", "Parking", "Power Backup"],
    images: [
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  {
    id: "preview-pg-4",
    name: "Scholars Home PG",
    location: "Ushagram, Asansol",
    rent: 6000,
    gender: "boys",
    sharing: ["single", "double"],
    availableBeds: 1,
    foodIncluded: true,
    verified: true,
    rating: 4.7,
    amenities: ["AC", "WiFi", "Food", "Attached Bathroom"],
    images: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    ],
  },
];

const genderOptions = [
  { value: "all", label: "All PGs", icon: "🏠" },
  { value: "boys", label: "Boys", icon: "👨‍🎓" },
  { value: "girls", label: "Girls", icon: "👩‍🎓" },
  { value: "unisex", label: "Unisex", icon: "✨" },
];

const amenityOptions = [
  "Food",
  "WiFi",
  "AC",
  "CCTV",
  "Attached Bathroom",
  "Parking",
  "Power Backup",
  "Geyser",
];

export default function PG({ onLogout }) {
  const { currentUser } = useAuth();

  const [firestorePGs, setFirestorePGs] = useState([]);
  const [savedPGIds, setSavedPGIds] = useState(new Set());
  const [savingPGId, setSavingPGId] = useState("");

  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [selectedGender, setSelectedGender] = useState("all");
  const [selectedSharing, setSelectedSharing] = useState("all");
  const [selectedAmenity, setSelectedAmenity] = useState("all");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [sortBy, setSortBy] = useState("recommended");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "pgs"),
      (snapshot) => {
        const list = snapshot.docs
          .map((pgDoc) => ({
            id: pgDoc.id,
            ...pgDoc.data(),
          }))
          .filter((pg) => {
            const isApproved =
              pg.approvalStatus === "approved" ||
              pg.status === "approved" ||
              pg.approved === true;

            const isActive = pg.active !== false;

            return isApproved && isActive;
          });

        setFirestorePGs(list);
        setLoading(false);
      },
      (error) => {
        console.error("PG listing error:", error);
        setFirestorePGs([]);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setSavedPGIds(new Set());
      return;
    }

    const wishlistQuery = query(
      collection(db, "pgWishlist"),
      where("userId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      wishlistQuery,
      (snapshot) => {
        const ids = snapshot.docs.map(
          (item) => item.data().pgId
        );

        setSavedPGIds(new Set(ids));
      },
      (error) => {
        console.error("PG wishlist listener error:", error);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  const isPreviewMode =
    !loading && firestorePGs.length === 0;

  const availablePGs =
    isPreviewMode ? previewPGs : firestorePGs;

  const filteredPGs = useMemo(() => {
    const normalizedSearch =
      searchText.trim().toLowerCase();

    const minimum = minRent ? Number(minRent) : 0;
    const maximum = maxRent ? Number(maxRent) : Infinity;

    return availablePGs
      .filter((pg) => {
        const rent = Number(pg.rent) || 0;

        const searchableText = [
          pg.name,
          pg.location,
          pg.area,
          pg.city,
          ...(Array.isArray(pg.amenities)
            ? pg.amenities
            : []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const gender = String(
          pg.gender || ""
        ).toLowerCase();

        const sharingValues = Array.isArray(pg.sharing)
          ? pg.sharing.map((item) =>
              String(item).toLowerCase()
            )
          : [String(pg.sharing || "").toLowerCase()];

        const amenities = Array.isArray(pg.amenities)
          ? pg.amenities.map((item) =>
              String(item).toLowerCase()
            )
          : [];

        const matchesSearch =
          !normalizedSearch ||
          searchableText.includes(normalizedSearch);

        const matchesGender =
          selectedGender === "all" ||
          gender === selectedGender;

        const matchesSharing =
          selectedSharing === "all" ||
          sharingValues.includes(
            selectedSharing.toLowerCase()
          );

        const matchesAmenity =
          selectedAmenity === "all" ||
          amenities.includes(
            selectedAmenity.toLowerCase()
          );

        const matchesRent =
          rent >= minimum && rent <= maximum;

        return (
          matchesSearch &&
          matchesGender &&
          matchesSharing &&
          matchesAmenity &&
          matchesRent
        );
      })
      .sort((a, b) => {
        const rentA = Number(a.rent) || 0;
        const rentB = Number(b.rent) || 0;

        const ratingA = Number(a.rating) || 0;
        const ratingB = Number(b.rating) || 0;

        if (sortBy === "rent-low") {
          return rentA - rentB;
        }

        if (sortBy === "rent-high") {
          return rentB - rentA;
        }

        if (sortBy === "rating") {
          return ratingB - ratingA;
        }

        const verifiedA = a.verified ? 1 : 0;
        const verifiedB = b.verified ? 1 : 0;

        return verifiedB - verifiedA || ratingB - ratingA;
      });
  }, [
    availablePGs,
    searchText,
    selectedGender,
    selectedSharing,
    selectedAmenity,
    minRent,
    maxRent,
    sortBy,
  ]);

  async function togglePGWishlist(pg) {
    if (!currentUser || savingPGId) {
      return;
    }

    const wishlistDocId = `${currentUser.uid}_${pg.id}`;
    const isSaved = savedPGIds.has(pg.id);

    try {
      setSavingPGId(pg.id);

      if (isSaved) {
        await deleteDoc(
          doc(db, "pgWishlist", wishlistDocId)
        );
      } else {
        await setDoc(
          doc(db, "pgWishlist", wishlistDocId),
          {
            userId: currentUser.uid,
            pgId: pg.id,

            name: pg.name || "Student PG",
            location:
              pg.location ||
              pg.area ||
              pg.city ||
              "Asansol",

            rent: Number(pg.rent) || 0,
            gender: pg.gender || "students",
            sharing: Array.isArray(pg.sharing)
              ? pg.sharing
              : [pg.sharing || "flexible"],

            availableBeds:
              Number(pg.availableBeds) || 0,

            foodIncluded:
              pg.foodIncluded === true,

            verified: pg.verified === true,
            rating: Number(pg.rating) || 0,

            image:
              pg.images?.[0] ||
              pg.image ||
              "",

            savedAt: serverTimestamp(),
          }
        );
      }
    } catch (error) {
      console.error("PG wishlist error:", error);
      alert(error.message);
    } finally {
      setSavingPGId("");
    }
  }

  function clearFilters() {
    setSearchText("");
    setSelectedGender("all");
    setSelectedSharing("all");
    setSelectedAmenity("all");
    setMinRent("");
    setMaxRent("");
    setSortBy("recommended");
  }

  const hasActiveFilters =
    searchText ||
    selectedGender !== "all" ||
    selectedSharing !== "all" ||
    selectedAmenity !== "all" ||
    minRent ||
    maxRent ||
    sortBy !== "recommended";

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 text-slate-950 dark:bg-slate-950 dark:text-white">
      <Navbar onLogout={onLogout} />

      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-5 lg:px-8">
        <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-blue-950 via-blue-700 to-blue-500 px-5 py-7 text-white shadow-xl shadow-blue-900/20 sm:px-8 sm:py-10">
          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-24 left-20 h-52 w-52 rounded-full bg-yellow-300/20 blur-3xl" />

          <div className="relative z-10 max-w-2xl">
            <Link
              to="/home"
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-extrabold backdrop-blur"
            >
              ← CampusMart Home
            </Link>

            <p className="text-sm font-black uppercase tracking-[0.2em] text-yellow-300">
              Student Housing
            </p>

            <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-5xl">
              Find a PG that feels like{" "}
              <span className="text-yellow-300">
                home.
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-sm font-semibold leading-relaxed text-blue-100 sm:text-base">
              Explore verified rooms and student-friendly PGs
              near your campus.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-xs font-extrabold sm:text-sm">
              <span className="rounded-full bg-white/10 px-4 py-2 backdrop-blur">
                ✓ Student friendly
              </span>

              <span className="rounded-full bg-white/10 px-4 py-2 backdrop-blur">
                ✓ Budget filters
              </span>

              <span className="rounded-full bg-white/10 px-4 py-2 backdrop-blur">
                ✓ Verified listings
              </span>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-3 right-3 text-[90px] opacity-90 sm:right-10 sm:text-[135px]">
            🏠
          </div>
        </section>

        {isPreviewMode && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
            <span className="text-xl">💡</span>

            <div>
              <p className="font-black">
                UI Preview Data
              </p>

              <p className="mt-1 text-sm font-semibold text-amber-800">
                Firestore me approved PG add hone ke baad
                preview cards automatically remove ho jayenge.
              </p>
            </div>
          </div>
        )}

        <section className="sticky top-2 z-30 mt-5 rounded-[26px] border border-slate-200 bg-white/95 p-3 shadow-lg shadow-slate-200/60 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-none">
          <div className="flex gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-slate-100 px-4 dark:bg-slate-800">
              <span className="text-xl text-slate-400">
                ⌕
              </span>

              <input
                value={searchText}
                onChange={(event) =>
                  setSearchText(event.target.value)
                }
                placeholder="Search area, PG or facility..."
                className="w-full bg-transparent py-4 text-sm font-bold outline-none placeholder:text-slate-400"
              />

              {searchText && (
                <button
                  type="button"
                  onClick={() => setSearchText("")}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white font-black text-slate-500 shadow-sm dark:bg-slate-700"
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowFilters(true)}
              className="relative rounded-2xl bg-blue-600 px-4 font-black text-white shadow-lg shadow-blue-600/25 sm:px-6"
            >
              <span className="hidden sm:inline">
                Filters
              </span>

              <span className="sm:hidden">⚙</span>

              {hasActiveFilters && (
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-yellow-400" />
              )}
            </button>
          </div>
        </section>

        <section className="mt-5">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {genderOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setSelectedGender(option.value)
                }
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-3 text-sm font-black transition ${
                  selectedGender === option.value
                    ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                <span>{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-7">
            <CookFeatureCard />
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black text-blue-600">
                Available properties
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                PGs near you
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                {loading
                  ? "Finding suitable stays..."
                  : `${filteredPGs.length} ${
                      filteredPGs.length === 1
                        ? "property"
                        : "properties"
                    } found`}
              </p>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="shrink-0 text-sm font-black text-blue-600"
              >
                Clear filters
              </button>
            )}
          </div>

          {loading ? (
            <PGSkeleton />
          ) : filteredPGs.length === 0 ? (
            <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-white px-5 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
              <div className="text-6xl">🏚️</div>

              <h3 className="mt-5 text-xl font-black">
                No PG found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">
                Search ya filters change karke dobara try
                karo.
              </p>

              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPGs.map((pg) => (
                <PGCard
                  key={pg.id}
                  pg={pg}
                  isPreviewMode={isPreviewMode}
                  saved={savedPGIds.has(pg.id)}
                  saving={savingPGId === pg.id}
                  onToggleWishlist={togglePGWishlist}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {showFilters && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-5"
          onClick={() => setShowFilters(false)}
        >
          <div
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-[32px] bg-white p-5 shadow-2xl dark:bg-slate-950 sm:max-w-xl sm:rounded-[32px] sm:p-6"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-blue-600">
                  Smart filters
                </p>

                <h2 className="text-2xl font-black">
                  Find your ideal PG
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-xl font-black dark:bg-slate-900"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <FilterSection title="PG Type">
                <div className="grid grid-cols-2 gap-3">
                  {genderOptions.map((option) => (
                    <FilterButton
                      key={option.value}
                      active={
                        selectedGender === option.value
                      }
                      onClick={() =>
                        setSelectedGender(option.value)
                      }
                    >
                      {option.icon} {option.label}
                    </FilterButton>
                  ))}
                </div>
              </FilterSection>

              <FilterSection title="Room Sharing">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    "all",
                    "single",
                    "double",
                    "triple",
                  ].map((sharing) => (
                    <FilterButton
                      key={sharing}
                      active={
                        selectedSharing === sharing
                      }
                      onClick={() =>
                        setSelectedSharing(sharing)
                      }
                    >
                      {sharing === "all"
                        ? "Any sharing"
                        : `${capitalize(
                            sharing
                          )} sharing`}
                    </FilterButton>
                  ))}
                </div>
              </FilterSection>

              <FilterSection title="Monthly Rent">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    min="0"
                    value={minRent}
                    onChange={(event) =>
                      setMinRent(event.target.value)
                    }
                    placeholder="₹ Minimum"
                    className="w-full rounded-2xl bg-slate-100 px-4 py-4 font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900"
                  />

                  <input
                    type="number"
                    min="0"
                    value={maxRent}
                    onChange={(event) =>
                      setMaxRent(event.target.value)
                    }
                    placeholder="₹ Maximum"
                    className="w-full rounded-2xl bg-slate-100 px-4 py-4 font-bold outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900"
                  />
                </div>
              </FilterSection>

              <FilterSection title="Facility">
                <select
                  value={selectedAmenity}
                  onChange={(event) =>
                    setSelectedAmenity(
                      event.target.value
                    )
                  }
                  className="w-full rounded-2xl bg-slate-100 px-4 py-4 font-bold outline-none dark:bg-slate-900"
                >
                  <option value="all">
                    All facilities
                  </option>

                  {amenityOptions.map((amenity) => (
                    <option
                      key={amenity}
                      value={amenity}
                    >
                      {amenity}
                    </option>
                  ))}
                </select>
              </FilterSection>

              <FilterSection title="Sort Results">
                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value)
                  }
                  className="w-full rounded-2xl bg-slate-100 px-4 py-4 font-bold outline-none dark:bg-slate-900"
                >
                  <option value="recommended">
                    Recommended
                  </option>

                  <option value="rent-low">
                    Rent: Low to High
                  </option>

                  <option value="rent-high">
                    Rent: High to Low
                  </option>

                  <option value="rating">
                    Highest Rated
                  </option>
                </select>
              </FilterSection>
            </div>

            <div className="sticky bottom-0 mt-7 grid grid-cols-2 gap-3 bg-white pt-3 dark:bg-slate-950">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-2xl bg-slate-100 py-4 font-black dark:bg-slate-900"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="rounded-2xl bg-blue-600 py-4 font-black text-white shadow-lg shadow-blue-600/25"
              >
                Show {filteredPGs.length} results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PGCard({
  pg,
  isPreviewMode,
  saved,
  saving,
  onToggleWishlist,
}) {
  const image =
    pg.images?.[0] ||
    pg.image ||
    "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80";

  const amenities = Array.isArray(pg.amenities)
    ? pg.amenities.slice(0, 3)
    : [];

  const sharing = Array.isArray(pg.sharing)
    ? pg.sharing
        .slice(0, 2)
        .map(capitalize)
        .join(" / ")
    : capitalize(pg.sharing || "Flexible");

  return (
    <article className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_15px_45px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-900">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
        <Link
          to={`/pg/${pg.id}`}
          className="block h-full w-full"
        >
          <img
            src={image}
            alt={pg.name || "PG property"}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </Link>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-wrap gap-2">
            {pg.verified && (
              <span className="rounded-full bg-blue-600 px-3 py-1.5 text-[11px] font-black text-white shadow-lg">
                ✓ Verified
              </span>
            )}

            {isPreviewMode && (
              <span className="rounded-full bg-amber-400 px-3 py-1.5 text-[11px] font-black text-slate-950 shadow-lg">
                Preview
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => onToggleWishlist(pg)}
            aria-label={
              saved
                ? "Remove PG from wishlist"
                : "Save PG"
            }
            className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full text-xl font-black shadow-lg backdrop-blur transition active:scale-90 ${
              saved
                ? "bg-red-50 text-red-500"
                : "bg-white/95 text-slate-700"
            } disabled:opacity-60`}
          >
            {saving ? "…" : saved ? "♥" : "♡"}
          </button>
        </div>

        {Number(pg.availableBeds) > 0 && (
          <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-slate-950/80 px-3 py-1.5 text-xs font-black text-white backdrop-blur">
            🛏 {pg.availableBeds} beds left
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/pg/${pg.id}`}>
              <h3 className="truncate text-lg font-black hover:text-blue-600">
                {pg.name || "Student PG"}
              </h3>
            </Link>

            <p className="mt-1 truncate text-sm font-semibold text-slate-500">
              📍{" "}
              {pg.location ||
                pg.area ||
                "Asansol"}
            </p>
          </div>

          {Number(pg.rating) > 0 && (
            <div className="shrink-0 rounded-xl bg-green-50 px-2.5 py-1.5 text-sm font-black text-green-700 dark:bg-green-950/40 dark:text-green-400">
              ★ {Number(pg.rating).toFixed(1)}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black capitalize text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            {pg.gender || "Students"}
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {sharing}
          </span>

          {pg.foodIncluded && (
            <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
              🍛 Food
            </span>
          )}
        </div>

        {amenities.length > 0 && (
          <div className="mt-4 flex items-center gap-2 overflow-hidden text-xs font-bold text-slate-500">
            {amenities.map((amenity) => (
              <span
                key={amenity}
                className="shrink-0 rounded-lg bg-slate-50 px-2.5 py-1.5 dark:bg-slate-800"
              >
                {amenity}
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-bold text-slate-400">
              Monthly rent
            </p>

            <p className="mt-0.5 text-xl font-black">
              ₹
              {Number(
                pg.rent || 0
              ).toLocaleString("en-IN")}

              <span className="text-xs font-bold text-slate-400">
                {" "}
                / month
              </span>
            </p>
          </div>

          <Link
            to={`/pg/${pg.id}`}
            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20"
          >
            Details →
          </Link>
        </div>
      </div>
    </article>
  );
}

function PGSkeleton() {
  return (
    <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 4 }).map(
        (_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[28px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="aspect-[4/3] animate-pulse bg-slate-200 dark:bg-slate-800" />

            <div className="space-y-4 p-4">
              <div className="h-5 w-3/4 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="h-12 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        )
      )}
    </div>
  );
}

function FilterSection({ title, children }) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-black">
        {title}
      </h3>

      {children}
    </section>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-3 py-3 text-sm font-black transition ${
        active
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

function capitalize(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}