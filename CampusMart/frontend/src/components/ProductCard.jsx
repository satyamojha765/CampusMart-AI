import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function ProductCard({ product }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const productId = product?.id || "";
  const isSold = product?.status === "sold";
  const isFeatured = product?.featured === true;
  const isTrending = Number(product?.trendingScore || 0) > 0;

  const productImage =
    product?.image ||
    product?.images?.[0] ||
    "";

  const wishlistId =
    currentUser?.uid && productId
      ? `${currentUser.uid}_${productId}`
      : "";

  useEffect(() => {
    let active = true;

    async function checkWishlist() {
      if (!wishlistId) {
        if (active) setIsWishlisted(false);
        return;
      }

      try {
        const snapshot = await getDoc(
          doc(db, "wishlist", wishlistId)
        );

        if (active) {
          setIsWishlisted(snapshot.exists());
        }
      } catch (error) {
        console.warn(
          "Wishlist status check failed:",
          error?.code || error?.message
        );

        if (active) {
          setIsWishlisted(false);
        }
      }
    }

    checkWishlist();

    return () => {
      active = false;
    };
  }, [wishlistId]);

  function openProduct() {
    if (!productId) return;
    navigate(`/product/${productId}`);
  }

  function handleCardKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProduct();
    }
  }

  async function toggleWishlist(event) {
    event.preventDefault();
    event.stopPropagation();

    if (wishlistBusy) return;

    if (isSold) {
      alert("This product is sold out");
      return;
    }

    if (!currentUser?.uid) {
      alert("Please login first");
      return;
    }

    if (!productId || !wishlistId) {
      alert("Product details are not available.");
      return;
    }

    const previousState = isWishlisted;

    try {
      setWishlistBusy(true);
      setIsWishlisted(!previousState);

      const wishlistRef = doc(
        db,
        "wishlist",
        wishlistId
      );

      if (previousState) {
        await deleteDoc(wishlistRef);
        return;
      }

      await setDoc(wishlistRef, {
        userId: currentUser.uid,
        productId,
        createdAt: serverTimestamp(),
      });

      if (
        product?.ownerId &&
        product.ownerId !== currentUser.uid
      ) {
        try {
          await addDoc(
            collection(db, "notifications"),
            {
              userId: product.ownerId,
              type: "wishlist",
              icon: "❤️",
              title: "New wishlist activity",
              message: `${
                currentUser.displayName || "A student"
              } saved your product "${
                product?.name || "Campus Product"
              }".`,
              productId,
              read: false,
              createdAt: serverTimestamp(),
            }
          );
        } catch (notificationError) {
          console.warn(
            "Wishlist notification failed:",
            notificationError?.code ||
              notificationError?.message
          );
        }
      }
    } catch (error) {
      setIsWishlisted(previousState);

      console.error(
        "Wishlist update failed:",
        error
      );

      alert(
        error?.message ||
          "Wishlist update failed."
      );
    } finally {
      setWishlistBusy(false);
    }
  }

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={openProduct}
      onKeyDown={handleCardKeyDown}
      aria-label={`View ${product?.name || "product"} details`}
      className={`group h-full cursor-pointer overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-sm outline-none transition duration-300 focus-visible:ring-4 focus-visible:ring-blue-200 dark:border-slate-800 dark:bg-slate-900 dark:focus-visible:ring-blue-900/50 sm:rounded-[1.8rem] ${
        isSold
          ? "opacity-75"
          : "active:scale-[0.98] hover:-translate-y-1 hover:shadow-xl"
      }`}
    >
      <div className="relative aspect-[1/0.86] overflow-hidden bg-gradient-to-br from-slate-100 to-blue-50 dark:from-slate-800 dark:to-slate-900">
        {productImage && !imageFailed ? (
          <img
            src={productImage}
            alt={product?.name || "Campus Product"}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
            className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
              isSold ? "grayscale" : ""
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl sm:text-6xl">
            {product?.icon || "📦"}
          </div>
        )}

        <div className="absolute left-2 top-2 z-20 flex max-w-[70%] flex-col gap-1.5 sm:left-3 sm:top-3">
          <span className="w-fit max-w-full truncate rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-black text-white shadow sm:px-3 sm:text-[11px]">
            {product?.category || "Product"}
          </span>

          {isFeatured && (
            <span className="w-fit rounded-full bg-yellow-400 px-2.5 py-1 text-[10px] font-black text-slate-950 shadow sm:px-3 sm:text-[11px]">
              ⭐ Featured
            </span>
          )}

          {isTrending && !isFeatured && (
            <span className="w-fit rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-black text-white shadow sm:px-3 sm:text-[11px]">
              🔥 Hot
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={toggleWishlist}
          disabled={isSold || wishlistBusy}
          aria-label={
            isWishlisted
              ? "Remove from wishlist"
              : "Add to wishlist"
          }
          className={`absolute right-2 top-2 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-lg shadow-lg backdrop-blur transition sm:right-3 sm:top-3 sm:h-10 sm:w-10 sm:text-xl ${
            isSold || wishlistBusy
              ? "cursor-not-allowed opacity-60"
              : "active:scale-90 hover:scale-110"
          }`}
        >
          {wishlistBusy
            ? "…"
            : isSold
            ? "🚫"
            : isWishlisted
            ? "❤️"
            : "♡"}
        </button>

        {isSold && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45">
            <span className="rounded-2xl bg-red-600 px-4 py-2 text-base font-black text-white shadow-lg sm:text-lg">
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <div className="mb-2 flex items-center gap-1.5 overflow-hidden">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
              isSold
                ? "bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300"
                : "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
            }`}
          >
            {isSold ? "Sold" : "Available"}
          </span>
        </div>

        <h3 className="line-clamp-2 min-h-[38px] text-[14px] font-black leading-tight text-slate-950 dark:text-white sm:min-h-[42px] sm:text-base">
          {product?.name || "Campus Product"}
        </h3>

        <h2 className="mt-2 text-[19px] font-black text-blue-600 sm:text-2xl">
          ₹{product?.price || "0"}
        </h2>

        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 sm:text-[12px]">
          <span className="truncate">
            📍 {product?.city || "Campus Area"}
          </span>

          <span className="shrink-0">
            👁 {product?.views || 0}
          </span>
        </div>
      </div>
    </article>
  );
}