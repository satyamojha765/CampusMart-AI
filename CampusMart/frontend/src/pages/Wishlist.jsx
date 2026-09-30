import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";

export default function Wishlist({ products = [], onLogout }) {
  const { currentUser } = useAuth();

  const [productWishlist, setProductWishlist] = useState([]);
  const [pgWishlist, setPGWishlist] = useState([]);

  const [productWishlistDocs, setProductWishlistDocs] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingPGs, setLoadingPGs] = useState(true);

  const [activeTab, setActiveTab] = useState("products");

  useEffect(() => {
    if (!currentUser) {
      setProductWishlistDocs([]);
      setLoadingProducts(false);
      return;
    }

    setLoadingProducts(true);

    const productQuery = query(
      collection(db, "wishlist"),
      where("userId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      productQuery,
      (snapshot) => {
        const documents = snapshot.docs.map((item) => ({
          wishlistDocId: item.id,
          productId: item.data().productId,
        }));

        setProductWishlistDocs(documents);
        setLoadingProducts(false);
      },
      (error) => {
        console.error("Product wishlist load error:", error);
        setProductWishlistDocs([]);
        setLoadingProducts(false);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  useEffect(() => {
    const matchedProducts = productWishlistDocs
      .map((wish) => {
        const product = products.find(
          (item) => item.id === wish.productId
        );

        if (!product) {
          return null;
        }

        return {
          ...product,
          wishlistDocId: wish.wishlistDocId,
        };
      })
      .filter(Boolean);

    setProductWishlist(matchedProducts);
  }, [productWishlistDocs, products]);

  useEffect(() => {
    if (!currentUser) {
      setPGWishlist([]);
      setLoadingPGs(false);
      return;
    }

    setLoadingPGs(true);

    const pgQuery = query(
      collection(db, "pgWishlist"),
      where("userId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      pgQuery,
      (snapshot) => {
        const list = snapshot.docs.map((item) => ({
          wishlistDocId: item.id,
          ...item.data(),
        }));

        setPGWishlist(list);
        setLoadingPGs(false);
      },
      (error) => {
        console.error("PG wishlist load error:", error);
        setPGWishlist([]);
        setLoadingPGs(false);
      }
    );

    return unsubscribe;
  }, [currentUser]);

  async function removeProductWishlist(item) {
    try {
      await deleteDoc(doc(db, "wishlist", item.wishlistDocId));
    } catch (error) {
      console.error("Product wishlist remove error:", error);
      alert(error.message);
    }
  }

  async function removePGWishlist(item) {
    try {
      await deleteDoc(doc(db, "pgWishlist", item.wishlistDocId));
    } catch (error) {
      console.error("PG wishlist remove error:", error);
      alert(error.message);
    }
  }

  const loading =
    activeTab === "products" ? loadingProducts : loadingPGs;

  const currentItems =
    activeTab === "products" ? productWishlist : pgWishlist;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar onLogout={onLogout} />

      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <section className="relative mb-5 overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 via-blue-500 to-amber-400 p-[1px] shadow-xl shadow-blue-500/10 sm:mb-8 sm:rounded-[2.5rem]">
          <div className="rounded-[2rem] bg-white/95 p-5 backdrop-blur-xl dark:bg-slate-900/95 sm:rounded-[2.5rem] sm:p-8">
            <p className="text-sm font-black text-blue-600">
              CampusMart
            </p>

            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-5xl">
              My Wishlist
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
              Your saved products and PG listings appear here.
            </p>
          </div>
        </section>

        <div className="mb-5 grid grid-cols-2 gap-3 rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`rounded-[18px] px-4 py-3 text-sm font-black transition ${
              activeTab === "products"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Products ({productWishlist.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pgs")}
            className={`rounded-[18px] px-4 py-3 text-sm font-black transition ${
              activeTab === "pgs"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            PGs ({pgWishlist.length})
          </button>
        </div>

        {loading ? (
          <WishlistSkeleton />
        ) : currentItems.length === 0 ? (
          <EmptyWishlist activeTab={activeTab} />
        ) : activeTab === "products" ? (
          <div className="space-y-3 sm:space-y-4">
            {productWishlist.map((item) => (
              <ProductWishlistCard
                key={item.wishlistDocId}
                item={item}
                onRemove={removeProductWishlist}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pgWishlist.map((item) => (
              <PGWishlistCard
                key={item.wishlistDocId}
                item={item}
                onRemove={removePGWishlist}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ProductWishlistCard({ item, onRemove }) {
  const image =
    item.image ||
    item.images?.[0] ||
    "";

  return (
    <Card className="overflow-hidden rounded-[1.5rem] p-3 transition hover:-translate-y-0.5 hover:shadow-xl sm:rounded-[2rem] sm:p-5">
      <div className="flex gap-3 sm:gap-5">
        <Link
          to={`/product/${item.id}`}
          className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-4xl dark:bg-slate-800 sm:h-28 sm:w-28"
        >
          {image ? (
            <img
              src={image}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            item.icon || "📦"
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge variant="blue">
              {item.category || "Product"}
            </Badge>

            <Badge variant="green">Saved</Badge>
          </div>

          <Link to={`/product/${item.id}`}>
            <h3 className="line-clamp-2 text-base font-black hover:text-blue-600 sm:text-2xl">
              {item.name}
            </h3>
          </Link>

          <p className="mt-1 text-xl font-black text-blue-600 sm:text-2xl">
            ₹{Number(item.price || 0).toLocaleString("en-IN")}
          </p>

          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            📍 {item.city || "Campus Area"}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:gap-3">
            <Link
              to={`/product/${item.id}`}
              className="rounded-2xl bg-blue-600 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-blue-700 active:scale-95 sm:px-5"
            >
              View
            </Link>

            <Button
              variant="danger"
              onClick={() => onRemove(item)}
              className="text-sm"
            >
              Remove
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function PGWishlistCard({ item, onRemove }) {
  const image =
    item.image ||
    item.images?.[0] ||
    "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=80";

  const sharing = Array.isArray(item.sharing)
    ? item.sharing.map(capitalize).join(" / ")
    : capitalize(item.sharing || "Flexible");

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
        <Link
          to={`/pg/${item.pgId}`}
          className="block h-full w-full"
        >
          <img
            src={image}
            alt={item.name || "PG"}
            className="h-full w-full object-cover transition duration-500 hover:scale-105"
          />
        </Link>

        <button
          type="button"
          onClick={() => onRemove(item)}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-xl font-black text-red-500 shadow-lg backdrop-blur transition active:scale-90"
          aria-label="Remove PG from wishlist"
        >
          ♥
        </button>

        {Number(item.availableBeds) > 0 && (
          <span className="absolute bottom-3 left-3 rounded-full bg-slate-950/80 px-3 py-1.5 text-xs font-black text-white backdrop-blur">
            🛏 {item.availableBeds} beds left
          </span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/pg/${item.pgId}`}>
              <h3 className="truncate text-lg font-black hover:text-blue-600">
                {item.name || "Student PG"}
              </h3>
            </Link>

            <p className="mt-1 truncate text-sm font-semibold text-slate-500">
              📍 {item.location || "Asansol"}
            </p>
          </div>

          {item.verified && (
            <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1.5 text-[11px] font-black text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              ✓ Verified
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black capitalize text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            {item.gender || "Students"}
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {sharing}
          </span>

          {item.foodIncluded && (
            <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
              🍛 Food
            </span>
          )}
        </div>

        <div className="mt-5 flex items-end justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div>
            <p className="text-xs font-bold text-slate-400">
              Monthly rent
            </p>

            <p className="mt-1 text-xl font-black">
              ₹{Number(item.rent || 0).toLocaleString("en-IN")}
              <span className="text-xs font-bold text-slate-400">
                {" "}
                / month
              </span>
            </p>
          </div>

          <Link
            to={`/pg/${item.pgId}`}
            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20"
          >
            View →
          </Link>
        </div>
      </div>
    </article>
  );
}

function EmptyWishlist({ activeTab }) {
  const isProducts = activeTab === "products";

  return (
    <div className="flex min-h-[45vh] items-center justify-center">
      <Card className="w-full max-w-md rounded-[2rem] p-8 text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 text-4xl dark:bg-red-950/30">
          {isProducts ? "❤️" : "🏠"}
        </div>

        <h2 className="text-2xl font-black">
          {isProducts
            ? "No saved products"
            : "No saved PGs"}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {isProducts
            ? "Products ke heart icon par tap karke unhe yahan save karo."
            : "PG listing ya details page ke heart icon se PG save karo."}
        </p>

        <Link
          to={isProducts ? "/home" : "/pg"}
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 active:scale-95"
        >
          {isProducts ? "Explore Products" : "Explore PGs"}
        </Link>
      </Card>
    </div>
  );
}

function WishlistSkeleton() {
  return (
    <div className="space-y-3 sm:space-y-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card
          key={index}
          className="overflow-hidden rounded-[1.5rem] p-3 sm:rounded-[2rem] sm:p-5"
        >
          <div className="flex gap-3 sm:gap-5">
            <div className="h-24 w-24 shrink-0 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800 sm:h-28 sm:w-28" />

            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex gap-2">
                <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>

              <div className="h-5 w-3/4 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />

              <div className="grid grid-cols-2 gap-2 pt-2 sm:flex sm:gap-3">
                <div className="h-11 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800 sm:w-24" />
                <div className="h-11 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800 sm:w-24" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function capitalize(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}