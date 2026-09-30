import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { doc, increment, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import EmptyState from "../components/ui/EmptyState";

export default function Home({ products = [], onLogout }) {
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const trackedSearches = useRef(new Set());

  const categories = [
    ["All", "▦", "All"],
    ["Books", "📚", "Books & Notes"],
    ["Electronics", "💻", "Electronics"],
    ["Furniture", "🪑", "Furniture"],
    ["Cycle", "🚲", "Cycles"],
    ["Clothes", "👕", "Fashion"],
    ["Mobiles", "📱", "Mobiles"],
    ["Hostel Items", "🛏️", "Hostel"],
  ];

  useEffect(() => {
    const hasHomeOverlay =
      isSearchMode || showFilters || showSuggestions;

    window.__campusMartHomeOverlayOpen = hasHomeOverlay;

    function handleAndroidHomeBack() {
      if (showFilters) {
        setShowFilters(false);
        return;
      }

      if (showSuggestions) {
        setShowSuggestions(false);
        return;
      }

      if (isSearchMode) {
        setSearchText("");
        setIsSearchMode(false);
        setShowSuggestions(false);
      }
    }

    window.addEventListener(
      "campusmart-home-back",
      handleAndroidHomeBack
    );

    return () => {
      window.removeEventListener(
        "campusmart-home-back",
        handleAndroidHomeBack
      );

      window.__campusMartHomeOverlayOpen = false;
    };
  }, [isSearchMode, showFilters, showSuggestions]);

  useEffect(() => {
    const text = searchText.trim().toLowerCase();

    if (
      !isSearchMode ||
      text.length < 2 ||
      trackedSearches.current.has(text)
    ) {
      return;
    }

    const timer = setTimeout(async () => {
      trackedSearches.current.add(text);

      const matchedProducts = products
        .filter((product) => {
          return (
            product.name?.toLowerCase().includes(text) ||
            product.category?.toLowerCase().includes(text) ||
            product.description?.toLowerCase().includes(text)
          );
        })
        .slice(0, 8);

      try {
        await Promise.all(
          matchedProducts.map((product) =>
            updateDoc(doc(db, "products", product.id), {
              searchCount: increment(1),
            })
          )
        );
      } catch (error) {
        console.log("Search count skipped:", error.message);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [searchText, products, isSearchMode]);

  function clearFilters() {
    setSearchText("");
    setSelectedCategory("All");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("latest");
    setIsSearchMode(false);
    setShowSuggestions(false);
  }

  function getTrendingScore(product) {
    const views = Number(product.views) || 0;
    const searchCount = Number(product.searchCount) || 0;
    const soldBoost = product.status === "sold" ? 50 : 0;
    const featuredBoost = product.featured ? 20 : 0;

    return (
      views * 3 +
      searchCount * 5 +
      soldBoost +
      featuredBoost
    );
  }

  function submitSearch(e) {
    e.preventDefault();

    if (!searchText.trim()) return;

    setIsSearchMode(true);
    setShowSuggestions(false);
  }

  function exitSearchMode() {
    setSearchText("");
    setIsSearchMode(false);
    setShowSuggestions(false);
  }

  function selectSuggestion(value) {
    setSearchText(value);
    setIsSearchMode(true);
    setShowSuggestions(false);
  }

  const searchSuggestions = useMemo(() => {
    const text = searchText.trim().toLowerCase();

    if (!text) return [];

    const suggestions = new Map();

    products.forEach((product) => {
      const fields = [
        product.name,
        product.category,
      ].filter(Boolean);

      fields.forEach((field) => {
        const value = String(field).trim();
        const lower = value.toLowerCase();

        if (
          lower.includes(text) &&
          !suggestions.has(lower)
        ) {
          suggestions.set(lower, {
            label: value,
            category: product.category || "Product",
            icon: product.icon || "🔍",
          });
        }
      });
    });

    return Array.from(suggestions.values()).slice(0, 7);
  }, [searchText, products]);

  const featuredProducts = products
    .filter((product) => product.featured === true)
    .slice(0, 6);

  const trendingProducts = [...products]
    .map((product) => ({
      ...product,
      trendingScore: getTrendingScore(product),
    }))
    .filter((product) => product.trendingScore > 0)
    .sort(
      (firstProduct, secondProduct) =>
        secondProduct.trendingScore -
        firstProduct.trendingScore
    )
    .slice(0, 8);

  const filteredProducts = products
    .filter((product) => {
      const text = searchText.toLowerCase();

      const productPrice = Number(product.price) || 0;
      const min = minPrice ? Number(minPrice) : 0;
      const max = maxPrice ? Number(maxPrice) : Infinity;

      const matchesSearch =
        product.name?.toLowerCase().includes(text) ||
        product.category?.toLowerCase().includes(text) ||
        product.description?.toLowerCase().includes(text);

      const matchesCategory =
        selectedCategory === "All" ||
        product.category === selectedCategory;

      return (
        matchesSearch &&
        matchesCategory &&
        productPrice >= min &&
        productPrice <= max
      );
    })
    .sort((firstProduct, secondProduct) => {
      const priceA = Number(firstProduct.price) || 0;
      const priceB = Number(secondProduct.price) || 0;

      if (sortBy === "low") {
        return priceA - priceB;
      }

      if (sortBy === "high") {
        return priceB - priceA;
      }

      const timeA =
        firstProduct.createdAt?.seconds || 0;

      const timeB =
        secondProduct.createdAt?.seconds || 0;

      return timeB - timeA;
    });

  const recentlyAdded = filteredProducts.slice(0, 8);

  const displayTrending =
    trendingProducts.length > 0
      ? trendingProducts
      : filteredProducts.slice(0, 8);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950 dark:bg-slate-950 dark:text-white pb-28">
      <Navbar
        onLogout={onLogout}
        searchText={searchText}
        setSearchText={setSearchText}
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-5 lg:px-8">
        <form
          onSubmit={submitSearch}
          className="relative mb-5 md:hidden"
        >
          <div className="flex gap-3">
            <div className="flex flex-1 items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-2xl text-slate-400">
                ⌕
              </span>

              <input
                value={searchText}
                onChange={(event) => {
                  setSearchText(event.target.value);
                  setShowSuggestions(true);
                  setIsSearchMode(false);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search books, devices, furniture..."
                className="w-full bg-transparent text-[15px] font-semibold text-slate-800 outline-none placeholder:text-slate-400 dark:text-white"
              />

              {searchText && (
                <button
                  type="button"
                  onClick={exitSearchMode}
                  className="h-8 w-8 rounded-full bg-slate-100 font-black text-slate-500 dark:bg-slate-800"
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowSuggestions(false);
                setShowFilters(true);
              }}
              className="h-[58px] rounded-3xl bg-blue-600 px-5 font-extrabold text-white shadow-lg shadow-blue-600/25"
            >
              Filter
            </button>
          </div>

          {showSuggestions &&
            searchSuggestions.length > 0 &&
            !isSearchMode && (
              <div className="absolute left-0 right-[92px] top-[68px] z-40 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                <div className="p-3">
                  <p className="px-2 pb-2 text-xs font-black text-blue-600">
                    Suggestions
                  </p>

                  {searchSuggestions.map(
                    (item, index) => (
                      <button
                        key={`${item.label}_${index}`}
                        type="button"
                        onClick={() =>
                          selectSuggestion(item.label)
                        }
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <span className="text-2xl">
                          {item.icon}
                        </span>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">
                            {item.label}
                          </p>

                          <p className="text-xs font-bold text-slate-500">
                            {item.category}
                          </p>
                        </div>
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
        </form>

        {isSearchMode ? (
          <section>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-blue-600">
                  Search
                </p>

                <h1 className="text-2xl font-black sm:text-4xl">
                  Results for “{searchText}”
                </h1>

                <p className="mt-1 font-semibold text-slate-500">
                  {filteredProducts.length} products found
                </p>
              </div>

              <button
                type="button"
                onClick={exitSearchMode}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                ← Back
              </button>
            </div>

            {filteredProducts.length === 0 ? (
              <EmptyState
                icon="🔍"
                title="No matching products found"
                message="Try another keyword, category, or price range."
              />
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={{
                      ...product,
                      trendingScore:
                        getTrendingScore(product),
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="relative min-h-[255px] overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-950 via-blue-700 to-blue-500 p-6 text-white shadow-xl shadow-blue-900/20 sm:p-8">
              <div className="relative z-10 max-w-[58%]">
                <h1 className="text-[32px] font-black leading-tight tracking-tight sm:text-5xl">
                  Buy, Sell & Connect on{" "}
                  <span className="text-yellow-300">
                    Campus
                  </span>
                </h1>

                <p className="mt-4 text-base font-medium text-blue-100 sm:text-lg">
                  Trusted by students. Loved by campuses.
                </p>

                <Link
                  to="/sell"
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-blue-700 shadow-lg"
                >
                  Sell Now <span>›</span>
                </Link>
              </div>

              <div className="absolute bottom-4 right-2 text-[105px] drop-shadow-2xl sm:text-[145px]">
                🎒
              </div>

              <div className="absolute bottom-7 right-14 text-[60px] sm:text-[80px]">
                🎧
              </div>

              <div className="absolute bottom-0 right-24 text-[48px] sm:text-[70px]">
                📚
              </div>
            </section>

            <SectionTitle
              title="Top Categories"
              action="View all"
              className="mt-8"
            />

            <div className="scrollbar-hide mt-4 flex items-start gap-4 overflow-x-auto pb-3">
  {categories.map(([value, icon, label]) => (
    <button
      key={value}
      type="button"
      onClick={() => setSelectedCategory(value)}
      className="flex min-w-[86px] w-[86px] shrink-0 flex-col items-center text-center"
    >
      <div
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border text-3xl transition ${
          selectedCategory === value
            ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/25"
            : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        }`}
      >
        {icon}
      </div>

      <p className="mt-2 flex min-h-[40px] w-full items-start justify-center text-center text-sm font-extrabold leading-[18px] text-slate-800 dark:text-slate-100">
        {label}
      </p>
    </button>
  ))}
</div>

            <SectionTitle
              title="Student Hub"
              action="All Services"
              className="mt-5"
            />

            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Link to="/tiffin">
                <ServiceCard
                  icon="🍱"
                  title="Tiffin Service"
                  text="Fresh homemade food"
                  badge="LIVE"
                  color="from-green-50 to-emerald-100"
                />
              </Link>

              <Link to="/report-file">
                <ServiceCard
                  icon="📄"
                  title="Report File"
                  text="Order A4 report files"
                  color="from-purple-50 to-violet-100"
                />
              </Link>

              <Link to="/pg">
                <ServiceCard
                  icon="🏠"
                  title="Find PG"
                  text="Rooms & PG near campus"
                  badge="LIVE"
                  color="from-blue-50 to-blue-100"
                />
              </Link>

              <ServiceCard
                icon="🎁"
                title="Refer & Earn"
                text="Invite friends & earn rewards"
                color="from-yellow-50 to-orange-100"
              />
            </div>

            <SectionTitle
              title="Recently Added 🔥"
              action="View all"
              className="mt-8"
            />

            {recentlyAdded.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon="🔍"
                  title="No matching products found"
                  message="Try another keyword, category, or price range."
                />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {recentlyAdded.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={{
                      ...product,
                      trendingScore:
                        getTrendingScore(product),
                    }}
                  />
                ))}
              </div>
            )}

            <section className="mt-8 flex items-center justify-between gap-4 overflow-hidden rounded-[28px] border border-yellow-200 bg-gradient-to-r from-yellow-50 via-orange-50 to-yellow-100 p-5 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="text-5xl">🎁</div>

                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    Campus Deals
                  </h2>

                  <p className="mt-1 font-semibold text-slate-600">
                    Exclusive offers & discounts only for
                    you!
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="hidden rounded-2xl bg-yellow-400 px-5 py-3 font-black text-slate-950 shadow-lg sm:inline-flex"
              >
                Explore Deals ›
              </button>
            </section>

            <SectionTitle
              title="Trending Near You"
              action="View all"
              className="mt-8"
            />

            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {displayTrending.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    ...product,
                    trendingScore:
                      getTrendingScore(product),
                  }}
                />
              ))}
            </div>

            {featuredProducts.length > 0 && (
              <>
                <SectionTitle
                  title="Admin Picks ⭐"
                  action="Featured"
                  className="mt-8"
                />

                <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {featuredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="mx-auto max-w-md rounded-t-[32px] border border-slate-200 bg-white/95 px-5 pb-5 pt-3 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
          <div className="grid grid-cols-5 items-end text-center">
            <BottomItem
              to="/home"
              icon="🏠"
              label="Home"
              active
            />

            <BottomItem
              to="/wishlist"
              icon="♡"
              label="Wishlist"
            />

            <Link
              to="/sell"
              className="-mt-9 flex flex-col items-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-4xl text-white shadow-xl shadow-blue-600/35 dark:border-slate-950">
                +
              </div>

              <span className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                Sell
              </span>
            </Link>

            <BottomItem
              to="/chats"
              icon="💬"
              label="Chats"
            />

            <BottomItem
              to="/profile"
              icon="👤"
              label="Profile"
            />
          </div>
        </div>
      </nav>

      {showFilters && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 md:items-center">
          <div className="w-full rounded-t-[32px] bg-white p-6 shadow-2xl dark:bg-slate-950 md:max-w-lg md:rounded-[32px]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-black">
                Filters
              </h2>

              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="h-10 w-10 rounded-full bg-slate-100 font-black dark:bg-slate-900"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-black">
                  Min Price
                </label>

                <input
                  type="number"
                  placeholder="₹ Min"
                  value={minPrice}
                  onChange={(event) =>
                    setMinPrice(event.target.value)
                  }
                  className="w-full rounded-2xl bg-slate-100 px-4 py-4 font-bold outline-none dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black">
                  Max Price
                </label>

                <input
                  type="number"
                  placeholder="₹ Max"
                  value={maxPrice}
                  onChange={(event) =>
                    setMaxPrice(event.target.value)
                  }
                  className="w-full rounded-2xl bg-slate-100 px-4 py-4 font-bold outline-none dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black">
                  Sort By
                </label>

                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value)
                  }
                  className="w-full rounded-2xl bg-slate-100 px-4 py-4 font-bold outline-none dark:bg-slate-900"
                >
                  <option value="latest">
                    Latest First
                  </option>

                  <option value="low">
                    Price Low to High
                  </option>

                  <option value="high">
                    Price High to Low
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-2xl bg-slate-100 py-4 font-black dark:bg-slate-900"
                >
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowFilters(false)
                  }
                  className="rounded-2xl bg-blue-600 py-4 font-black text-white shadow-lg shadow-blue-600/25"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({
  title,
  action,
  className = "",
}) {
  return (
    <div
      className={`flex items-center justify-between ${className}`}
    >
      <h2 className="text-[22px] font-black tracking-tight sm:text-3xl">
        {title}
      </h2>

      <button
        type="button"
        className="font-black text-blue-600"
      >
        {action}
      </button>
    </div>
  );
}

function ServiceCard({
  icon,
  title,
  text,
  color,
  badge,
}) {
  return (
    <button
      type="button"
      className={`relative min-h-[170px] w-full overflow-hidden rounded-[28px] border border-white/80 bg-gradient-to-br ${color} p-4 text-left shadow-[0_12px_35px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 active:scale-[0.97]`}
    >
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/50 blur-xl" />

      {badge && (
        <span className="absolute right-3 top-3 rounded-full bg-green-500 px-2.5 py-1 text-[11px] font-black text-white shadow">
          {badge}
        </span>
      )}

      <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 text-3xl shadow-sm">
        {icon}
      </div>

      <h3 className="relative z-10 mt-5 text-[17px] font-black text-slate-950">
        {title}
      </h3>

      <p className="relative z-10 mt-1 text-[13px] font-bold leading-snug text-slate-600">
        {text}
      </p>

      <span className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-xl font-black text-blue-600 shadow-sm">
        →
      </span>
    </button>
  );
}

function BottomItem({
  to,
  icon,
  label,
  active,
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1"
    >
      <span
        className={`text-2xl ${
          active
            ? "text-blue-600"
            : "text-slate-500"
        }`}
      >
        {icon}
      </span>

      <span
        className={`text-sm font-bold ${
          active
            ? "text-blue-600"
            : "text-slate-500"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}