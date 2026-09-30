import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
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

export default function AdminDashboard({ onLogout }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    users: 0,
    products: 0,
    reports: 0,
    chats: 0,
  });

  const [reports, setReports] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("reports");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");

  useEffect(() => {
    setLoading(true);

    const unsubscribers = [];
    let usersLoaded = false;
    let productsLoaded = false;
    let reportsLoaded = false;
    let chatsLoaded = false;

    function finishLoadingWhenReady() {
      if (
        usersLoaded &&
        productsLoaded &&
        reportsLoaded &&
        chatsLoaded
      ) {
        setLoading(false);
      }
    }

    unsubscribers.push(
      onSnapshot(
        collection(db, "users"),
        (snapshot) => {
          const userList = snapshot.docs
            .map((item) => ({
              id: item.id,
              ...item.data(),
            }))
            .sort((a, b) =>
              String(a.name || a.email || "").localeCompare(
                String(b.name || b.email || "")
              )
            );

          setUsers(userList);
          setStats((previous) => ({
            ...previous,
            users: snapshot.size,
          }));

          usersLoaded = true;
          finishLoadingWhenReady();
        },
        (error) => {
          console.error("Admin users listener error:", error);
          usersLoaded = true;
          finishLoadingWhenReady();
        }
      )
    );

    unsubscribers.push(
      onSnapshot(
        collection(db, "products"),
        (snapshot) => {
          const productList = snapshot.docs
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

          setProducts(productList);
          setStats((previous) => ({
            ...previous,
            products: snapshot.size,
          }));

          productsLoaded = true;
          finishLoadingWhenReady();
        },
        (error) => {
          console.error("Admin products listener error:", error);
          productsLoaded = true;
          finishLoadingWhenReady();
        }
      )
    );

    unsubscribers.push(
      onSnapshot(
        collection(db, "reports"),
        (snapshot) => {
          const reportList = snapshot.docs
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

          setReports(reportList);
          setStats((previous) => ({
            ...previous,
            reports: snapshot.size,
          }));

          reportsLoaded = true;
          finishLoadingWhenReady();
        },
        (error) => {
          console.error("Admin reports listener error:", error);
          reportsLoaded = true;
          finishLoadingWhenReady();
        }
      )
    );

    unsubscribers.push(
      onSnapshot(
        collection(db, "chats"),
        (snapshot) => {
          setStats((previous) => ({
            ...previous,
            chats: snapshot.size,
          }));

          chatsLoaded = true;
          finishLoadingWhenReady();
        },
        (error) => {
          console.error("Admin chats listener error:", error);
          chatsLoaded = true;
          finishLoadingWhenReady();
        }
      )
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  function loadAdminData() {
    // Data is already synchronized in real time.
  }

  async function markReportResolved(reportId) {
    try {
      setActionId(`report_${reportId}`);

      await updateDoc(doc(db, "reports", reportId), {
        status: "resolved",
      });
    } catch (error) {
      alert(error.message);
    } finally {
      setActionId("");
    }
  }

  async function deleteReportedProduct(productId, reportId) {
    const confirmDelete = confirm(
      "Are you sure you want to delete this reported product?"
    );

    if (!confirmDelete) return;

    try {
      setActionId(`report_delete_${reportId}`);

      if (productId) {
        await deleteDoc(doc(db, "products", productId));
      }

      await updateDoc(doc(db, "reports", reportId), {
        status: "product_removed",
      });
    } catch (error) {
      alert(error.message);
    } finally {
      setActionId("");
    }
  }

  async function deleteAnyProduct(productId) {
    const confirmDelete = confirm(
      "Delete this product permanently?"
    );

    if (!confirmDelete) return;

    try {
      setActionId(`product_delete_${productId}`);
      await deleteDoc(doc(db, "products", productId));
    } catch (error) {
      alert(error.message);
    } finally {
      setActionId("");
    }
  }

  async function toggleFeatured(product) {
    const newValue = !product.featured;

    try {
      setActionId(`featured_${product.id}`);

      await updateDoc(doc(db, "products", product.id), {
        featured: newValue,
      });

      alert(
        newValue
          ? "Product marked as Featured"
          : "Product removed from Featured"
      );
    } catch (error) {
      alert(error.message);
    } finally {
      setActionId("");
    }
  }

  async function verifyUser(userId) {
    try {
      setActionId(`user_${userId}`);

      await updateDoc(doc(db, "users", userId), {
        verified: true,
      });
    } catch (error) {
      alert(error.message);
    } finally {
      setActionId("");
    }
  }

  async function unverifyUser(userId) {
    try {
      setActionId(`user_${userId}`);

      await updateDoc(doc(db, "users", userId), {
        verified: false,
      });
    } catch (error) {
      alert(error.message);
    } finally {
      setActionId("");
    }
  }

  function TabButton({ id, label }) {
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`px-5 py-3 rounded-2xl font-bold transition ${
          activeTab === id
            ? "bg-blue-600 text-white shadow-lg"
            : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <Navbar onLogout={onLogout} />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
          <div>
            <p className="text-blue-600 font-bold">CampusMart Admin</p>
            <h1 className="text-4xl font-extrabold">Dashboard</h1>
          </div>

          <div className="flex gap-3 flex-wrap">
  <Button
    variant="primary"
    onClick={() => navigate("/admin/report-file-orders")}
  >
    📘 Report File Orders
  </Button>

  <Button
    variant="primary"
    onClick={() => navigate("/admin/manage-cooks")}
  >
    👩‍🍳 Manage Cooks
  </Button>

  <Button
    variant="soft"
    onClick={() => navigate("/admin/add-cook")}
  >
    ➕ Add Cook
  </Button>

  <Button
    variant="soft"
    onClick={loadAdminData}
    disabled
  >
    Live Sync On
  </Button>
</div>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <Card className="p-6 text-center">
            <h2 className="text-4xl font-extrabold text-blue-600">
              {stats.users}
            </h2>
            <p className="text-slate-500 font-semibold mt-1">Users</p>
          </Card>

          <Card className="p-6 text-center">
            <h2 className="text-4xl font-extrabold text-blue-600">
              {stats.products}
            </h2>
            <p className="text-slate-500 font-semibold mt-1">Products</p>
          </Card>

          <Card className="p-6 text-center">
            <h2 className="text-4xl font-extrabold text-blue-600">
              {stats.chats}
            </h2>
            <p className="text-slate-500 font-semibold mt-1">Chats</p>
          </Card>

          <Card className="p-6 text-center">
            <h2 className="text-4xl font-extrabold text-red-500">
              {stats.reports}
            </h2>
            <p className="text-slate-500 font-semibold mt-1">Reports</p>
          </Card>
        </div>

        <div className="flex gap-3 mt-10 overflow-x-auto pb-2">
          <TabButton id="reports" label="🚩 Reports" />
          <TabButton id="pg-approvals" label="🏠 PG Approval" />
          <TabButton id="products" label="📦 Products" />
          <TabButton id="users" label="👥 Users" />
        </div>

        {loading ? (
          <Card className="p-8 text-center mt-8">
            <h2 className="text-xl font-bold">Loading admin data...</h2>
          </Card>
        ) : (
          <>
            {activeTab === "pg-approvals" && (
              <AdminPGApprovals />
            )}
            {activeTab === "reports" && (
              <section className="mt-8">
                <div className="mb-6">
                  <p className="text-red-500 font-bold">Safety Center</p>
                  <h2 className="text-3xl font-extrabold">Reported Products</h2>
                </div>

                {reports.length === 0 ? (
                  <EmptyState
                    icon="🛡️"
                    title="No reports"
                    message="Reported products will appear here."
                  />
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <Card key={report.id} className="p-5">
                        <div className="flex flex-col md:flex-row md:items-center gap-5">
                          <div className="h-14 w-14 rounded-2xl bg-red-100 flex items-center justify-center text-2xl">
                            🚩
                          </div>

                          <div className="flex-1">
                            <div className="flex gap-2 flex-wrap mb-2">
                              <Badge variant="red">{report.reason}</Badge>
                              <Badge
                                variant={
                                  report.status === "pending"
                                    ? "yellow"
                                    : "green"
                                }
                              >
                                {report.status || "pending"}
                              </Badge>
                            </div>

                            <h3 className="text-xl font-extrabold">
                              {report.productName || "Reported Product"}
                            </h3>

                            <p className="text-slate-500 mt-1">
                              {report.details || "No extra details provided."}
                            </p>

                            <p className="text-xs text-slate-400 mt-2">
                              Reporter:{" "}
                              {report.reporterName || report.reporterId}
                            </p>
                          </div>

                          <div className="flex gap-3 flex-wrap">
                            <Button
                              variant="soft"
                              onClick={() => markReportResolved(report.id)}
                              disabled={Boolean(actionId)}
                            >
                              {actionId === `report_${report.id}`
                                ? "Resolving..."
                                : "Resolve"}
                            </Button>

                            <Button
                              variant="danger"
                              onClick={() =>
                                deleteReportedProduct(
                                  report.productId,
                                  report.id
                                )
                              }
                              disabled={Boolean(actionId)}
                            >
                              {actionId === `report_delete_${report.id}`
                                ? "Deleting..."
                                : "Delete Product"}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === "products" && (
              <section className="mt-8">
                <div className="mb-6">
                  <p className="text-blue-600 font-bold">Marketplace</p>
                  <h2 className="text-3xl font-extrabold">All Products</h2>
                </div>

                {products.length === 0 ? (
                  <EmptyState
                    icon="📦"
                    title="No products"
                    message="Products will appear here."
                  />
                ) : (
                  <div className="space-y-4">
                    {products.map((product) => (
                      <Card key={product.id} className="p-5">
                        <div className="flex flex-col md:flex-row md:items-center gap-5">
                          <div className="h-16 w-16 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center text-3xl">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              product.icon || "📦"
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex gap-2 flex-wrap mb-2">
                              <Badge variant="blue">
                                {product.category || "Product"}
                              </Badge>

                              <Badge
                                variant={
                                  product.status === "sold" ? "red" : "green"
                                }
                              >
                                {product.status === "sold"
                                  ? "Sold Out"
                                  : "Available"}
                              </Badge>

                              {product.featured && (
                                <Badge variant="yellow">⭐ Featured</Badge>
                              )}
                            </div>

                            <h3 className="text-xl font-extrabold">
                              {product.name}
                            </h3>

                            <p className="text-blue-600 font-bold">
                              ₹{product.price}
                            </p>

                            <p className="text-xs text-slate-400 mt-1">
                              Seller: {product.ownerEmail || product.ownerId}
                            </p>

                            <p className="text-xs text-slate-400 mt-1">
                              👁 {product.views || 0} views • 🔍{" "}
                              {product.searchCount || 0} searches
                            </p>
                          </div>

                          <div className="flex gap-3 flex-wrap">
                            <Button
                              variant={product.featured ? "soft" : "primary"}
                              onClick={() => toggleFeatured(product)}
                              disabled={Boolean(actionId)}
                            >
                              {actionId === `featured_${product.id}`
                                ? "Updating..."
                                : product.featured
                                ? "Remove Featured"
                                : "⭐ Make Featured"}
                            </Button>

                            <Button
                              variant="danger"
                              onClick={() => deleteAnyProduct(product.id)}
                              disabled={Boolean(actionId)}
                            >
                              {actionId === `product_delete_${product.id}`
                                ? "Deleting..."
                                : "Delete"}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === "users" && (
              <section className="mt-8">
                <div className="mb-6">
                  <p className="text-blue-600 font-bold">Accounts</p>
                  <h2 className="text-3xl font-extrabold">All Users</h2>
                </div>

                {users.length === 0 ? (
                  <EmptyState
                    icon="👥"
                    title="No users"
                    message="Users will appear here."
                  />
                ) : (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <Card key={user.id} className="p-5">
                        <div className="flex flex-col md:flex-row md:items-center gap-5">
                          <div className="h-14 w-14 rounded-full bg-blue-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center text-2xl">
                            {(
                              user.profilePhoto ||
                              user.photoURL ||
                              user.profileImage ||
                              user.imageUrl ||
                              user.photo
                            ) ? (
                              <img
                                src={
                                  user.profilePhoto ||
                                  user.photoURL ||
                                  user.profileImage ||
                                  user.imageUrl ||
                                  user.photo
                                }
                                alt={user.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              "👤"
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex gap-2 flex-wrap mb-2">
                              <Badge variant={user.verified ? "green" : "gray"}>
                                {user.verified ? "Verified" : "Not Verified"}
                              </Badge>

                              <Badge variant="blue">
                                {user.role || "user"}
                              </Badge>
                            </div>

                            <h3 className="text-xl font-extrabold">
                              {user.name || "CampusMart User"}
                            </h3>

                            <p className="text-slate-500">{user.email}</p>

                            <p className="text-xs text-slate-400 mt-1">
                              {user.college || "College not added"} •{" "}
                              {user.course || "Course not added"}
                            </p>
                          </div>

                          <div className="flex gap-3">
                            {user.verified ? (
                              <Button
                                variant="soft"
                                onClick={() => unverifyUser(user.id)}
                                disabled={Boolean(actionId)}
                              >
                                {actionId === `user_${user.id}`
                                  ? "Updating..."
                                  : "Unverify"}
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                onClick={() => verifyUser(user.id)}
                                disabled={Boolean(actionId)}
                              >
                                {actionId === `user_${user.id}`
                                  ? "Updating..."
                                  : "Verify"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
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