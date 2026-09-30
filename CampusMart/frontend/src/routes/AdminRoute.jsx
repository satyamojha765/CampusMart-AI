import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ADMIN_EMAILS = [
  "campusmart05@gmail.com",
];

export default function AdminRoute({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    currentUser,
    userProfile,
    checkingUser,
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
    ADMIN_EMAILS.includes(loggedInEmail);

  if (checkingUser) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-purple-600 dark:border-slate-700 dark:border-t-purple-500" />

          <h2 className="mt-5 text-xl font-black">
            Checking admin access...
          </h2>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Please wait while CampusMart verifies your account.
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-red-100 bg-white p-8 text-center shadow-sm dark:border-red-900/40 dark:bg-slate-900">
          <div className="text-6xl">
            🛡️
          </div>

          <h1 className="mt-4 text-3xl font-black">
            Access Denied
          </h1>

          <p className="mt-3 text-slate-500 dark:text-slate-400">
            You are not allowed to open the CampusMart admin dashboard.
          </p>

          <div className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Logged in as:{" "}
            <span className="break-all text-blue-600">
              {loggedInEmail || "Unknown email"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate("/home")}
            className="mt-6 w-full rounded-2xl bg-blue-600 px-5 py-3.5 font-black text-white shadow-md transition hover:bg-blue-700 active:scale-[0.98]"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return children;
}