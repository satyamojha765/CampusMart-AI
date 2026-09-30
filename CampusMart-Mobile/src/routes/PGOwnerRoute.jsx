import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PGOwnerRoute({
  children,
}) {
  const {
    currentUser,
    userProfile,
    checkingUser,
    profileLoading,
  } = useAuth();

  /*
   * Auth ke saath Firestore profile ka bhi
   * wait karna zaroori hai, kyunki role
   * users/{uid} document mein stored hai.
   */
  const checkingAccess =
    checkingUser ||
    Boolean(currentUser && profileLoading);

  if (checkingAccess) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-[#2563EB]">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-white shadow-2xl">
            <span className="text-3xl font-black tracking-tight text-[#2563EB]">
              CM
            </span>
          </div>

          <p className="mt-4 text-lg font-black text-white">
            CampusMart
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

  const allowedRoles = [
    "pg-owner",
    "admin",
  ];

  if (
    !allowedRoles.includes(
      userProfile?.role
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