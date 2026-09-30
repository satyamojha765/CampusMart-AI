import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Avatar from "../components/ui/Avatar";
import EmptyState from "../components/ui/EmptyState";
import Badge from "../components/ui/Badge";

const CLOUD_NAME = "docilvuyz";
const UPLOAD_PRESET = "campusmart_unsigned";
const COLLEGE_NAME = "Asansol Engineering College";

const courses = [
  "B.Tech CSE",
  "B.Tech IOT",
  "B.Tech CSBS",
  "B.Tech AI & ML",
  "B.Tech IT",
  "B.Tech ECE",
  "B.Tech EE",
  "B.Tech EEE",
  "B.Tech ME",
  "B.Tech CIVIL",
  "BSC Data Science",
  "BCA",
  "BBA",
  "Diploma",
  "Other",
];

export default function Profile({
  products,
  currentUser,
  deleteProduct,
  onLogout,
}) {
  const { userProfile } = useAuth();

  const [wishlistProducts, setWishlistProducts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    college: COLLEGE_NAME,
    course: "",
    semester: "",
    bio: "",
    profilePhoto: "",
  });

  const myProducts = products.filter(
    (product) => product.ownerId === currentUser.uid
  );

  useEffect(() => {
    return () => {
      if (
        form.profilePhoto &&
        form.profilePhoto.startsWith("blob:")
      ) {
        URL.revokeObjectURL(form.profilePhoto);
      }
    };
  }, [form.profilePhoto]);

  useEffect(() => {
    if (userProfile) {
      setForm({
        name: userProfile.name || currentUser.displayName || "",
        phone: userProfile.phone || "",
        college: COLLEGE_NAME,
        course: userProfile.course || "",
        semester: userProfile.semester || "",
        bio: userProfile.bio || "",
        profilePhoto:
          userProfile.profilePhoto ||
          userProfile.photoURL ||
          userProfile.profileImage ||
          userProfile.imageUrl ||
          userProfile.photo ||
          currentUser.photoURL ||
          "",
      });
    }
  }, [userProfile, currentUser.displayName]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setWishlistProducts([]);
      return undefined;
    }

    const wishlistQuery = query(
      collection(db, "wishlist"),
      where("userId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      wishlistQuery,
      (snapshot) => {
        const wishlistIds = snapshot.docs
          .map((item) => item.data().productId)
          .filter(Boolean);

        const matchedProducts = products.filter((product) =>
          wishlistIds.includes(product.id)
        );

        setWishlistProducts(matchedProducts);
      },
      (error) => {
        console.error("Profile wishlist listener error:", error);
        setWishlistProducts([]);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid, products]);

  function handleDelete(productId) {
    const confirmDelete = confirm(
      "Are you sure you want to delete this product?"
    );
    if (confirmDelete) deleteProduct(productId);
  }

  async function toggleProductStatus(product) {
    try {
      const newStatus = product.status === "sold" ? "available" : "sold";

      await updateDoc(doc(db, "products", product.id), {
        status: newStatus,
      });

      alert(
        newStatus === "sold"
          ? "Product marked as Sold Out"
          : "Product marked as Available"
      );
    } catch (error) {
      alert(error.message);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;

    setPhotoFile(file);
    setForm({ ...form, profilePhoto: URL.createObjectURL(file) });
  }

  async function uploadProfilePhoto() {
    if (!photoFile) return form.profilePhoto || "";

    const data = new FormData();
    data.append("file", photoFile);
    data.append("upload_preset", UPLOAD_PRESET);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: data }
    );

    const uploaded = await res.json();
    if (!uploaded.secure_url) throw new Error("Profile photo upload failed");

    return uploaded.secure_url;
  }

  function getCompletion() {
    const fields = [
      form.name,
      currentUser.email,
      form.phone,
      COLLEGE_NAME,
      form.course,
      form.semester,
      form.bio,
      form.profilePhoto,
    ];

    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }

  async function saveProfile() {
    if (!form.name || !form.college || !form.course) {
      alert("Name, college and course are required");
      return;
    }

    try {
      setSaving(true);

      const photoUrl = await uploadProfilePhoto();

      await updateProfile(currentUser, {
        displayName: form.name,
        photoURL: photoUrl,
      });

      await updateDoc(doc(db, "users", currentUser.uid), {
        name: form.name,
        phone: form.phone,
        college: form.college,
        course: form.course,
        semester: form.semester,
        bio: form.bio,
        profilePhoto: photoUrl,
      });

      setPhotoFile(null);
      alert("Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  const completion = getCompletion();

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-white">
      <Navbar onLogout={onLogout} />

      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-10">
        <div className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br from-blue-600 via-blue-500 to-amber-400 p-[1px] shadow-xl shadow-blue-500/10">
          <div className="rounded-[2rem] sm:rounded-[2.5rem] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-4 sm:p-7 lg:p-8">
            <div className="flex flex-col lg:flex-row gap-5 sm:gap-8 items-center lg:items-start text-center lg:text-left">
              <div className="relative shrink-0">
                <div className="rounded-full p-1 bg-gradient-to-br from-blue-600 to-amber-400 shadow-lg">
                  <Avatar
                    src={form.profilePhoto}
                    name={form.name || "User"}
                    size="lg"
                  />
                </div>

                {isEditing && (
                  <label className="mt-4 block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhoto}
                      className="hidden"
                    />
                    <span className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-md active:scale-95 transition">
                      Change Photo
                    </span>
                  </label>
                )}
              </div>

              <div className="flex-1 w-full min-w-0">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight truncate">
                      {form.name || currentUser.displayName || "CampusMart User"}
                    </h1>

                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base truncate">
                      {currentUser.email}
                    </p>

                    <div className="flex justify-center lg:justify-start gap-2.5 flex-wrap mt-4">
                      <Badge variant={userProfile?.verified ? "green" : "gray"}>
                        {userProfile?.verified
                          ? "🟢 Verified Student"
                          : "⚪ Not Verified"}
                      </Badge>

                      <Badge variant="blue">
                        🏫 {form.college || "College not added"}
                      </Badge>

                      {form.course && (
                        <Badge variant="yellow">{form.course}</Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => setIsEditing(!isEditing)}
                    className="w-full md:w-auto"
                  >
                    {isEditing ? "Cancel" : "✏️ Edit Profile"}
                  </Button>
                </div>

                <div className="mt-6 sm:mt-8 max-w-xl mx-auto lg:mx-0">
                  <div className="flex justify-between text-sm font-black mb-2">
                    <span>Profile Completion</span>
                    <span>{completion}%</span>
                  </div>

                  <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-amber-400 rounded-full transition-all"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                </div>

                {form.bio && (
                  <p className="text-slate-600 dark:text-slate-300 mt-5 max-w-2xl mx-auto lg:mx-0 leading-7 text-sm sm:text-base">
                    {form.bio}
                  </p>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="grid md:grid-cols-2 gap-4 sm:gap-5 bg-slate-50 dark:bg-slate-950 rounded-[1.7rem] sm:rounded-[2rem] p-4 sm:p-6 mt-7 sm:mt-8 border border-slate-100 dark:border-slate-800">
                <Input
                  label="Full Name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                />

                <Input
                  label="Phone"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                />

                <div>
                  <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                    College
                  </label>

                  <div className="w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 font-bold text-sm sm:text-base">
                    {COLLEGE_NAME}
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                    Course
                  </label>

                  <select
                    name="course"
                    value={form.course}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Course</option>

                    {courses.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                    Semester
                  </label>
                  <select
                    name="semester"
                    value={form.semester}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Semester</option>
                    <option>1st Semester</option>
                    <option>2nd Semester</option>
                    <option>3rd Semester</option>
                    <option>4th Semester</option>
                    <option>5th Semester</option>
                    <option>6th Semester</option>
                    <option>7th Semester</option>
                    <option>8th Semester</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    placeholder="Tell something about yourself..."
                    className="w-full h-28 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <Button
                  className="md:col-span-2 w-full"
                  variant="primary"
                  onClick={saveProfile}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-5 sm:mt-8">
          <Card className="p-4 sm:p-6 text-center rounded-[1.5rem] sm:rounded-[2rem]">
            <h2 className="text-2xl sm:text-4xl font-black text-blue-600">
              {myProducts.length}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs sm:text-base">
              Listings
            </p>
          </Card>

          <Card className="p-4 sm:p-6 text-center rounded-[1.5rem] sm:rounded-[2rem]">
            <h2 className="text-2xl sm:text-4xl font-black text-blue-600">
              {wishlistProducts.length}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs sm:text-base">
              Wishlist
            </p>
          </Card>

          <Card className="p-4 sm:p-6 text-center rounded-[1.5rem] sm:rounded-[2rem]">
            <h2 className="text-xl sm:text-4xl font-black text-blue-600">
              {userProfile?.verified ? "Yes" : "No"}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs sm:text-base">
              Verified
            </p>
          </Card>
        </div>

        <div className="mt-9 sm:mt-12">
          <div className="flex items-end justify-between gap-3 mb-5 sm:mb-6">
            <div>
              <p className="text-blue-600 font-black text-sm">Your Store</p>
              <h2 className="text-2xl sm:text-3xl font-black">My Listings</h2>
            </div>
            <Badge variant="gray">{myProducts.length} Items</Badge>
          </div>

          {myProducts.length === 0 ? (
            <EmptyState
              icon="📦"
              title="No listings yet"
              message="Start selling your first product."
            />
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {myProducts.map((item) => {
                const isSold = item.status === "sold";

                return (
                  <Card
                    key={item.id}
                    className="p-3 sm:p-4 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden"
                  >
                    <div className="flex gap-3 sm:gap-5">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center text-3xl shrink-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className={`w-full h-full object-cover ${
                              isSold ? "grayscale" : ""
                            }`}
                          />
                        ) : (
                          item.icon || "📦"
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <strong className="block text-base sm:text-lg truncate">
                              {item.name}
                            </strong>
                            <div className="flex gap-2 flex-wrap mt-1.5">
                              <Badge variant="blue">{item.category}</Badge>
                              <Badge variant={isSold ? "red" : "green"}>
                                {isSold ? "Sold Out" : "Available"}
                              </Badge>
                            </div>
                          </div>

                          <h3 className="text-blue-600 font-black whitespace-nowrap">
                            ₹{item.price}
                          </h3>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4">
                          <Button
                            variant={isSold ? "primary" : "soft"}
                            onClick={() => toggleProductStatus(item)}
                            className="text-xs sm:text-sm"
                          >
                            {isSold ? "♻ Available" : "✔ Sold"}
                          </Button>

                          <Button
                            variant="danger"
                            onClick={() => handleDelete(item.id)}
                            className="text-xs sm:text-sm"
                          >
                            🗑 Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-9 sm:mt-12">
          <div className="flex items-end justify-between gap-3 mb-5 sm:mb-6">
            <div>
              <p className="text-blue-600 font-black text-sm">Saved Items</p>
              <h2 className="text-2xl sm:text-3xl font-black">My Wishlist</h2>
            </div>
            <Badge variant="gray">{wishlistProducts.length} Items</Badge>
          </div>

          {wishlistProducts.length === 0 ? (
            <EmptyState
              icon="❤️"
              title="No wishlist products"
              message="Save products you like from home."
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {wishlistProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        <Button variant="danger" className="w-full mt-10" onClick={onLogout}>
          🚪 Logout
        </Button>
      </section>
    </div>
  );
}