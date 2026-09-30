import { useState } from "react";
import { Link } from "react-router-dom";

export default function RecommendationCard({ product }) {
  const [imageError, setImageError] = useState(false);

  const isSold = product?.status === "sold";
  const productImage =
    product?.image ||
    product?.images?.[0] ||
    "";

  return (
    <Link
      to={`/product/${product?.id}`}
      aria-label={`View ${
        product?.name || "recommended product"
      } details`}
      className={`group min-w-[210px] overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm outline-none transition-all duration-300 focus-visible:ring-4 focus-visible:ring-blue-200 dark:border-slate-800 dark:bg-slate-900 dark:focus-visible:ring-blue-900/50 sm:min-w-[240px] sm:rounded-[1.8rem] ${
        isSold
          ? "opacity-75"
          : "hover:-translate-y-1 hover:shadow-xl active:scale-[0.98]"
      }`}
    >
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-slate-100 to-blue-50 dark:from-slate-800 dark:to-slate-900 sm:h-44">
        {productImage && !imageError ? (
          <img
            src={productImage}
            alt={
              product?.name ||
              "Recommended product"
            }
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
              isSold ? "grayscale" : ""
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl">
            {product?.icon || "📦"}
          </div>
        )}

        <div className="absolute left-3 top-3 z-20 flex max-w-[70%] flex-col gap-2">
          <span className="w-fit max-w-full truncate rounded-full bg-blue-600 px-3 py-1 text-[11px] font-black text-white shadow">
            {product?.category || "Product"}
          </span>

          {product?.featured === true && (
            <span className="w-fit rounded-full bg-yellow-400 px-3 py-1 text-[11px] font-black text-slate-950 shadow">
              ⭐ Featured
            </span>
          )}
        </div>

        {isSold && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/45">
            <span className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-black text-white shadow-lg">
              SOLD OUT
            </span>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <div className="mb-2">
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

        <h3 className="line-clamp-2 min-h-[42px] text-[15px] font-black leading-tight text-slate-900 dark:text-white sm:text-base">
          {product?.name || "Campus Product"}
        </h3>

        <p className="mt-2 text-xl font-black text-blue-600 sm:text-2xl">
          ₹{product?.price || "0"}
        </p>

        <div className="mt-2 flex items-center justify-between gap-3 text-[12px] font-bold text-slate-500 dark:text-slate-400">
          <span className="truncate">
            📍 {product?.city || "Campus Area"}
          </span>

          <span className="shrink-0">
            👁 {product?.views || 0}
          </span>
        </div>
      </div>
    </Link>
  );
}