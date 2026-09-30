import { Link } from "react-router-dom";
import Logo from "./Logo";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

const ADMIN_EMAIL = "campusmart05@gmail.com";

export default function Navbar({ onLogout }) {
  const { darkMode, toggleTheme } =
    useTheme();

  const {
    currentUser,
    userProfile,
  } = useAuth();

  const loggedInEmail = String(
    currentUser?.email || ""
  )
    .trim()
    .toLowerCase();

  const normalizedRole = String(
    userProfile?.role || ""
  )
    .trim()
    .toLowerCase();

  const isAdmin =
    normalizedRole === "admin" ||
    loggedInEmail === ADMIN_EMAIL;

  /*
   * Role-based dashboard separation:
   * vendor   -> Tiffin Vendor Dashboard
   * pg-owner -> PG Owner Dashboard
   *
   * vendorId ko role fallback ke roop mein use nahi karna hai,
   * kyunki PG owner profile mein purana vendorId reh sakta hai.
   */
  const isVendor =
    normalizedRole === "vendor";

  const isPGOwner =
    normalizedRole === "pg-owner";

  const canOpenVendorDashboard =
    isVendor || isAdmin;

  const canOpenPGOwnerDashboard =
    isPGOwner || isAdmin;

  const profilePhoto =
    userProfile?.profilePhoto ||
    userProfile?.photoURL ||
    userProfile?.profileImage ||
    userProfile?.imageUrl ||
    userProfile?.photo ||
    currentUser?.photoURL ||
    "";

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4 md:px-6">
        <div className="flex items-center justify-between gap-3">
          {/*
           * Logo component ke andar already Link hai,
           * isliye ise dobara Link ke andar wrap nahi karna.
           */}
          <div className="flex min-w-0 items-center">
            <Logo dark={darkMode} />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden rounded-2xl bg-purple-600 px-3 py-2 text-sm font-black text-white shadow-sm sm:inline-flex"
              >
                Admin
              </Link>
            )}

            {canOpenPGOwnerDashboard && (
              <Link
                to="/pg-owner"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-blue-600 px-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 active:scale-95 sm:h-auto sm:rounded-2xl sm:px-3 sm:py-2"
                title="PG Owner Dashboard"
                aria-label="Open PG Owner Dashboard"
              >
                <span aria-hidden="true">
                  🏠
                </span>

                <span className="hidden sm:inline">
                  PG Dashboard
                </span>
              </Link>
            )}

            {canOpenVendorDashboard && (
              <Link
                to="/vendor"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-orange-600 px-3 text-sm font-black text-white shadow-sm transition hover:bg-orange-700 active:scale-95 sm:h-auto sm:rounded-2xl sm:px-3 sm:py-2"
                title="Tiffin Vendor Dashboard"
                aria-label="Open Tiffin Vendor Dashboard"
              >
                <span aria-hidden="true">
                  🍱
                </span>

                <span className="hidden sm:inline">
                  Vendor Dashboard
                </span>
              </Link>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-lg shadow-sm transition active:scale-95 dark:bg-slate-800"
              title="Toggle Theme"
              aria-label="Toggle Theme"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            <NotificationBell />

            <Link
              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-blue-600 bg-blue-50 text-lg shadow-sm transition active:scale-95 dark:bg-slate-800"
              to="/profile"
              aria-label="Open Profile"
            >
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="Profile"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                "👤"
              )}
            </Link>

            <button
              type="button"
              className="hidden rounded-2xl bg-red-500 px-4 py-2 text-sm font-black text-white transition hover:bg-red-600 md:inline-flex"
              onClick={onLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}