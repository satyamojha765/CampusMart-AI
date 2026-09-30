import { Link } from "react-router-dom";
import Badge from "./ui/Badge";

export default function RecommendationCard({ product }) {
  return (
    <Link
      to={`/product/${product.id}`}
      className="group min-w-[210px] sm:min-w-[240px] overflow-hidden rounded-[1.6rem] sm:rounded-[1.8rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl active:scale-[0.98]"
    >
      <div className="relative h-40 sm:h-44 overflow-hidden bg-gradient-to-br from-slate-100 to-blue-50 dark:from-slate-800 dark:to-slate-900">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl">
            {product.icon || "📦"}
          </div>
        )}

        <div className="absolute top-3 left-3">
          <Badge variant="blue">{product.category || "Product"}</Badge>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <h3 className="line-clamp-2 min-h-[42px] text-[15px] sm:text-base font-black leading-tight text-slate-900 dark:text-white">
          {product.name}
        </h3>

        <p className="mt-2 text-xl sm:text-2xl font-black text-blue-600">
          ₹{product.price}
        </p>

        <div className="mt-2 flex items-center justify-between text-[12px] font-bold text-slate-500 dark:text-slate-400">
          <span className="truncate">
            📍 {product.city || "Campus Area"}
          </span>

          <span className="shrink-0">→</span>
        </div>
      </div>
    </Link>
  );
}