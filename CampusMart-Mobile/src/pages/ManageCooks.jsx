import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  ArrowLeft,
  Camera,
  Check,
  ChefHat,
  Edit3,
  IndianRupee,
  Loader2,
  MapPin,
  Plus,
  Search,
  Star,
  Trash2,
  Upload,
  Users,
  Utensils,
  X,
} from "lucide-react";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const CLOUD_NAME = "docilvuyz";
const UPLOAD_PRESET = "campusmart_unsigned";

const COOKING_TYPE_OPTIONS = ["Veg", "Non-Veg"];
const MEAL_OPTIONS = ["Breakfast", "Lunch", "Dinner"];

const EMPTY_EDIT_FORM = {
  name: "",
  phone: "",
  whatsapp: "",
  area: "",
  city: "",
  monthlyPrice: "",
  experienceYears: "",
  timings: "",
  capacity: "",
  description: "",
  available: true,
  cookingTypes: [],
  meals: [],
  specialDishesText: "",
};

export default function ManageCooks() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [cooks, setCooks] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [editingCook, setEditingCook] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState("");

  const [saving, setSaving] = useState(false);
  const [togglingCookId, setTogglingCookId] = useState("");
  const [deletingCookId, setDeletingCookId] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const [reviewingCook, setReviewingCook] = useState(null);
  const [cookReviews, setCookReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [reviewsMessage, setReviewsMessage] = useState("");
  const [deletingReviewId, setDeletingReviewId] = useState("");

  const isAdmin = useMemo(() => {
    return (
      currentUser?.email === "campusmart05@gmail.com" ||
      userProfile?.role === "admin" ||
      userProfile?.isAdmin === true ||
      userProfile?.admin === true
    );
  }, [currentUser?.email, userProfile]);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onSnapshot(
      collection(db, "pgCooks"),
      (snapshot) => {
        const list = snapshot.docs.map((cookDocument) => ({
          id: cookDocument.id,
          ...cookDocument.data(),
        }));

        list.sort((firstCook, secondCook) => {
          const firstTime =
            firstCook.updatedAt?.toMillis?.() ||
            firstCook.createdAt?.toMillis?.() ||
            0;

          const secondTime =
            secondCook.updatedAt?.toMillis?.() ||
            secondCook.createdAt?.toMillis?.() ||
            0;

          return secondTime - firstTime;
        });

        setCooks(list);
        setLoading(false);
        setPageError("");
      },
      (error) => {
        console.error("Manage cooks loading error:", error);
        setPageError("Cook profiles load nahi ho pa rahe hain.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    return () => {
      if (newPhotoPreview) {
        URL.revokeObjectURL(newPhotoPreview);
      }
    };
  }, [newPhotoPreview]);

  useEffect(() => {
    if (!isAdmin || !reviewingCook?.id) {
      setCookReviews([]);
      setReviewsLoading(false);
      return undefined;
    }

    setReviewsLoading(true);
    setReviewsError("");

    const reviewsQuery = query(
      collection(db, "cookReviews"),
      where("cookId", "==", reviewingCook.id)
    );

    const unsubscribe = onSnapshot(
      reviewsQuery,
      (snapshot) => {
        const reviewList = snapshot.docs.map((reviewDocument) => ({
          id: reviewDocument.id,
          ...reviewDocument.data(),
        }));

        reviewList.sort((firstReview, secondReview) => {
          const firstTime =
            firstReview.createdAt?.toMillis?.() ||
            firstReview.createdAt?.seconds * 1000 ||
            0;

          const secondTime =
            secondReview.createdAt?.toMillis?.() ||
            secondReview.createdAt?.seconds * 1000 ||
            0;

          return secondTime - firstTime;
        });

        setCookReviews(reviewList);
        setReviewsLoading(false);
        setReviewsError("");
      },
      (error) => {
        console.error("Cook reviews loading error:", error);
        setCookReviews([]);
        setReviewsLoading(false);
        setReviewsError("Reviews load nahi ho pa rahe hain.");
      }
    );

    return () => unsubscribe();
  }, [isAdmin, reviewingCook?.id]);

  const stats = useMemo(() => {
    const available = cooks.filter(
      (cook) => cook.available !== false
    ).length;

    return {
      total: cooks.length,
      available,
      unavailable: cooks.length - available,
    };
  }, [cooks]);

  const filteredCooks = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return cooks.filter((cook) => {
      const searchableText = [
        cook.name,
        cook.area,
        cook.city,
        cook.phone,
        cook.description,
        ...(Array.isArray(cook.cookingTypes)
          ? cook.cookingTypes
          : []),
        ...(Array.isArray(cook.meals) ? cook.meals : []),
        ...(Array.isArray(cook.specialDishes)
          ? cook.specialDishes
          : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        searchableText.includes(normalizedSearch);

      const isAvailable = cook.available !== false;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "available" && isAvailable) ||
        (statusFilter === "unavailable" && !isAvailable);

      return matchesSearch && matchesStatus;
    });
  }, [cooks, searchText, statusFilter]);

  function formatPrice(price) {
    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return "Price on request";
    }

    return `₹${numericPrice.toLocaleString("en-IN")}/student/month`;
  }

  function getCookImage(cook) {
    return (
      cook.photoURL ||
      cook.imageUrl ||
      cook.image ||
      "https://placehold.co/600x600?text=Cook"
    );
  }

  function openEditModal(cook) {
    setEditingCook(cook);
    setEditForm({
      name: cook.name || "",
      phone: cook.phone || "",
      whatsapp: cook.whatsapp || "",
      area: cook.area || "",
      city: cook.city || "Asansol",
      monthlyPrice:
        cook.monthlyPrice === undefined
          ? ""
          : String(cook.monthlyPrice),
      experienceYears:
        cook.experienceYears === undefined
          ? ""
          : String(cook.experienceYears),
      timings: cook.timings || "",
      capacity: cook.capacity || "",
      description: cook.description || "",
      available: cook.available !== false,
      cookingTypes: Array.isArray(cook.cookingTypes)
        ? cook.cookingTypes
        : [],
      meals: Array.isArray(cook.meals) ? cook.meals : [],
      specialDishesText: Array.isArray(cook.specialDishes)
        ? cook.specialDishes.join(", ")
        : "",
    });

    setNewPhotoFile(null);
    setNewPhotoPreview("");
    setActionMessage("");
    setActionError("");
  }

  function closeEditModal() {
    if (saving) {
      return;
    }

    if (newPhotoPreview) {
      URL.revokeObjectURL(newPhotoPreview);
    }

    setEditingCook(null);
    setEditForm(EMPTY_EDIT_FORM);
    setNewPhotoFile(null);
    setNewPhotoPreview("");
    setActionError("");
  }

  function updateEditField(field, value) {
    setEditForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setActionError("");
  }

  function toggleEditArrayField(field, value) {
    setEditForm((previous) => {
      const currentValues = Array.isArray(previous[field])
        ? previous[field]
        : [];

      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      return {
        ...previous,
        [field]: nextValues,
      };
    });

    setActionError("");
  }

  function handleEditPhoto(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setActionError("Please sirf image file select karo.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setActionError("Cook photo maximum 5 MB ki honi chahiye.");
      event.target.value = "";
      return;
    }

    if (newPhotoPreview) {
      URL.revokeObjectURL(newPhotoPreview);
    }

    setNewPhotoFile(file);
    setNewPhotoPreview(URL.createObjectURL(file));
    setActionError("");
  }

  async function uploadPhoto(file) {
    const uploadData = new FormData();

    uploadData.append("file", file);
    uploadData.append("upload_preset", UPLOAD_PRESET);
    uploadData.append("folder", "campusmart/pg-cooks");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: uploadData,
      }
    );

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        result?.error?.message || "Cloudinary image upload failed"
      );
    }

    if (!result?.secure_url) {
      throw new Error("Cloudinary image URL not found");
    }

    return result.secure_url;
  }

  function validateEditForm() {
    if (!editForm.name.trim()) {
      return "Cook ka naam enter karo.";
    }

    if (!/^\d{10}$/.test(editForm.phone.trim())) {
      return "Valid 10-digit phone number enter karo.";
    }

    const cleanWhatsapp = editForm.whatsapp.replace(/\D/g, "");

    if (cleanWhatsapp && cleanWhatsapp.length < 10) {
      return "Valid WhatsApp number enter karo.";
    }

    if (!editForm.area.trim() || !editForm.city.trim()) {
      return "Area aur city enter karo.";
    }

    const monthlyPrice = Number(editForm.monthlyPrice);

    if (!Number.isFinite(monthlyPrice) || monthlyPrice <= 0) {
      return "Valid monthly price per student enter karo.";
    }

    const experienceYears = Number(editForm.experienceYears || 0);

    if (!Number.isFinite(experienceYears) || experienceYears < 0) {
      return "Valid experience enter karo.";
    }

    if (editForm.cookingTypes.length === 0) {
      return "Kam se kam ek cooking type select karo.";
    }

    if (editForm.meals.length === 0) {
      return "Kam se kam ek meal select karo.";
    }

    if (!editForm.timings.trim()) {
      return "Available timing enter karo.";
    }

    if (!editForm.capacity.trim()) {
      return "Cooking capacity enter karo.";
    }

    if (!editForm.description.trim()) {
      return "Description enter karo.";
    }

    return "";
  }

  async function handleSaveEdit(event) {
    event.preventDefault();

    if (!editingCook?.id) {
      return;
    }

    setActionMessage("");
    setActionError("");

    const validationError = validateEditForm();

    if (validationError) {
      setActionError(validationError);
      return;
    }

    setSaving(true);

    try {
      let photoURL = getCookImage(editingCook);

      if (newPhotoFile) {
        photoURL = await uploadPhoto(newPhotoFile);
      }

      const cleanWhatsapp =
        editForm.whatsapp.replace(/\D/g, "") ||
        `91${editForm.phone.trim()}`;

      const specialDishes = editForm.specialDishesText
        .split(",")
        .map((dish) => dish.trim())
        .filter(Boolean);

      await updateDoc(doc(db, "pgCooks", editingCook.id), {
        name: editForm.name.trim(),
        photoURL,
        phone: editForm.phone.trim(),
        whatsapp: cleanWhatsapp,
        area: editForm.area.trim(),
        city: editForm.city.trim(),
        monthlyPrice: Number(editForm.monthlyPrice),
        experienceYears: Number(editForm.experienceYears || 0),
        timings: editForm.timings.trim(),
        capacity: editForm.capacity.trim(),
        description: editForm.description.trim(),
        available: Boolean(editForm.available),
        cookingTypes: editForm.cookingTypes,
        meals: editForm.meals,
        specialDishes,
        updatedAt: serverTimestamp(),
      });

      setActionMessage("Cook profile successfully update ho gayi.");
      closeEditModal();
    } catch (error) {
      console.error("Cook update error:", error);

      if (error?.code === "permission-denied") {
        setActionError(
          "Permission denied. Admin account aur Firestore rules check karo."
        );
      } else {
        setActionError(
          error?.message
            ? `Profile update nahi hui: ${error.message}`
            : "Profile update nahi ho paayi."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(cook) {
    if (!cook?.id || togglingCookId) {
      return;
    }

    setTogglingCookId(cook.id);
    setActionMessage("");
    setActionError("");

    try {
      await updateDoc(doc(db, "pgCooks", cook.id), {
        available: cook.available === false,
        updatedAt: serverTimestamp(),
      });

      setActionMessage(
        cook.available === false
          ? `${cook.name || "Cook"} ab Available hai.`
          : `${cook.name || "Cook"} ab Unavailable hai.`
      );
    } catch (error) {
      console.error("Cook availability update error:", error);
      setActionError("Availability update nahi ho paayi.");
    } finally {
      setTogglingCookId("");
    }
  }

  async function deleteReviewsInBatches(reviewDocuments) {
    const chunkSize = 450;

    for (
      let startIndex = 0;
      startIndex < reviewDocuments.length;
      startIndex += chunkSize
    ) {
      const chunk = reviewDocuments.slice(
        startIndex,
        startIndex + chunkSize
      );

      const batch = writeBatch(db);

      chunk.forEach((reviewDocument) => {
        batch.delete(reviewDocument.ref);
      });

      await batch.commit();
    }
  }

  function openReviewsModal(cook) {
    setReviewingCook(cook);
    setCookReviews([]);
    setReviewsLoading(true);
    setReviewsError("");
    setReviewsMessage("");
    setDeletingReviewId("");
  }

  function closeReviewsModal() {
    if (deletingReviewId) {
      return;
    }

    setReviewingCook(null);
    setCookReviews([]);
    setReviewsLoading(false);
    setReviewsError("");
    setReviewsMessage("");
    setDeletingReviewId("");
  }

  function formatReviewDate(timestamp) {
    const date =
      timestamp?.toDate?.() ||
      (timestamp?.seconds
        ? new Date(timestamp.seconds * 1000)
        : null);

    if (!date || Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  async function handleDeleteReview(review) {
    if (
      !review?.id ||
      !reviewingCook?.id ||
      deletingReviewId
    ) {
      return;
    }

    const shouldDelete = window.confirm(
      "Kya tum is review ko permanently delete karna chahte ho?"
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingReviewId(review.id);
    setReviewsError("");
    setReviewsMessage("");

    try {
      const remainingReviews = cookReviews.filter(
        (item) => item.id !== review.id
      );

      const nextTotalReviews = remainingReviews.length;

      const nextAverageRating =
        nextTotalReviews === 0
          ? 0
          : Number(
              (
                remainingReviews.reduce(
                  (total, item) =>
                    total + Number(item.rating || 0),
                  0
                ) / nextTotalReviews
              ).toFixed(1)
            );

      const batch = writeBatch(db);

      batch.delete(doc(db, "cookReviews", review.id));

      batch.update(doc(db, "pgCooks", reviewingCook.id), {
        averageRating: nextAverageRating,
        totalReviews: nextTotalReviews,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      setReviewsMessage("Review successfully delete ho gaya.");
    } catch (error) {
      console.error("Cook review delete error:", error);

      if (error?.code === "permission-denied") {
        setReviewsError(
          "Review delete permission denied. Admin account aur Firestore rules check karo."
        );
      } else {
        setReviewsError("Review delete nahi ho paaya.");
      }
    } finally {
      setDeletingReviewId("");
    }
  }

  async function handleDeleteCook(cook) {
    if (!cook?.id || deletingCookId) {
      return;
    }

    const shouldDelete = window.confirm(
      `Kya tum "${cook.name || "Cook"}" ka profile permanently delete karna chahte ho? Iske saare reviews bhi delete ho jayenge.`
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingCookId(cook.id);
    setActionMessage("");
    setActionError("");

    try {
      const reviewsQuery = query(
        collection(db, "cookReviews"),
        where("cookId", "==", cook.id)
      );

      const reviewsSnapshot = await getDocs(reviewsQuery);

      if (!reviewsSnapshot.empty) {
        await deleteReviewsInBatches(reviewsSnapshot.docs);
      }

      await deleteDoc(doc(db, "pgCooks", cook.id));

      setActionMessage(
        `${cook.name || "Cook"} ka profile delete ho gaya.`
      );
    } catch (error) {
      console.error("Cook delete error:", error);

      if (error?.code === "permission-denied") {
        setActionError(
          "Delete permission denied. Admin account aur Firestore rules check karo."
        );
      } else {
        setActionError("Cook profile delete nahi ho paayi.");
      }
    } finally {
      setDeletingCookId("");
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ChefHat size={30} />
          </div>

          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Admin Access Required
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Cook profiles manage karne ka access sirf admin ke paas hai.
          </p>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-6 h-12 w-full rounded-xl bg-blue-600 font-bold text-white"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-slate-900">
                Manage Cooks
              </h1>
              <p className="text-xs text-slate-500">
                Edit, availability aur delete
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/admin/add-cook")}
            className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-3 text-sm font-bold text-white"
          >
            <Plus size={18} />
            Add Cook
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white shadow-lg shadow-blue-200">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-blue-950">
              <ChefHat size={30} />
            </div>

            <div>
              <h2 className="text-xl font-extrabold">
                Cook Profile Management
              </h2>
              <p className="mt-1 text-sm text-blue-100">
                Saari cook listings ko ek jagah manage karo.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-3 gap-3">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Available" value={stats.available} />
          <StatCard label="Unavailable" value={stats.unavailable} />
        </section>

        {actionMessage && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            <Check size={20} />
            {actionMessage}
          </div>
        )}

        {actionError && !editingCook && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {actionError}
          </div>
        )}

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="relative">
            <Search
              size={19}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search name, area, phone or dish"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {[
              { value: "all", label: "All" },
              { value: "available", label: "Available" },
              { value: "unavailable", label: "Unavailable" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${
                  statusFilter === option.value
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-6 flex items-end justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Cook Profiles
            </h3>
            <p className="text-sm text-slate-500">
              {loading
                ? "Loading profiles..."
                : `${filteredCooks.length} profile${
                    filteredCooks.length === 1 ? "" : "s"
                  } found`}
            </p>
          </div>
        </div>

        {loading && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-3xl border border-slate-200 bg-white p-4"
              >
                <div className="h-48 rounded-2xl bg-slate-200" />
                <div className="mt-4 h-5 w-2/3 rounded bg-slate-200" />
                <div className="mt-3 h-4 w-1/2 rounded bg-slate-200" />
                <div className="mt-4 h-11 rounded-xl bg-slate-200" />
              </div>
            ))}
          </div>
        )}

        {!loading && pageError && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5 text-center text-red-700">
            {pageError}
          </div>
        )}

        {!loading &&
          !pageError &&
          filteredCooks.length === 0 && (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white py-12 text-center">
              <ChefHat
                size={34}
                className="mx-auto text-slate-300"
              />
              <h3 className="mt-4 font-bold text-slate-900">
                Koi profile nahi mili
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Search ya filter change karo.
              </p>
            </div>
          )}

        {!loading &&
          !pageError &&
          filteredCooks.length > 0 && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCooks.map((cook) => {
                const isAvailable = cook.available !== false;
                const averageRating = Number(
                  cook.averageRating || 0
                );
                const totalReviews = Number(
                  cook.totalReviews || 0
                );

                return (
                  <article
                    key={cook.id}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="relative h-52 bg-slate-100">
                      <img
                        src={getCookImage(cook)}
                        alt={cook.name || "Cook"}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.src =
                            "https://placehold.co/600x600?text=Cook";
                        }}
                      />

                      <span
                        className={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-xs font-bold ${
                          isAvailable
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-800 text-white"
                        }`}
                      >
                        {isAvailable
                          ? "Available"
                          : "Unavailable"}
                      </span>

                      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1.5 shadow">
                        <Star
                          size={14}
                          className="fill-yellow-400 text-yellow-400"
                        />
                        <span className="text-xs font-bold text-slate-800">
                          {averageRating > 0
                            ? averageRating.toFixed(1)
                            : "New"}
                        </span>
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="truncate text-lg font-bold text-slate-900">
                        {cook.name || "Cook"}
                      </h3>

                      <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-slate-500">
                        <MapPin size={15} />
                        {[cook.area, cook.city]
                          .filter(Boolean)
                          .join(", ") || "Location not added"}
                      </p>

                      <p className="mt-3 text-base font-extrabold text-blue-700">
                        {formatPrice(cook.monthlyPrice)}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {totalReviews} review
                        {totalReviews === 1 ? "" : "s"}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(cook)}
                          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 text-sm font-bold text-blue-700"
                        >
                          <Edit3 size={17} />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleAvailability(cook)}
                          disabled={togglingCookId === cook.id}
                          className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white disabled:opacity-60 ${
                            isAvailable
                              ? "bg-slate-700"
                              : "bg-emerald-600"
                          }`}
                        >
                          {togglingCookId === cook.id ? (
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />
                          ) : (
                            <Check size={17} />
                          )}
                          {isAvailable
                            ? "Set Unavailable"
                            : "Set Available"}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => openReviewsModal(cook)}
                        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 text-sm font-bold text-amber-700"
                      >
                        <Star
                          size={17}
                          className="fill-amber-400 text-amber-400"
                        />
                        Manage Reviews ({totalReviews})
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCook(cook)}
                        disabled={deletingCookId === cook.id}
                        className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 text-sm font-bold text-red-600 disabled:opacity-60"
                      >
                        {deletingCookId === cook.id ? (
                          <Loader2
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={17} />
                        )}
                        Delete Profile
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
      </main>

      {reviewingCook && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/55 sm:items-center sm:p-5"
          onClick={closeReviewsModal}
        >
          <div
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-[32px] bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-[32px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white pb-4">
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-600">
                  Review Moderation
                </p>

                <h2 className="truncate text-2xl font-extrabold text-slate-900">
                  {reviewingCook.name || "Cook"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {cookReviews.length} review
                  {cookReviews.length === 1 ? "" : "s"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeReviewsModal}
                disabled={Boolean(deletingReviewId)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 disabled:opacity-50"
                aria-label="Close reviews"
              >
                <X size={21} />
              </button>
            </div>

            {reviewsMessage && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                <Check size={19} />
                {reviewsMessage}
              </div>
            )}

            {reviewsError && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {reviewsError}
              </div>
            )}

            {reviewsLoading ? (
              <div className="flex min-h-52 items-center justify-center">
                <div className="text-center">
                  <Loader2
                    size={30}
                    className="mx-auto animate-spin text-blue-600"
                  />
                  <p className="mt-3 text-sm font-semibold text-slate-500">
                    Reviews loading...
                  </p>
                </div>
              </div>
            ) : cookReviews.length === 0 ? (
              <div className="py-14 text-center">
                <Star
                  size={36}
                  className="mx-auto text-slate-300"
                />

                <h3 className="mt-4 font-bold text-slate-900">
                  Abhi koi review nahi hai
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  User reviews yahan moderation ke liye dikhenge.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {cookReviews.map((review) => {
                  const rating = Math.max(
                    0,
                    Math.min(5, Number(review.rating || 0))
                  );

                  const reviewerName =
                    review.userName ||
                    review.reviewerName ||
                    "CampusMart User";

                  const reviewerPhoto =
                    review.userPhoto ||
                    review.photoURL ||
                    "";

                  return (
                    <article
                      key={review.id}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start gap-3">
                        {reviewerPhoto ? (
                          <img
                            src={reviewerPhoto}
                            alt={reviewerName}
                            className="h-11 w-11 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-extrabold text-blue-700">
                            {reviewerName
                              .trim()
                              .charAt(0)
                              .toUpperCase() || "U"}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-slate-900">
                                {reviewerName}
                              </h3>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {formatReviewDate(review.createdAt)}
                              </p>
                            </div>

                            <div className="flex items-center gap-0.5 rounded-full bg-white px-2.5 py-1.5 shadow-sm">
                              {[1, 2, 3, 4, 5].map(
                                (starValue) => (
                                  <Star
                                    key={starValue}
                                    size={14}
                                    className={
                                      starValue <= rating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-slate-300"
                                    }
                                  />
                                )
                              )}
                            </div>
                          </div>

                          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                            {review.comment?.trim() ||
                              "No written comment."}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteReview(review)
                        }
                        disabled={
                          deletingReviewId === review.id
                        }
                        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white text-sm font-bold text-red-600 disabled:opacity-60"
                      >
                        {deletingReviewId === review.id ? (
                          <Loader2
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 size={17} />
                        )}
                        Delete Review
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {editingCook && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 sm:items-center sm:p-5"
          onClick={closeEditModal}
        >
          <div
            className="max-h-[94vh] w-full overflow-y-auto rounded-t-[32px] bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-[32px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between bg-white pb-4">
              <div>
                <p className="text-sm font-bold text-blue-600">
                  Edit Profile
                </p>
                <h2 className="text-2xl font-extrabold text-slate-900">
                  {editingCook.name || "Cook"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={saving}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 disabled:opacity-50"
              >
                <X size={21} />
              </button>
            </div>

            {actionError && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {actionError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-5">
              <section className="rounded-3xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <Camera size={20} className="text-blue-600" />
                  <h3 className="font-bold text-slate-900">
                    Profile Photo
                  </h3>
                </div>

                <label className="mt-4 block cursor-pointer">
                  <div className="relative h-60 overflow-hidden rounded-2xl bg-slate-100">
                    <img
                      src={
                        newPhotoPreview ||
                        getCookImage(editingCook)
                      }
                      alt="Cook preview"
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/65 p-3 text-sm font-bold text-white">
                      <Upload size={17} />
                      Change photo
                    </div>
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditPhoto}
                    className="hidden"
                  />
                </label>
              </section>

              <section className="rounded-3xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-900">
                  Basic Details
                </h3>

                <div className="mt-4 space-y-4">
                  <EditField
                    label="Cook name"
                    value={editForm.name}
                    onChange={(value) =>
                      updateEditField("name", value)
                    }
                    icon={<ChefHat size={18} />}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <EditField
                      label="Phone number"
                      value={editForm.phone}
                      onChange={(value) =>
                        updateEditField(
                          "phone",
                          value.replace(/\D/g, "").slice(0, 10)
                        )
                      }
                    />

                    <EditField
                      label="WhatsApp number"
                      value={editForm.whatsapp}
                      onChange={(value) =>
                        updateEditField(
                          "whatsapp",
                          value.replace(/\D/g, "").slice(0, 12)
                        )
                      }
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <EditField
                      label="Area"
                      value={editForm.area}
                      onChange={(value) =>
                        updateEditField("area", value)
                      }
                      icon={<MapPin size={18} />}
                    />

                    <EditField
                      label="City"
                      value={editForm.city}
                      onChange={(value) =>
                        updateEditField("city", value)
                      }
                      icon={<MapPin size={18} />}
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <Utensils size={20} className="text-blue-600" />
                  <h3 className="font-bold text-slate-900">
                    Food Details
                  </h3>
                </div>

                <EditOptionGroup
                  label="Cooking type"
                  options={COOKING_TYPE_OPTIONS}
                  selectedValues={editForm.cookingTypes}
                  onToggle={(value) =>
                    toggleEditArrayField(
                      "cookingTypes",
                      value
                    )
                  }
                />

                <EditOptionGroup
                  label="Available meals"
                  options={MEAL_OPTIONS}
                  selectedValues={editForm.meals}
                  onToggle={(value) =>
                    toggleEditArrayField("meals", value)
                  }
                />

                <div className="mt-5">
                  <EditField
                    label="Special dishes"
                    value={editForm.specialDishesText}
                    onChange={(value) =>
                      updateEditField(
                        "specialDishesText",
                        value.slice(0, 300)
                      )
                    }
                    placeholder="Biryani, Chicken Curry, Litti Chokha"
                    icon={<Utensils size={18} />}
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Har dish comma se separate karo.
                  </p>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-900">
                  Price & Availability
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <EditField
                    label="Monthly price per student"
                    value={editForm.monthlyPrice}
                    onChange={(value) =>
                      updateEditField(
                        "monthlyPrice",
                        value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    icon={<IndianRupee size={18} />}
                  />

                  <EditField
                    label="Experience in years"
                    value={editForm.experienceYears}
                    onChange={(value) =>
                      updateEditField(
                        "experienceYears",
                        value.replace(/\D/g, "").slice(0, 2)
                      )
                    }
                    icon={<ChefHat size={18} />}
                  />
                </div>

                <div className="mt-4 space-y-4">
                  <EditField
                    label="Available timing"
                    value={editForm.timings}
                    onChange={(value) =>
                      updateEditField("timings", value)
                    }
                    icon={<Utensils size={18} />}
                  />

                  <EditField
                    label="Cooking capacity"
                    value={editForm.capacity}
                    onChange={(value) =>
                      updateEditField("capacity", value)
                    }
                    icon={<Users size={18} />}
                  />
                </div>

                <label className="mt-5 flex cursor-pointer items-center justify-between rounded-2xl bg-slate-50 p-4">
                  <div>
                    <p className="font-bold text-slate-900">
                      Currently available
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Off karne par profile unavailable show hogi
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={editForm.available}
                    onChange={(event) =>
                      updateEditField(
                        "available",
                        event.target.checked
                      )
                    }
                    className="h-5 w-5 accent-blue-600"
                  />
                </label>
              </section>

              <section className="rounded-3xl border border-slate-200 p-4">
                <label className="font-bold text-slate-900">
                  Description
                </label>

                <textarea
                  value={editForm.description}
                  onChange={(event) =>
                    updateEditField(
                      "description",
                      event.target.value.slice(0, 500)
                    )
                  }
                  rows={5}
                  maxLength={500}
                  className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />

                <p className="mt-2 text-right text-xs text-slate-400">
                  {editForm.description.length}/500
                </p>
              </section>

              <button
                type="submit"
                disabled={saving}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-base font-bold text-white shadow-lg shadow-blue-200 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2
                      size={20}
                      className="animate-spin"
                    />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    Save Changes
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <p className="text-2xl font-extrabold text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-500">
        {label}
      </p>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  icon,
  placeholder = "",
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
      </span>

      <div className="relative mt-2">
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </span>
        )}

        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 ${
            icon ? "pl-11" : "pl-4"
          }`}
        />
      </div>
    </label>
  );
}

function EditOptionGroup({
  label,
  options,
  selectedValues,
  onToggle,
}) {
  return (
    <div className="mt-5">
      <p className="text-sm font-semibold text-slate-700">
        {label}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = selectedValues.includes(option);

          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold ${
                selected
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {selected && <Check size={15} />}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}