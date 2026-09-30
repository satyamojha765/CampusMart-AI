import { useEffect, useState } from "react";

import {
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

import {
  collection,
  getDocs,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";

import { db } from "./firebase";

import { useAuth } from "./context/AuthContext";

import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import VendorRoute from "./routes/VendorRoute";
import PGOwnerRoute from "./routes/PGOwnerRoute";

import ScrollToTop from "./components/ScrollToTop";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import SellProduct from "./pages/SellProduct";
import ProductDetails from "./pages/ProductDetails";
import Chat from "./pages/Chat";
import Chats from "./pages/Chats";
import Notifications from "./pages/Notifications";
import AdminDashboard from "./pages/AdminDashboard";
import AdminReportFileOrders from "./pages/AdminReportFileOrders";
import Wishlist from "./pages/Wishlist";

import Tiffin from "./pages/Tiffin";
import TiffinSubscribe from "./pages/TiffinSubscribe";
import VendorDashboard from "./pages/VendorDashboard";

import ReportFileOrder from "./pages/ReportFileOrder";

import PG from "./pages/PG";
import PGDetails from "./pages/PGDetails";
import PGOwnerDashboard from "./pages/PGOwnerDashboard";
import TiffinVendorDetails from "./pages/TiffinVendorDetails";
import FindCooks from "./pages/FindCooks";
import CookDetails from "./pages/CookDetails";
import AddCook from "./pages/AddCook";
import ManageCooks from "./pages/ManageCooks";

function App() {
  const navigate = useNavigate();

  const {
    currentUser,
    logout,
  } = useAuth();

  const [products, setProducts] = useState([]);

  async function fetchProducts() {
    try {
      const querySnapshot = await getDocs(
        collection(db, "products")
      );

      const list = querySnapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setProducts(list);
    } catch (error) {
      console.error(
        "Products loading error:",
        error
      );

      setProducts([]);
    }
  }

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const list = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .sort((a, b) => {
            const timeA =
              a.createdAt?.seconds ||
              a.createdAt?.toMillis?.() ||
              0;

            const timeB =
              b.createdAt?.seconds ||
              b.createdAt?.toMillis?.() ||
              0;

            return timeB - timeA;
          });

        setProducts(list);
      },
      (error) => {
        console.error(
          "Realtime products listener error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, []);

  async function deleteProduct(productId) {
    try {
      await deleteDoc(
        doc(
          db,
          "products",
          productId
        )
      );
    } catch (error) {
      console.error(
        "Product delete error:",
        error
      );
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  }

  return (
    <>
      <ScrollToTop />

      <Routes>
        <Route
          path="/"
          element={
            currentUser ? (
              <Navigate
                to="/home"
                replace
              />
            ) : (
              <Landing />
            )
          }
        />

        <Route
          path="/login"
          element={
            currentUser ? (
              <Navigate
                to="/home"
                replace
              />
            ) : (
              <Login
                onLogin={() =>
                  navigate("/home")
                }
              />
            )
          }
        />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home
                products={products}
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/sell"
          element={
            <ProtectedRoute>
              <SellProduct
                fetchProducts={fetchProducts}
                currentUser={currentUser}
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/wishlist"
          element={
            <ProtectedRoute>
              <Wishlist
                products={products}
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile
                products={products}
                currentUser={currentUser}
                deleteProduct={deleteProduct}
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/product/:id"
          element={
            <ProtectedRoute>
              <ProductDetails
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chats"
          element={
            <ProtectedRoute>
              <Chats
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/chat/:chatId"
          element={
            <ProtectedRoute>
              <Chat
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard
                onLogout={handleLogout}
              />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/report-file-orders"
          element={
            <AdminRoute>
              <AdminReportFileOrders />
            </AdminRoute>
          }
        />

        {/* Tiffin vendors listing */}
        <Route
          path="/tiffin"
          element={
            <ProtectedRoute>
              <Tiffin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pg/cooks"
          element={
            <ProtectedRoute>
              <FindCooks />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pg/cooks/:cookId"
          element={
            <ProtectedRoute>
              <CookDetails />
            </ProtectedRoute>
          }
        />

        {/* Selected vendor details */}
        <Route
          path="/tiffin/:vendorId"
          element={
            <ProtectedRoute>
              <TiffinVendorDetails />
            </ProtectedRoute>
          }
        />

        {/* Old subscription URL support */}
        <Route
          path="/subscribe-tiffin"
          element={
            <ProtectedRoute>
              <TiffinSubscribe />
            </ProtectedRoute>
          }
        />

        {/* Dynamic vendor subscription */}
        <Route
          path="/subscribe-tiffin/:vendorId"
          element={
            <ProtectedRoute>
              <TiffinSubscribe />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vendor"
          element={
            <VendorRoute>
              <VendorDashboard />
            </VendorRoute>
          }
        />

        <Route
          path="/report-file"
          element={
            <ProtectedRoute>
              <ReportFileOrder />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pg"
          element={
            <ProtectedRoute>
              <PG
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pg/:id"
          element={
            <ProtectedRoute>
              <PGDetails
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pg-owner"
          element={
            <PGOwnerRoute>
              <PGOwnerDashboard />
            </PGOwnerRoute>
          }
        />
        <Route
          path="/admin/add-cook"
          element={
            <AdminRoute>
              <AddCook />
            </AdminRoute>
          }
        />

        <Route
          path="/admin/manage-cooks"
          element={
            <AdminRoute>
              <ManageCooks />
            </AdminRoute>
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/home"
              replace
            />
          }
        />
      </Routes>
    </>
  );
}

export default App;