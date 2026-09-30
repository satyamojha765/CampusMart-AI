import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import {
  ArrowLeft,
  Camera,
  Check,
  ChefHat,
  IndianRupee,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Save,
  Upload,
  Users,
  Utensils,
} from "lucide-react";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

const CLOUD_NAME = "docilvuyz";
const UPLOAD_PRESET = "campusmart_unsigned";

const INITIAL_FORM = {
  name: "",
  phone: "",
  whatsapp: "",
  area: "",
  city: "Asansol",
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

const COOKING_TYPE_OPTIONS = ["Veg", "Non-Veg"];
const MEAL_OPTIONS = ["Breakfast", "Lunch", "Dinner"];

export default function AddCook() {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [form, setForm] = useState(INITIAL_FORM);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isAdmin = useMemo(() => {
    return (
      currentUser?.email === "campusmart05@gmail.com" ||
      userProfile?.role === "admin" ||
      userProfile?.isAdmin === true ||
      userProfile?.admin === true
    );
  }, [currentUser?.email, userProfile]);

  useEffect(() => {
    return () => {
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  function updateField(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setMessage("");
    setErrorMessage("");
  }

  function toggleArrayField(field, value) {
    setForm((previous) => {
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

    setMessage("");
    setErrorMessage("");
  }

  function handlePhotoChange(event) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setErrorMessage("Please sirf image file select karo.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setErrorMessage("Cook photo maximum 5 MB ki honi chahiye.");
      event.target.value = "";
      return;
    }

    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }

    setPhotoFile(selectedFile);
    setPhotoPreview(URL.createObjectURL(selectedFile));
    setMessage("");
    setErrorMessage("");
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
      const cloudinaryMessage =
        result?.error?.message || "Cloudinary image upload failed";

      throw new Error(cloudinaryMessage);
    }

    if (!result?.secure_url) {
      throw new Error("Cloudinary image URL not found");
    }

    return result.secure_url;
  }

  function validateForm() {
    const monthlyPrice = Number(form.monthlyPrice);
    const experienceYears = Number(form.experienceYears);

    if (!form.name.trim()) {
      return "Cook ka naam enter karo.";
    }

    if (!/^\d{10}$/.test(form.phone.trim())) {
      return "Valid 10-digit phone number enter karo.";
    }

    const cleanWhatsapp = form.whatsapp.replace(/\D/g, "");

    if (cleanWhatsapp && cleanWhatsapp.length < 10) {
      return "Valid WhatsApp number enter karo.";
    }

    if (!form.area.trim() || !form.city.trim()) {
      return "Area aur city enter karo.";
    }

    if (!Number.isFinite(monthlyPrice) || monthlyPrice <= 0) {
      return "Valid monthly price enter karo.";
    }

    if (
      form.experienceYears !== "" &&
      (!Number.isFinite(experienceYears) || experienceYears < 0)
    ) {
      return "Valid experience enter karo.";
    }

    if (form.cookingTypes.length === 0) {
      return "Veg ya Non-Veg mein se kam se kam ek select karo.";
    }

    if (form.meals.length === 0) {
      return "Kam se kam ek meal select karo.";
    }

    if (!form.timings.trim()) {
      return "Available timing enter karo.";
    }

    if (!form.capacity.trim()) {
      return "Cooking capacity enter karo.";
    }

    if (!form.description.trim()) {
      return "Cook ka short description enter karo.";
    }

    if (!photoFile) {
      return "Cook ki profile photo select karo.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (!isAdmin) {
      setErrorMessage("Cook profile sirf admin add kar sakta hai.");
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const photoURL = await uploadPhoto(photoFile);
      const cleanWhatsapp =
        form.whatsapp.replace(/\D/g, "") ||
        `91${form.phone.trim()}`;

      const specialDishes = form.specialDishesText
        .split(",")
        .map((dish) => dish.trim())
        .filter(Boolean);

      await addDoc(collection(db, "pgCooks"), {
        name: form.name.trim(),
        photoURL,
        phone: form.phone.trim(),
        whatsapp: cleanWhatsapp,
        area: form.area.trim(),
        city: form.city.trim(),
        monthlyPrice: Number(form.monthlyPrice),
        experienceYears: Number(form.experienceYears || 0),
        timings: form.timings.trim(),
        capacity: form.capacity.trim(),
        description: form.description.trim(),
        available: Boolean(form.available),
        cookingTypes: form.cookingTypes,
        meals: form.meals,
        specialDishes,

        averageRating: 0,
        totalReviews: 0,

        createdBy: currentUser.uid,
        createdByEmail: currentUser.email || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }

      setForm(INITIAL_FORM);
      setPhotoFile(null);
      setPhotoPreview("");
      setMessage(
        "Cook profile successfully add ho gayi. Ab tum next cook add kar sakte ho."
      );

      const fileInput = document.getElementById("cook-photo");
      if (fileInput) {
        fileInput.value = "";
      }

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error("FULL ADD COOK ERROR:", error);
      console.error("ERROR CODE:", error?.code);
      console.error("ERROR MESSAGE:", error?.message);

      if (error?.code === "permission-denied") {
        setErrorMessage(
          "Permission denied. Firestore rules publish hue hain aur admin account se login ho, ye check karo."
        );
      } else {
        setErrorMessage(
          error?.message
            ? `Cook profile add nahi ho paayi: ${error.message}`
            : "Cook profile add nahi ho paayi. Dobara try karo."
        );
      }
    } finally {
      setSubmitting(false);
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
            Cook profile add karne ka access sirf admin account ke paas hai.
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
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-slate-900">
              Add Cook Profile
            </h1>
            <p className="text-xs text-slate-500">
              Har submit par nayi profile create hogi
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white shadow-lg shadow-blue-200">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-blue-950">
              <ChefHat size={30} />
            </div>

            <div>
              <h2 className="text-xl font-extrabold">
                Create a trusted cook profile
              </h2>
              <p className="mt-1 text-sm leading-5 text-blue-100">
                Photo, timing, price aur food preference add karo.
              </p>
            </div>
          </div>
        </section>

        {message && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Check size={15} />
            </div>

            <div className="flex-1">
              <p className="text-sm font-semibold">{message}</p>

              <button
                type="button"
                onClick={() => navigate("/pg/cooks")}
                className="mt-2 text-sm font-bold underline"
              >
                View all cook profiles
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Camera size={21} className="text-blue-600" />
              <h3 className="font-bold text-slate-900">Profile Photo</h3>
            </div>

            <label
              htmlFor="cook-photo"
              className="mt-4 block cursor-pointer"
            >
              {photoPreview ? (
                <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                  <img
                    src={photoPreview}
                    alt="Cook preview"
                    className="h-72 w-full object-cover"
                  />

                  <div className="absolute inset-x-0 bottom-0 bg-black/60 p-3 text-center text-sm font-bold text-white">
                    Tap to change photo
                  </div>
                </div>
              ) : (
                <div className="flex min-h-48 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 text-center transition hover:border-blue-400 hover:bg-blue-50">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                    <Upload size={26} />
                  </div>

                  <p className="mt-4 font-bold text-slate-900">
                    Upload cook photo
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    JPG, PNG or WEBP · Maximum 5 MB
                  </p>
                </div>
              )}

              <input
                id="cook-photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-900">Basic Details</h3>

            <div className="mt-4 space-y-4">
              <Field
                label="Cook name"
                value={form.name}
                onChange={(value) => updateField("name", value)}
                placeholder="Example: Sunita Devi"
                icon={<ChefHat size={18} />}
                required
              />

              <Field
                label="Phone number"
                value={form.phone}
                onChange={(value) =>
                  updateField("phone", value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="10-digit phone number"
                inputMode="numeric"
                icon={<Phone size={18} />}
                required
              />

              <Field
                label="WhatsApp number"
                value={form.whatsapp}
                onChange={(value) =>
                  updateField(
                    "whatsapp",
                    value.replace(/\D/g, "").slice(0, 12)
                  )
                }
                placeholder="Country code ke saath, optional"
                inputMode="numeric"
                icon={<Phone size={18} />}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Area"
                  value={form.area}
                  onChange={(value) => updateField("area", value)}
                  placeholder="Example: Burnpur"
                  icon={<MapPin size={18} />}
                  required
                />

                <Field
                  label="City"
                  value={form.city}
                  onChange={(value) => updateField("city", value)}
                  placeholder="Example: Asansol"
                  icon={<MapPin size={18} />}
                  required
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Utensils size={21} className="text-blue-600" />
              <h3 className="font-bold text-slate-900">
                Food & Meals
              </h3>
            </div>

            <OptionGroup
              label="Cooking type"
              options={COOKING_TYPE_OPTIONS}
              selectedValues={form.cookingTypes}
              onToggle={(value) =>
                toggleArrayField("cookingTypes", value)
              }
            />

            <OptionGroup
              label="Available meals"
              options={MEAL_OPTIONS}
              selectedValues={form.meals}
              onToggle={(value) => toggleArrayField("meals", value)}
            />

            <div className="mt-5">
              <Field
                label="Special dishes"
                value={form.specialDishesText}
                onChange={(value) =>
                  updateField("specialDishesText", value.slice(0, 300))
                }
                placeholder="Example: Biryani, Chicken Curry, Litti Chokha"
                icon={<Utensils size={18} />}
              />

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Har dish ko comma se separate karo.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold text-slate-900">
              Price & Availability
            </h3>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Monthly price per student"
                value={form.monthlyPrice}
                onChange={(value) =>
                  updateField(
                    "monthlyPrice",
                    value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                placeholder="Example: 2500 per student"
                inputMode="numeric"
                icon={<IndianRupee size={18} />}
                required
              />

              <Field
                label="Experience in years"
                value={form.experienceYears}
                onChange={(value) =>
                  updateField(
                    "experienceYears",
                    value.replace(/\D/g, "").slice(0, 2)
                  )
                }
                placeholder="Example: 5"
                inputMode="numeric"
                icon={<ChefHat size={18} />}
              />
            </div>

            <div className="mt-4 space-y-4">
              <Field
                label="Available timing"
                value={form.timings}
                onChange={(value) => updateField("timings", value)}
                placeholder="Example: 7 AM–10 AM, 6 PM–9 PM"
                icon={<Utensils size={18} />}
                required
              />

              <Field
                label="Cooking capacity"
                value={form.capacity}
                onChange={(value) => updateField("capacity", value)}
                placeholder="Example: 1–8 people"
                icon={<Users size={18} />}
                required
              />
            </div>

            <label className="mt-5 flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="font-bold text-slate-900">
                  Currently available
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Off karne par profile Unavailable show hogi
                </p>
              </div>

              <input
                type="checkbox"
                checked={form.available}
                onChange={(event) =>
                  updateField("available", event.target.checked)
                }
                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <label
              htmlFor="cook-description"
              className="font-bold text-slate-900"
            >
              Description
            </label>

            <textarea
              id="cook-description"
              value={form.description}
              onChange={(event) =>
                updateField("description", event.target.value.slice(0, 500))
              }
              rows={5}
              maxLength={500}
              placeholder="Cook ke experience, food quality, behaviour aur service ke baare mein likho..."
              className="mt-3 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />

            <p className="mt-2 text-right text-xs text-slate-400">
              {form.description.length}/500
            </p>
          </section>

          <button
            type="submit"
            disabled={submitting}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-base font-bold text-white shadow-lg shadow-blue-200 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={21} className="animate-spin" />
                Uploading & Saving...
              </>
            ) : (
              <>
                <Save size={21} />
                Add Cook Profile
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <Plus size={14} />
            Har submit par ek nayi cook profile create hogi
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  icon,
  required = false,
  inputMode = "text",
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>

      <div className="relative mt-2">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>

        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
        />
      </div>
    </label>
  );
}

function OptionGroup({
  label,
  options,
  selectedValues,
  onToggle,
}) {
  return (
    <div className="mt-5">
      <p className="text-sm font-semibold text-slate-700">{label}</p>

      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = selectedValues.includes(option);

          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition ${
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