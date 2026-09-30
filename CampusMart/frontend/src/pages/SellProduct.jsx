import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import Navbar from "../components/Navbar";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

const CLOUD_NAME = "docilvuyz";
const UPLOAD_PRESET = "campusmart_unsigned";

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const CATEGORY_OPTIONS = [
  "Books",
  "Electronics",
  "Mobiles",
  "Furniture",
  "Cycle",
  "Hostel Items",
  "Calculator",
  "Clothes",
];

const ICON_MAP = {
  Books: "📚",
  Electronics: "💻",
  Mobiles: "📱",
  Furniture: "🪑",
  Cycle: "🚲",
  "Hostel Items": "🛏️",
  Calculator: "🧮",
  Clothes: "👕",
};

export default function SellProduct({
  onLogout,
  currentUser,
}) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "Books",
    description: "",
    city: "",
  });

  const [imageFiles, setImageFiles] =
    useState([]);
  const [previewImages, setPreviewImages] =
    useState([]);
  const [loading, setLoading] =
    useState(false);
  const [uploadProgress, setUploadProgress] =
    useState("");

  useEffect(() => {
    return () => {
      previewImages.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [previewImages]);

  const remainingImageSlots = useMemo(
    () => MAX_IMAGES - imageFiles.length,
    [imageFiles.length]
  );

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function validateImage(file) {
    if (!file.type.startsWith("image/")) {
      return `${file.name} is not an image.`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} is larger than 5 MB.`;
    }

    return "";
  }

  function handleImages(event) {
    const selectedFiles = Array.from(
      event.target.files || []
    );

    event.target.value = "";

    if (!selectedFiles.length) return;

    if (
      imageFiles.length + selectedFiles.length >
      MAX_IMAGES
    ) {
      alert(
        `You can upload maximum ${MAX_IMAGES} images. ${remainingImageSlots} slot(s) remaining.`
      );
      return;
    }

    const validationError = selectedFiles
      .map(validateImage)
      .find(Boolean);

    if (validationError) {
      alert(validationError);
      return;
    }

    const nextPreviews = selectedFiles.map(
      (file) => URL.createObjectURL(file)
    );

    setImageFiles((previous) => [
      ...previous,
      ...selectedFiles,
    ]);

    setPreviewImages((previous) => [
      ...previous,
      ...nextPreviews,
    ]);
  }

  function removePreviewImage(index) {
    const removedPreview =
      previewImages[index];

    if (removedPreview) {
      URL.revokeObjectURL(removedPreview);
    }

    setImageFiles((previous) =>
      previous.filter((_, itemIndex) =>
        itemIndex !== index
      )
    );

    setPreviewImages((previous) =>
      previous.filter((_, itemIndex) =>
        itemIndex !== index
      )
    );
  }

  async function uploadSingleImage(file) {
    const data = new FormData();

    data.append("file", file);
    data.append(
      "upload_preset",
      UPLOAD_PRESET
    );

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: data,
      }
    );

    if (!response.ok) {
      throw new Error(
        "Image upload request failed."
      );
    }

    const uploaded = await response.json();

    if (!uploaded.secure_url) {
      throw new Error(
        "Image upload failed."
      );
    }

    return uploaded.secure_url;
  }

  async function uploadAllImages() {
    if (!imageFiles.length) return [];

    const uploadedUrls = [];

    for (
      let index = 0;
      index < imageFiles.length;
      index += 1
    ) {
      setUploadProgress(
        `Uploading image ${index + 1} of ${
          imageFiles.length
        }...`
      );

      const url = await uploadSingleImage(
        imageFiles[index]
      );

      uploadedUrls.push(url);
    }

    return uploadedUrls;
  }

  function validateForm() {
    const trimmedName = form.name.trim();
    const trimmedDescription =
      form.description.trim();
    const numericPrice = Number(form.price);

    if (!currentUser?.uid) {
      return "Please login again before publishing.";
    }

    if (trimmedName.length < 3) {
      return "Product name must be at least 3 characters.";
    }

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0
    ) {
      return "Enter a valid product price.";
    }

    if (trimmedDescription.length < 10) {
      return "Description must be at least 10 characters.";
    }

    if (!imageFiles.length) {
      return "Please upload at least one product image.";
    }

    return "";
  }

  async function publishProduct(event) {
    event.preventDefault();

    if (loading) return;

    const validationError = validateForm();

    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      setLoading(true);
      setUploadProgress("Preparing product...");

      const uploadedImages =
        await uploadAllImages();

      const productData = {
        name: form.name.trim(),
        price: Number(form.price),
        category: form.category,
        description:
          form.description.trim(),
        city:
          form.city.trim() ||
          "Campus Area",

        image: uploadedImages[0] || "",
        images: uploadedImages,

        icon:
          ICON_MAP[form.category] ||
          "📦",

        ownerId: currentUser.uid,
        ownerName:
          currentUser.displayName ||
          "CampusMart User",
        ownerEmail:
          currentUser.email || "",

        views: 0,
        searchCount: 0,
        featured: false,
        status: "available",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      setUploadProgress(
        "Publishing product..."
      );

      await addDoc(
        collection(db, "products"),
        productData
      );

      previewImages.forEach((url) => {
        URL.revokeObjectURL(url);
      });

      setPreviewImages([]);
      setImageFiles([]);

      navigate("/home");
    } catch (error) {
      console.error(
        "Publish product error:",
        error
      );

      alert(
        error?.message ||
          "Product could not be published."
      );
    } finally {
      setLoading(false);
      setUploadProgress("");
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar onLogout={onLogout} />

      <section className="mx-auto max-w-4xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 via-blue-500 to-amber-400 p-[1px] shadow-xl shadow-blue-500/10 sm:rounded-[2.5rem]">
          <Card className="rounded-[2rem] border-0 bg-white/95 p-4 backdrop-blur-xl dark:bg-slate-900/95 sm:rounded-[2.5rem] sm:p-8">
            <div className="mb-7 sm:mb-8">
              <p className="text-sm font-black text-blue-600">
                CampusMart
              </p>

              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-5xl">
                Sell Your Product
              </h1>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 sm:text-base">
                Add clear details and upload up to
                five product photos.
              </p>
            </div>

            <form
              onSubmit={publishProduct}
              className="space-y-5"
            >
              <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                <Input
                  label="Product Name"
                  name="name"
                  placeholder="DSA Book, Calculator..."
                  value={form.name}
                  onChange={handleChange}
                  disabled={loading}
                />

                <Input
                  label="Price"
                  name="price"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="250"
                  value={form.price}
                  onChange={handleChange}
                  disabled={loading}
                />

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                    Category
                  </label>

                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    disabled={loading}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    {CATEGORY_OPTIONS.map(
                      (category) => (
                        <option
                          key={category}
                          value={category}
                        >
                          {category}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <Input
                  label="Location"
                  name="city"
                  placeholder="Hostel Gate, Campus Block A..."
                  value={form.city}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="rounded-[1.7rem] border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:rounded-[2rem] sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Product Images
                  </label>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                    {imageFiles.length}/{MAX_IMAGES}
                  </span>
                </div>

                {remainingImageSlots > 0 && (
                  <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-slate-300 bg-white px-4 py-8 text-center transition active:scale-[0.99] dark:border-slate-700 dark:bg-slate-900">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImages}
                      disabled={loading}
                      className="hidden"
                    />

                    <div className="mb-3 text-5xl">
                      📸
                    </div>

                    <p className="font-black text-slate-800 dark:text-white">
                      Tap to upload product photos
                    </p>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {remainingImageSlots} slot(s)
                      remaining • Maximum 5 MB each
                    </p>
                  </label>
                )}

                {previewImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                    {previewImages.map(
                      (imageUrl, index) => (
                        <div
                          key={imageUrl}
                          className="group relative"
                        >
                          <img
                            src={imageUrl}
                            alt={`Preview ${
                              index + 1
                            }`}
                            className="h-32 w-full rounded-2xl border border-slate-200 object-cover dark:border-slate-800 sm:h-40"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              removePreviewImage(
                                index
                              )
                            }
                            disabled={loading}
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 font-black text-white shadow-md transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                            aria-label={`Remove image ${
                              index + 1
                            }`}
                          >
                            ×
                          </button>

                          {index === 0 && (
                            <span className="absolute bottom-2 left-2 rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white shadow">
                              Main Image
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                  Description
                </label>

                <textarea
                  name="description"
                  placeholder="Write product condition and useful details..."
                  value={form.description}
                  onChange={handleChange}
                  disabled={loading}
                  maxLength={1000}
                  className="h-36 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />

                <p className="mt-1 text-right text-xs font-bold text-slate-400">
                  {form.description.length}/1000
                </p>
              </div>

              {loading && uploadProgress && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300">
                  {uploadProgress}
                </div>
              )}

              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading
                    ? "Please wait..."
                    : "Publish Product"}
                </Button>

                <Button
                  type="button"
                  variant="soft"
                  className="w-full"
                  disabled={loading}
                  onClick={() =>
                    navigate("/home")
                  }
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </section>
    </div>
  );
}