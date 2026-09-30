import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ADMIN_EMAILS = [
  "campusmart05@gmail.com",
];

export default function AdminRoute({
  children,
}) {
  const {
    currentUser,
    userProfile,
    checkingUser,
    profileLoading,
  } = useAuth();

  const resolvingAccess =
    checkingUser ||
    Boolean(currentUser && profileLoading);

  if (resolvingAccess) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-[#2563EB]">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-white shadow-2xl">
            <span className="text-3xl font-black text-[#2563EB]">
              CM
            </span>
          </div>

          <p className="mt-4 font-black text-white">
            Checking admin access...
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

  const isAdminEmail =
    ADMIN_EMAILS.includes(
      currentUser.email
    );

  const isAdminRole =
    userProfile?.role === "admin";

  const isAdmin =
    isAdminEmail || isAdminRole;

  if (!isAdmin) {
    return (
      <Navigate
        to="/home"
        replace
      />
    );
  }

  return children;
}