import {
  Link,
  useLocation,
} from "react-router-dom";

import Logo from "./Logo";
import NotificationBell from "./NotificationBell";

import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export default function Navbar({
  onLogout,
}) {
  const location = useLocation();

  const {
    darkMode,
    toggleTheme,
  } = useTheme();

  const {
    currentUser,
    userProfile,
  } = useAuth();

  const role = userProfile?.role;

  const isAdmin =
    role === "admin" ||
    currentUser?.email ===
      "campusmart05@gmail.com";

  const isVendor =
    role === "vendor";

  const isPGOwner =
    role === "pg-owner";

  const profilePhoto =
    userProfile?.profilePhoto ||
    userProfile?.photoURL ||
    userProfile?.profileImage ||
    userProfile?.imageUrl ||
    userProfile?.photo ||
    currentUser?.photoURL ||
    "";

  let dashboardLink = null;

  /*
   * Admin ko sabse pehle priority.
   */
  if (isAdmin) {
    dashboardLink = {
      to: "/admin",
      icon: "🛡️",
      mobileLabel: "Admin",
      desktopLabel:
        "Back to Admin Dashboard",
      className:
        "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-900/50 dark:bg-purple-950/40 dark:text-purple-300",
    };
  } else if (isPGOwner) {
    dashboardLink = {
      to: "/pg-owner",
      icon: "🏠",
      mobileLabel: "PG",
      desktopLabel:
        "Back to PG Dashboard",
      className:
        "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300",
    };
  } else if (isVendor) {
    dashboardLink = {
      to: "/vendor",
      icon: "🏪",
      mobileLabel: "Vendor",
      desktopLabel:
        "Back to Vendor Dashboard",
      className:
        "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-300",
    };
  }

  const alreadyOnDashboard =
    dashboardLink?.to ===
    location.pathname;

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4 md:px-6">
        <div className="flex items-center justify-between gap-2">
          <Link
            to="/home"
            className="min-w-0 flex-1 overflow-visible"
          >
            <div className="origin-left [zoom:0.58] min-[370px]:[zoom:0.63] min-[410px]:[zoom:0.7] sm:[zoom:0.9] md:[zoom:1]">
              <Logo dark={darkMode} />
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            {dashboardLink &&
              !alreadyOnDashboard && (
                <Link
                  to={dashboardLink.to}
                  className={`inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-xl border px-2 text-[10px] font-black shadow-sm transition active:scale-95 sm:h-11 sm:gap-1.5 sm:rounded-2xl sm:px-3 sm:text-sm ${dashboardLink.className}`}
                >
                  <span className="text-base leading-none">
                    {dashboardLink.icon}
                  </span>

                  <span className="sm:hidden">
                    {
                      dashboardLink.mobileLabel
                    }
                  </span>

                  <span className="hidden sm:inline">
                    {
                      dashboardLink.desktopLabel
                    }
                  </span>
                </Link>
              )}

            <button
              type="button"
              onClick={toggleTheme}
              title="Toggle Theme"
              aria-label="Toggle theme"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-lg shadow-sm transition active:scale-95 dark:border-slate-700 dark:bg-slate-800 sm:h-11 sm:w-11"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center sm:h-11 sm:w-11">
              <NotificationBell />
            </div>

            <Link
              to="/profile"
              aria-label="Open profile"
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-blue-600 bg-blue-50 text-lg shadow-sm transition active:scale-95 dark:bg-slate-800 sm:h-11 sm:w-11"
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
              onClick={onLogout}
              className="hidden rounded-2xl bg-red-500 px-4 py-2 text-sm font-black text-white transition hover:bg-red-600 active:scale-95 md:inline-flex"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}