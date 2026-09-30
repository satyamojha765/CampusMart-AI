import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { currentUser, checkingUser } = useAuth();
  const location = useLocation();

  if (checkingUser) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-white">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-500" />

          <h2 className="mt-5 text-xl font-black">
            Checking your account...
          </h2>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Please wait while CampusMart prepares your page.
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

  return children;
}