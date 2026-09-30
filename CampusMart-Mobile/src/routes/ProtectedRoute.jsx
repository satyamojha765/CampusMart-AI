import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { currentUser, checkingUser } = useAuth();

  if (checkingUser) return <h2 style={{ padding: 40 }}>Loading...</h2>;

  if (!currentUser) return <Navigate to="/login" />;

  return children;
}