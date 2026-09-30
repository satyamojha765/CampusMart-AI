import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ALLOWED_ROLES = [
  "pg-owner",
  "admin",
];

export default function PGOwnerRoute({
  children,
}) {
  const {
    currentUser,
    userProfile,
    checkingUser,
  } = useAuth();

  if (checkingUser) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 dark:border-slate-800 dark:border-t-blue-500" />

          <p className="mt-4 font-black text-slate-700 dark:text-slate-200">
            Loading dashboard...
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
      />
    );
  }

  const normalizedRole = String(
    userProfile?.role || ""
  )
    .trim()
    .toLowerCase();

  if (
    !ALLOWED_ROLES.includes(
      normalizedRole
    )
  ) {
    return (
      <Navigate
        to="/home"
        replace
      />
    );
  }

  return children;
}