import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function VendorRoute({ children }) {
  const { currentUser, userProfile, checkingUser } = useAuth();

  if (checkingUser) {
    return (
      <div className="min-h-screen grid place-items-center font-black">
        Loading...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (userProfile?.role !== "vendor" && userProfile?.role !== "admin") {
    return <Navigate to="/home" replace />;
  }

  return children;
}