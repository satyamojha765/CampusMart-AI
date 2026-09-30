import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  collection,
  getDocs,
  getDocsFromCache,
  deleteDoc,
  doc,
} from "firebase/firestore";

import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

import {
  StatusBar,
  Style,
} from "@capacitor/status-bar";

import { db } from "./firebase";

import { useAuth } from "./context/AuthContext";

import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute";
import VendorRoute from "./routes/VendorRoute";
import PGOwnerRoute from "./routes/PGOwnerRoute";

import ScrollToTop from "./components/ScrollToTop";
import PushNotificationManager from "./components/PushNotificationManager";

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

function StartupScreen() {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#2563EB]">
      <div className="flex flex-col items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-white shadow-2xl">
          <span className="text-3xl font-black tracking-tight text-[#2563EB]">
            CM
          </span>
        </div>

        <p className="mt-4 text-xl font-bold tracking-tight text-white">
          CampusMart
        </p>
      </div>
    </div>
  );
}

function mapProductSnapshot(snapshot) {
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    currentUser,
    userProfile,
    checkingUser,
    profileLoading,
    logout,
  } = useAuth();

  const [products, setProducts] =
    useState([]);

  const [
    showExitMessage,
    setShowExitMessage,
  ] = useState(false);

  const lastBackPressRef = useRef(0);
  const exitMessageTimerRef =
    useRef(null);

  const productsRequestIdRef =
    useRef(0);

  /*
   * Login/app open hone par role ke according
   * starting dashboard decide hoga.
   */
  function getLoggedInStartPath() {
    const role = userProfile?.role;

    const isAdmin =
      role === "admin" ||
      currentUser?.email ===
        "campusmart05@gmail.com";

    if (isAdmin) {
      return "/admin";
    }

    if (role === "pg-owner") {
      return "/pg-owner";
    }

    if (role === "vendor") {
      return "/vendor";
    }

    return "/home";
  }

  /*
   * Cached products pehle, latest products
   * background mein.
   */
  async function fetchProducts({
    skipCache = false,
  } = {}) {
    const requestId =
      ++productsRequestIdRef.current;

    const productsRef =
      collection(db, "products");

    let cachedProductsLoaded = false;

    if (!skipCache) {
      try {
        const cachedSnapshot =
          await getDocsFromCache(
            productsRef
          );

        if (
          requestId !==
          productsRequestIdRef.current
        ) {
          return;
        }

        const cachedList =
          mapProductSnapshot(
            cachedSnapshot
          );

        if (cachedList.length > 0) {
          setProducts(cachedList);
          cachedProductsLoaded = true;
        }
      } catch (error) {
        console.log(
          "Products cache unavailable:",
          error
        );
      }
    }

    try {
      const latestSnapshot =
        await getDocs(productsRef);

      if (
        requestId !==
        productsRequestIdRef.current
      ) {
        return;
      }

      const latestList =
        mapProductSnapshot(
          latestSnapshot
        );

      setProducts(latestList);
    } catch (error) {
      console.error(
        "Latest products loading error:",
        error
      );

      if (
        !cachedProductsLoaded &&
        requestId ===
          productsRequestIdRef.current
      ) {
        setProducts([]);
      }
    }
  }

  useEffect(() => {
    if (checkingUser) {
      return undefined;
    }

    if (!currentUser) {
      productsRequestIdRef.current += 1;
      setProducts([]);

      return undefined;
    }

    fetchProducts();

    return () => {
      productsRequestIdRef.current += 1;
    };
  }, [
    checkingUser,
    currentUser,
  ]);

  async function deleteProduct(
    productId
  ) {
    try {
      await deleteDoc(
        doc(
          db,
          "products",
          productId
        )
      );

      await fetchProducts({
        skipCache: true,
      });
    } catch (error) {
      console.error(
        "Product delete error:",
        error
      );
    }
  }

  async function handleLogout() {
    try {
      productsRequestIdRef.current += 1;

      await logout();

      setProducts([]);

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  }

  /*
   * Android status bar
   */
  useEffect(() => {
    if (
      !Capacitor.isNativePlatform()
    ) {
      return undefined;
    }

    let themeObserver;

    async function updateStatusBar() {
      try {
        const isDarkMode =
          document.documentElement.classList.contains(
            "dark"
          );

        await StatusBar.show();

        await StatusBar.setStyle({
          style: isDarkMode
            ? Style.Light
            : Style.Dark,
        });

        if (
          Capacitor.getPlatform() ===
          "android"
        ) {
          try {
            await StatusBar.setOverlaysWebView({
              overlay: false,
            });
          } catch (error) {
            console.log(
              "Status bar overlay skipped:",
              error
            );
          }

          try {
            await StatusBar.setBackgroundColor({
              color: isDarkMode
                ? "#020617"
                : "#F8FAFC",
            });
          } catch (error) {
            console.log(
              "Status bar background skipped:",
              error
            );
          }
        }
      } catch (error) {
        console.error(
          "Status bar setup error:",
          error
        );
      }
    }

    updateStatusBar();

    themeObserver =
      new MutationObserver(() => {
        updateStatusBar();
      });

    themeObserver.observe(
      document.documentElement,
      {
        attributes: true,
        attributeFilter: ["class"],
      }
    );

    return () => {
      if (themeObserver) {
        themeObserver.disconnect();
      }
    };
  }, []);

  /*
   * Android physical back button
   */
  useEffect(() => {
    if (
      Capacitor.getPlatform() !==
      "android"
    ) {
      return undefined;
    }

    let backButtonListener;

    async function setupBackButtonListener() {
      backButtonListener =
        await CapacitorApp.addListener(
          "backButton",
          () => {
            const currentPath =
              location.pathname;

            if (
              currentPath === "/home" &&
              window.__campusMartHomeOverlayOpen
            ) {
              window.dispatchEvent(
                new CustomEvent(
                  "campusmart-home-back"
                )
              );

              lastBackPressRef.current = 0;
              setShowExitMessage(false);

              if (
                exitMessageTimerRef.current
              ) {
                clearTimeout(
                  exitMessageTimerRef.current
                );
              }

              return;
            }

            const exitRoutes = [
              "/home",
              "/login",
              "/",
              "/admin",
              "/vendor",
              "/pg-owner",
            ];

            const shouldExitApp =
              exitRoutes.includes(
                currentPath
              );

            if (!shouldExitApp) {
              navigate(-1);
              return;
            }

            const currentTime =
              Date.now();

            const timeSinceLastPress =
              currentTime -
              lastBackPressRef.current;

            if (
              timeSinceLastPress < 2000
            ) {
              if (
                exitMessageTimerRef.current
              ) {
                clearTimeout(
                  exitMessageTimerRef.current
                );
              }

              setShowExitMessage(false);
              CapacitorApp.exitApp();

              return;
            }

            lastBackPressRef.current =
              currentTime;

            setShowExitMessage(true);

            if (
              exitMessageTimerRef.current
            ) {
              clearTimeout(
                exitMessageTimerRef.current
              );
            }

            exitMessageTimerRef.current =
              setTimeout(() => {
                setShowExitMessage(false);
                lastBackPressRef.current = 0;
              }, 2000);
          }
        );
    }

    setupBackButtonListener();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }

      if (
        exitMessageTimerRef.current
      ) {
        clearTimeout(
          exitMessageTimerRef.current
        );
      }
    };
  }, [
    location.pathname,
    navigate,
  ]);

  const resolvingSession =
    checkingUser ||
    Boolean(
      currentUser && profileLoading
    );

  if (resolvingSession) {
    return <StartupScreen />;
  }

  const loggedInStartPath =
    getLoggedInStartPath();

  return (
    <>
      <ScrollToTop />

      {currentUser && (
        <PushNotificationManager />
      )}

      <Routes>
        <Route
          path="/"
          element={
            currentUser ? (
              <Navigate
                to={loggedInStartPath}
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
                to={loggedInStartPath}
                replace
              />
            ) : (
              <Login
                onLogin={() =>
                  navigate("/", {
                    replace: true,
                  })
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

        <Route
          path="/tiffin"
          element={
            <ProtectedRoute>
              <Tiffin />
            </ProtectedRoute>
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
          path="/subscribe-tiffin"
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

<Route
  path="/tiffin/:vendorId"
  element={
    <ProtectedRoute>
      <TiffinVendorDetails />
    </ProtectedRoute>
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
              to={
                currentUser
                  ? loggedInStartPath
                  : "/"
              }
              replace
            />
          }
        />
      </Routes>

      {showExitMessage && (
        <div className="pointer-events-none fixed bottom-8 left-1/2 z-[9999] -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-2xl">
          Press back again to exit
        </div>
      )}
    </>
  );
}

export default App;