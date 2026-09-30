import { Link } from "react-router-dom";

export default function Logo({ dark = false }) {
  return (
    <Link to="/" className="flex items-center gap-3 no-underline">
      <div className="h-11 w-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl shadow-lg">
        🛍️
      </div>

      <div>
        <h1
          className={`text-2xl font-extrabold leading-none ${
            dark ? "text-white" : "text-slate-900"
          }`}
        >
          Campus<span className="text-blue-600">Mart</span>
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Student Marketplace
        </p>
      </div>
    </Link>
  );
}