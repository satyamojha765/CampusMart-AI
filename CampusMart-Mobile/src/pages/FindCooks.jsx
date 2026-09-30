import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChefHat,
  Clock3,
  MapPin,
  Plus,
  Search,
  Star,
  Users,
  Utensils,
} from "lucide-react";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function FindCooks() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const isAdmin = useMemo(() => {
    return (
      currentUser?.email === "campusmart05@gmail.com" ||
      userProfile?.role === "admin" ||
      userProfile?.isAdmin === true ||
      userProfile?.admin === true
    );
  }, [currentUser?.email, userProfile]);

  const [cooks, setCooks] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [foodFilter, setFoodFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const cooksRef = collection(db, "pgCooks");

    const unsubscribe = onSnapshot(
      cooksRef,
      (snapshot) => {
        const cooksList = snapshot.docs.map((cookDocument) => ({
          id: cookDocument.id,
          ...cookDocument.data(),
        }));

        cooksList.sort((firstCook, secondCook) => {
          const firstAvailable = firstCook.available !== false ? 1 : 0;
          const secondAvailable = secondCook.available !== false ? 1 : 0;

          if (firstAvailable !== secondAvailable) {
            return secondAvailable - firstAvailable;
          }

          const firstRating = Number(firstCook.averageRating || 0);
          const secondRating = Number(secondCook.averageRating || 0);

          return secondRating - firstRating;
        });

        setCooks(cooksList);
        setLoading(false);
        setErrorMessage("");
      },
      (error) => {
        console.error("Cook profiles loading error:", error);
        setErrorMessage("Cook profiles load nahi ho pa rahe hain.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredCooks = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return cooks.filter((cook) => {
      const searchableText = [
        cook.name,
        cook.area,
        cook.city,
        cook.description,
        ...(Array.isArray(cook.cookingTypes) ? cook.cookingTypes : []),
        ...(Array.isArray(cook.meals) ? cook.meals : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        searchableText.includes(normalizedSearch);

      const cookingTypes = Array.isArray(cook.cookingTypes)
        ? cook.cookingTypes.map((item) => String(item).toLowerCase())
        : [];

      const matchesFoodFilter =
        foodFilter === "all" ||
        cookingTypes.includes(foodFilter.toLowerCase());

      return matchesSearch && matchesFoodFilter;
    });
  }, [cooks, searchText, foodFilter]);

  function formatPrice(price) {
    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return "Price on request";
    }

    return `₹${numericPrice.toLocaleString("en-IN")}/student/month`;
  }

  function getCookImage(cook) {
    return (
      cook.photoURL ||
      cook.imageUrl ||
      cook.image ||
      "https://placehold.co/600x600?text=Cook"
    );
  }

  function openCookDetails(cookId) {
    navigate(`/pg/cooks/${cookId}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-slate-900">
              Find a Cook
            </h1>
            <p className="text-xs text-slate-500">
              Trusted cooks near your PG
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-600 to-blue-800 px-5 py-6 text-white shadow-lg shadow-blue-200">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                CampusMart Find PG
              </span>

              <h2 className="max-w-sm text-2xl font-bold leading-tight">
                Ghar jaisa khana banane wali cook find karo
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-blue-100">
                Area, food preference, timing aur ratings ke basis par suitable
                cook choose karo.
              </p>
            </div>

            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-blue-950">
              <ChefHat size={30} />
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="relative">
            <Search
              size={19}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search by name, area or city"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {[
              { label: "All Cooks", value: "all" },
              { label: "Veg", value: "veg" },
              { label: "Non-Veg", value: "non-veg" },
            ].map((filter) => {
              const selected = foodFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setFoodFilter(filter.value)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    selected
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </section>

        <div className="mt-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Available Cooks
            </h3>
            <p className="text-sm text-slate-500">
              {loading
                ? "Profiles loading..."
                : `${filteredCooks.length} profile${
                    filteredCooks.length === 1 ? "" : "s"
                  } found`}
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate("/admin/add-cook")}
              className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-200 transition active:scale-95"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add Cook</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>

        {loading && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-3xl border border-slate-200 bg-white p-4"
              >
                <div className="flex gap-4">
                  <div className="h-24 w-24 shrink-0 rounded-2xl bg-slate-200" />

                  <div className="flex-1 space-y-3 py-1">
                    <div className="h-5 w-2/3 rounded bg-slate-200" />
                    <div className="h-4 w-1/2 rounded bg-slate-200" />
                    <div className="h-4 w-3/4 rounded bg-slate-200" />
                  </div>
                </div>

                <div className="mt-4 h-11 rounded-xl bg-slate-200" />
              </div>
            ))}
          </div>
        )}

        {!loading && errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
            <p className="font-semibold text-red-700">{errorMessage}</p>
            <p className="mt-1 text-sm text-red-600">
              Internet connection aur Firestore rules check karo.
            </p>
          </div>
        )}

        {!loading && !errorMessage && filteredCooks.length === 0 && (
          <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <ChefHat size={30} />
            </div>

            <h3 className="mt-4 text-lg font-bold text-slate-900">
              Koi cook nahi mila
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Search ya food filter change karke dobara check karo.
            </p>
          </div>
        )}

        {!loading && !errorMessage && filteredCooks.length > 0 && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {filteredCooks.map((cook) => {
              const averageRating = Number(cook.averageRating || 0);
              const totalReviews = Number(cook.totalReviews || 0);

              const cookingTypes = Array.isArray(cook.cookingTypes)
                ? cook.cookingTypes
                : [];

              const meals = Array.isArray(cook.meals) ? cook.meals : [];

              return (
                <article
                  key={cook.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => openCookDetails(cook.id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex gap-4">
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                        <img
                          src={getCookImage(cook)}
                          alt={cook.name || "Cook"}
                          loading="lazy"
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.src =
                              "https://placehold.co/600x600?text=Cook";
                          }}
                        />

                        <span
                          className={`absolute bottom-2 left-2 rounded-full px-2 py-1 text-[10px] font-bold ${
                            cook.available !== false
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-700 text-white"
                          }`}
                        >
                          {cook.available !== false
                            ? "Available"
                            : "Unavailable"}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="truncate text-lg font-bold text-slate-900">
                            {cook.name || "Cook"}
                          </h3>

                          <div className="flex shrink-0 items-center gap-1 rounded-full bg-yellow-50 px-2 py-1">
                            <Star
                              size={14}
                              className="fill-yellow-400 text-yellow-400"
                            />
                            <span className="text-xs font-bold text-slate-800">
                              {averageRating > 0
                                ? averageRating.toFixed(1)
                                : "New"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                          <MapPin size={15} className="shrink-0" />
                          <span className="truncate">
                            {[cook.area, cook.city]
                              .filter(Boolean)
                              .join(", ") || "Location not added"}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {cookingTypes.slice(0, 2).map((type) => (
                            <span
                              key={type}
                              className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700"
                            >
                              {type}
                            </span>
                          ))}

                          {totalReviews > 0 && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                              {totalReviews} reviews
                            </span>
                          )}
                        </div>

                        <p className="mt-3 text-base font-extrabold text-blue-700">
                          {formatPrice(cook.monthlyPrice)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
                      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                        <Clock3 size={16} className="text-blue-600" />
                        <span className="truncate">
                          {cook.timings || "Flexible timing"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                        <Users size={16} className="text-blue-600" />
                        <span className="truncate">
                          {cook.capacity || "Student groups"}
                        </span>
                      </div>
                    </div>

                    {meals.length > 0 && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                        <Utensils size={15} className="text-slate-400" />
                        <span className="truncate">{meals.join(" • ")}</span>
                      </div>
                    )}

                    <div className="mt-4 flex h-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
                      View Cook Profile
                    </div>
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}