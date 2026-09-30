import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ChefHat,
  Clock3,
  MapPin,
  Star,
  Utensils,
} from "lucide-react";

export default function CookFeatureCard() {
  const navigate = useNavigate();

  return (
    <section className="mx-4 mt-5 overflow-hidden rounded-[28px] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-yellow-50 shadow-sm sm:mx-0">
      <button
        type="button"
        onClick={() => navigate("/pg/cooks")}
        className="w-full p-5 text-left transition active:scale-[0.99]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200">
            <ChefHat size={29} />
          </div>

          <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold text-orange-700">
                Student Service
              </span>

              <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                Find a Cook
              </h2>

              <p className="mt-1 text-sm leading-5 text-slate-600">
                Apne PG ya room ke liye trusted cook find karo.
              </p>
            </div>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
              <ArrowRight size={20} />
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/80 p-3 text-center">
            <MapPin size={18} className="mx-auto text-orange-500" />
            <p className="mt-1.5 text-[11px] font-bold text-slate-700">
              Nearby Cooks
            </p>
          </div>

          <div className="rounded-2xl bg-white/80 p-3 text-center">
            <Utensils size={18} className="mx-auto text-orange-500" />
            <p className="mt-1.5 text-[11px] font-bold text-slate-700">
              Veg & Non-Veg
            </p>
          </div>

          <div className="rounded-2xl bg-white/80 p-3 text-center">
            <Star size={18} className="mx-auto text-orange-500" />
            <p className="mt-1.5 text-[11px] font-bold text-slate-700">
              Rated Profiles
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-900 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <Clock3 size={17} className="text-yellow-400" />

            <span className="text-sm font-semibold">
              Timing, price and special dishes check karo
            </span>
          </div>

          <ArrowRight size={18} className="shrink-0" />
        </div>
      </button>
    </section>
  );
}