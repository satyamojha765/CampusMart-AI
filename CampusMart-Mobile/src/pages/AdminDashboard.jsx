import {
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase";

import Navbar from "../components/Navbar";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import AdminPGApprovals from "../components/admin/AdminPGApprovals";

export default function AdminDashboard({
  onLogout,
}) {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    users: 0,
    products: 0,
    reports: 0,
    chats: 0,
  });

  const [reports, setReports] =
    useState([]);

  const [products, setProducts] =
    useState([]);

  const [users, setUsers] =
    useState([]);

  const [activeTab, setActiveTab] =
    useState("reports");

  const [loading, setLoading] =
    useState(true);

  async function loadAdminData() {
    try {
      setLoading(true);

      const [
        usersSnap,
        productsSnap,
        reportsSnap,
        chatsSnap,
      ] = await Promise.all([
        getDocs(
          collection(db, "users")
        ),
        getDocs(
          collection(db, "products")
        ),
        getDocs(
          collection(db, "reports")
        ),
        getDocs(
          collection(db, "chats")
        ),
      ]);

      const userList =
        usersSnap.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

      const productList =
        productsSnap.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

      const reportList =
        reportsSnap.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

      productList.sort((a, b) => {
        const timeA =
          a.createdAt?.seconds || 0;

        const timeB =
          b.createdAt?.seconds || 0;

        return timeB - timeA;
      });

      reportList.sort((a, b) => {
        const timeA =
          a.createdAt?.seconds || 0;

        const timeB =
          b.createdAt?.seconds || 0;

        return timeB - timeA;
      });

      setStats({
        users: usersSnap.size,
        products: productsSnap.size,
        reports: reportsSnap.size,
        chats: chatsSnap.size,
      });

      setUsers(userList);
      setProducts(productList);
      setReports(reportList);
    } catch (error) {
      console.error(
        "Admin data loading error:",
        error
      );

      alert(
        error.message ||
          "Admin data load nahi hua."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  async function markReportResolved(
    reportId
  ) {
    try {
      await updateDoc(
        doc(
          db,
          "reports",
          reportId
        ),
        {
          status: "resolved",
        }
      );

      await loadAdminData();
    } catch (error) {
      alert(error.message);
    }
  }

  async function deleteReportedProduct(
    productId,
    reportId
  ) {
    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this reported product?"
      );

    if (!confirmDelete) {
      return;
    }

    try {
      if (productId) {
        await deleteDoc(
          doc(
            db,
            "products",
            productId
          )
        );
      }

      await updateDoc(
        doc(
          db,
          "reports",
          reportId
        ),
        {
          status:
            "product_removed",
        }
      );

      await loadAdminData();
    } catch (error) {
      alert(error.message);
    }
  }

  async function deleteAnyProduct(
    productId
  ) {
    const confirmDelete =
      window.confirm(
        "Delete this product permanently?"
      );

    if (!confirmDelete) {
      return;
    }

    try {
      await deleteDoc(
        doc(
          db,
          "products",
          productId
        )
      );

      await loadAdminData();
    } catch (error) {
      alert(error.message);
    }
  }

  async function toggleFeatured(
    product
  ) {
    try {
      const newValue =
        !product.featured;

      await updateDoc(
        doc(
          db,
          "products",
          product.id
        ),
        {
          featured: newValue,
        }
      );

      alert(
        newValue
          ? "Product marked as Featured"
          : "Product removed from Featured"
      );

      await loadAdminData();
    } catch (error) {
      alert(error.message);
    }
  }

  async function verifyUser(userId) {
    try {
      await updateDoc(
        doc(
          db,
          "users",
          userId
        ),
        {
          verified: true,
        }
      );

      await loadAdminData();
    } catch (error) {
      alert(error.message);
    }
  }

  async function unverifyUser(userId) {
    try {
      await updateDoc(
        doc(
          db,
          "users",
          userId
        ),
        {
          verified: false,
        }
      );

      await loadAdminData();
    } catch (error) {
      alert(error.message);
    }
  }

  function TabButton({
    id,
    label,
  }) {
    return (
      <button
        type="button"
        onClick={() =>
          setActiveTab(id)
        }
        className={`shrink-0 rounded-2xl px-5 py-3 font-bold transition active:scale-95 ${
          activeTab === id
            ? "bg-blue-600 text-white shadow-lg"
            : "border border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar onLogout={onLogout} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-bold text-blue-600">
              CampusMart Admin
            </p>

            <h1 className="text-3xl font-extrabold sm:text-4xl">
              Dashboard
            </h1>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate("/home")
            }
            className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-100 active:scale-95 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300"
          >
            <span>←</span>
            <span>CampusMart</span>
          </button>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={() =>
              navigate(
                "/admin/report-file-orders"
              )
            }
          >
            📘 Report File Orders
          </Button>

          <Button
            variant="soft"
            onClick={loadAdminData}
          >
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
          <Card className="p-4 text-center sm:p-6">
            <h2 className="text-3xl font-extrabold text-blue-600 sm:text-4xl">
              {stats.users}
            </h2>

            <p className="mt-1 font-semibold text-slate-500">
              Users
            </p>
          </Card>

          <Card className="p-4 text-center sm:p-6">
            <h2 className="text-3xl font-extrabold text-blue-600 sm:text-4xl">
              {stats.products}
            </h2>

            <p className="mt-1 font-semibold text-slate-500">
              Products
            </p>
          </Card>

          <Card className="p-4 text-center sm:p-6">
            <h2 className="text-3xl font-extrabold text-blue-600 sm:text-4xl">
              {stats.chats}
            </h2>

            <p className="mt-1 font-semibold text-slate-500">
              Chats
            </p>
          </Card>

          <Card className="p-4 text-center sm:p-6">
            <h2 className="text-3xl font-extrabold text-red-500 sm:text-4xl">
              {stats.reports}
            </h2>

            <p className="mt-1 font-semibold text-slate-500">
              Reports
            </p>
          </Card>
        </div>

        <div className="mt-8 flex gap-3 overflow-x-auto pb-2 sm:mt-10">
          <TabButton
            id="reports"
            label="🚩 Reports"
          />

          <TabButton
            id="pg-approvals"
            label="🏠 PG Approval"
          />

          <TabButton
            id="products"
            label="📦 Products"
          />

          <TabButton
            id="users"
            label="👥 Users"
          />
        </div>

        {loading ? (
          <Card className="mt-8 p-8 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600 dark:border-slate-800 dark:border-t-blue-500" />

            <h2 className="mt-4 text-xl font-bold">
              Loading admin data...
            </h2>
          </Card>
        ) : (
          <>
            {activeTab ===
              "pg-approvals" && (
              <div className="mt-8">
                <AdminPGApprovals />
              </div>
            )}

            {activeTab ===
              "reports" && (
              <section className="mt-8">
                <div className="mb-6">
                  <p className="font-bold text-red-500">
                    Safety Center
                  </p>

                  <h2 className="text-3xl font-extrabold">
                    Reported Products
                  </h2>
                </div>

                {reports.length ===
                0 ? (
                  <EmptyState
                    icon="🛡️"
                    title="No reports"
                    message="Reported products will appear here."
                  />
                ) : (
                  <div className="space-y-4">
                    {reports.map(
                      (report) => (
                        <Card
                          key={
                            report.id
                          }
                          className="p-5"
                        >
                          <div className="flex flex-col gap-5 md:flex-row md:items-center">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-2xl">
                              🚩
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex flex-wrap gap-2">
                                <Badge variant="red">
                                  {report.reason ||
                                    "Report"}
                                </Badge>

                                <Badge
                                  variant={
                                    report.status ===
                                    "pending"
                                      ? "yellow"
                                      : "green"
                                  }
                                >
                                  {report.status ||
                                    "pending"}
                                </Badge>
                              </div>

                              <h3 className="break-words text-xl font-extrabold">
                                {report.productName ||
                                  "Reported Product"}
                              </h3>

                              <p className="mt-1 break-words text-slate-500">
                                {report.details ||
                                  "No extra details provided."}
                              </p>

                              <p className="mt-2 break-all text-xs text-slate-400">
                                Reporter:{" "}
                                {report.reporterName ||
                                  report.reporterId}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              <Button
                                variant="soft"
                                onClick={() =>
                                  markReportResolved(
                                    report.id
                                  )
                                }
                              >
                                Resolve
                              </Button>

                              <Button
                                variant="danger"
                                onClick={() =>
                                  deleteReportedProduct(
                                    report.productId,
                                    report.id
                                  )
                                }
                              >
                                Delete Product
                              </Button>
                            </div>
                          </div>
                        </Card>
                      )
                    )}
                  </div>
                )}
              </section>
            )}

            {activeTab ===
              "products" && (
              <section className="mt-8">
                <div className="mb-6">
                  <p className="font-bold text-blue-600">
                    Marketplace
                  </p>

                  <h2 className="text-3xl font-extrabold">
                    All Products
                  </h2>
                </div>

                {products.length ===
                0 ? (
                  <EmptyState
                    icon="📦"
                    title="No products"
                    message="Products will appear here."
                  />
                ) : (
                  <div className="space-y-4">
                    {products.map(
                      (product) => {
                        const productImage =
                          product.image ||
                          product.images?.[0] ||
                          "";

                        return (
                          <Card
                            key={
                              product.id
                            }
                            className="p-5"
                          >
                            <div className="flex flex-col gap-5 md:flex-row md:items-center">
                              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-3xl dark:bg-slate-800">
                                {productImage ? (
                                  <img
                                    src={
                                      productImage
                                    }
                                    alt={
                                      product.name ||
                                      "Product"
                                    }
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  product.icon ||
                                  "📦"
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="mb-2 flex flex-wrap gap-2">
                                  <Badge variant="blue">
                                    {product.category ||
                                      "Product"}
                                  </Badge>

                                  <Badge
                                    variant={
                                      product.status ===
                                      "sold"
                                        ? "red"
                                        : "green"
                                    }
                                  >
                                    {product.status ===
                                    "sold"
                                      ? "Sold Out"
                                      : "Available"}
                                  </Badge>

                                  {product.featured && (
                                    <Badge variant="yellow">
                                      ⭐ Featured
                                    </Badge>
                                  )}
                                </div>

                                <h3 className="break-words text-xl font-extrabold">
                                  {product.name ||
                                    "Product"}
                                </h3>

                                <p className="font-bold text-blue-600">
                                  ₹
                                  {product.price ||
                                    0}
                                </p>

                                <p className="mt-1 break-all text-xs text-slate-400">
                                  Seller:{" "}
                                  {product.ownerEmail ||
                                    product.ownerId}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  👁{" "}
                                  {product.views ||
                                    0}{" "}
                                  views • 🔍{" "}
                                  {product.searchCount ||
                                    0}{" "}
                                  searches
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-3">
                                <Button
                                  variant={
                                    product.featured
                                      ? "soft"
                                      : "primary"
                                  }
                                  onClick={() =>
                                    toggleFeatured(
                                      product
                                    )
                                  }
                                >
                                  {product.featured
                                    ? "Remove Featured"
                                    : "⭐ Make Featured"}
                                </Button>

                                <Button
                                  variant="danger"
                                  onClick={() =>
                                    deleteAnyProduct(
                                      product.id
                                    )
                                  }
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      }
                    )}
                  </div>
                )}
              </section>
            )}

            {activeTab ===
              "users" && (
              <section className="mt-8">
                <div className="mb-6">
                  <p className="font-bold text-blue-600">
                    Accounts
                  </p>

                  <h2 className="text-3xl font-extrabold">
                    All Users
                  </h2>
                </div>

                {users.length === 0 ? (
                  <EmptyState
                    icon="👥"
                    title="No users"
                    message="Users will appear here."
                  />
                ) : (
                  <div className="space-y-4">
                    {users.map((user) => {
                      const userPhoto =
                        user.profilePhoto ||
                        user.photoURL ||
                        user.profileImage ||
                        user.imageUrl ||
                        user.photo ||
                        "";

                      return (
                        <Card
                          key={user.id}
                          className="p-5"
                        >
                          <div className="flex flex-col gap-5 md:flex-row md:items-center">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-2xl dark:bg-slate-800">
                              {userPhoto ? (
                                <img
                                  src={
                                    userPhoto
                                  }
                                  alt={
                                    user.name ||
                                    "User"
                                  }
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                "👤"
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex flex-wrap gap-2">
                                <Badge
                                  variant={
                                    user.verified
                                      ? "green"
                                      : "gray"
                                  }
                                >
                                  {user.verified
                                    ? "Verified"
                                    : "Not Verified"}
                                </Badge>

                                <Badge variant="blue">
                                  {user.role ||
                                    "user"}
                                </Badge>
                              </div>

                              <h3 className="break-words text-xl font-extrabold">
                                {user.name ||
                                  "CampusMart User"}
                              </h3>

                              <p className="break-all text-slate-500">
                                {user.email}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {user.college ||
                                  "College not added"}{" "}
                                •{" "}
                                {user.course ||
                                  "Course not added"}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                              {user.verified ? (
                                <Button
                                  variant="soft"
                                  onClick={() =>
                                    unverifyUser(
                                      user.id
                                    )
                                  }
                                >
                                  Unverify
                                </Button>
                              ) : (
                                <Button
                                  variant="primary"
                                  onClick={() =>
                                    verifyUser(
                                      user.id
                                    )
                                  }
                                >
                                  Verify
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}