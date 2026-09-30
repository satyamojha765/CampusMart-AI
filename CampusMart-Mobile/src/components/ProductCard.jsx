import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function ProductCard({ product }) {
  const { currentUser } = useAuth();
  const [isWishlisted, setIsWishlisted] = useState(false);

  const isSold = product.status === "sold";
  const isFeatured = product.featured === true;
  const isTrending = product.trendingScore && product.trendingScore > 0;

  const wishlistId = currentUser ? `${currentUser.uid}_${product.id}` : "";

  useEffect(() => {
    async function checkWishlist() {
      if (!currentUser || !product.id) return;

      const ref = doc(db, "wishlist", wishlistId);
      const snap = await getDoc(ref);
      setIsWishlisted(snap.exists());
    }

    checkWishlist();
  }, [currentUser, product.id, wishlistId]);

  async function toggleWishlist(e) {
    e.preventDefault();
    e.stopPropagation();

    if (isSold) {
      alert("This product is sold out");
      return;
    }

    if (!currentUser) return alert("Please login first");

    try {
      const ref = doc(db, "wishlist", wishlistId);

      if (isWishlisted) {
        await deleteDoc(ref);
        setIsWishlisted(false);
        return;
      }

      await setDoc(ref, {
        userId: currentUser.uid,
        productId: product.id,
        createdAt: serverTimestamp(),
      });

      if (product.ownerId && product.ownerId !== currentUser.uid) {
        await addDoc(collection(db, "notifications"), {
          userId: product.ownerId,
          type: "wishlist",
          icon: "❤️",
          title: "New wishlist activity",
          message: `${
            currentUser.displayName || "A student"
          } saved your product "${product.name}".`,
          productId: product.id,
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      setIsWishlisted(true);
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <Link
      to={`/product/${product.id}`}
      className={`group block h-full select-none overflow-hidden rounded-[1.5rem] sm:rounded-[1.8rem] border border-slate-200/80 bg-white shadow-sm transition-all duration-300 touch-manipulation [-webkit-tap-highlight-color:transparent] dark:border-slate-800 dark:bg-slate-900 ${
        isSold
          ? "opacity-75"
          : "active:scale-[0.98] hover:-translate-y-1 hover:shadow-xl"
      }`}
    >
      <div className="relative aspect-[1/0.86] overflow-hidden bg-gradient-to-br from-slate-100 to-blue-50 dark:from-slate-800 dark:to-slate-900">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            referrerPolicy="no-referrer"
            className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
              isSold ? "grayscale" : ""
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl sm:text-6xl">
            {product.icon || "📦"}
          </div>
        )}

        <div className="absolute left-2 top-2 sm:left-3 sm:top-3 flex max-w-[70%] flex-col gap-1.5">
          <span className="w-fit truncate rounded-full bg-blue-600 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-black text-white shadow">
            {product.category || "Product"}
          </span>

          {isFeatured && (
            <span className="w-fit rounded-full bg-yellow-400 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-black text-slate-950 shadow">
              ⭐ Featured
            </span>
          )}

          {isTrending && !isFeatured && (
            <span className="w-fit rounded-full bg-orange-500 px-2.5 sm:px-3 py-1 text-[10px] sm:text-[11px] font-black text-white shadow">
              🔥 Hot
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={toggleWishlist}
          disabled={isSold}
          className={`absolute right-2 top-2 sm:right-3 sm:top-3 z-40 flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 border-black/20 bg-white/95 text-lg sm:text-xl shadow-xl backdrop-blur-md transition-all duration-200 ${
            isSold 
              ? "cursor-not-allowed opacity-60"
              : "active:scale-90 hover:scale-110 hover:border-black/40"
}`}
        >
          {isSold ? "🚫" : isWishlisted ? "❤️" : "🤍"}
        </button>

        {isSold && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45">
            <span className="rounded-2xl bg-red-600 px-4 py-2 text-base sm:text-lg font-black text-white shadow-lg">
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <div className="mb-2 flex items-center gap-1.5 overflow-hidden">
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-black text-green-700">
            Verified
          </span>

          {isSold && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-600">
              Sold
            </span>
          )}
        </div>

        <h3 className="line-clamp-2 min-h-[38px] sm:min-h-[42px] text-[14px] sm:text-base font-black leading-tight text-slate-950 dark:text-white">
          {product.name || "Campus Product"}
        </h3>

        <h2 className="mt-2 text-[19px] sm:text-2xl font-black text-blue-600">
          ₹{product.price || "0"}
        </h2>

        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] sm:text-[12px] font-bold text-slate-500 dark:text-slate-400">
          <span className="truncate">📍 {product.city || "Campus Area"}</span>
          <span className="shrink-0">👁 {product.views || 0}</span>
        </div>
      </div>
    </Link>
  );
}