import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

import {
  Camera,
  MediaTypeSelection,
} from "@capacitor/camera";

import { db } from "../firebase";
import Navbar from "../components/Navbar";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

const CLOUD_NAME = "docilvuyz";
const UPLOAD_PRESET = "campusmart_unsigned";
const MAX_IMAGES = 5;

export default function SellProduct({
  fetchProducts,
  onLogout,
  currentUser,
}) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "Books",
    description: "",
    city: "",
    image: "",
    images: [],
  });

  const [imageFiles, setImageFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);

  const [loading, setLoading] = useState(false);
  const [openingCamera, setOpeningCamera] = useState(false);
  const [openingGallery, setOpeningGallery] = useState(false);

  useEffect(() => {
    return () => {
      previewImages.forEach((preview) => {
        if (preview.startsWith("blob:")) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [previewImages]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  }

  function updateSelectedImages(newFiles, newPreviews) {
    setImageFiles(newFiles);
    setPreviewImages(newPreviews);

    setForm((previousForm) => ({
      ...previousForm,
      image: newPreviews[0] || "",
      images: newPreviews,
    }));
  }

  function addSelectedImages(files, previews) {
    const remainingSlots =
      MAX_IMAGES - imageFiles.length;

    if (remainingSlots <= 0) {
      alert("Maximum 5 images allowed");
      return;
    }

    const acceptedFiles = files.slice(
      0,
      remainingSlots
    );

    const acceptedPreviews = previews.slice(
      0,
      remainingSlots
    );

    if (files.length > remainingSlots) {
      alert(
        `Only ${remainingSlots} more image${
          remainingSlots === 1 ? "" : "s"
        } can be added`
      );
    }

    updateSelectedImages(
      [...imageFiles, ...acceptedFiles],
      [...previewImages, ...acceptedPreviews]
    );
  }

  async function mediaPathToFile(
    webPath,
    fileName
  ) {
    const response = await fetch(webPath);

    if (!response.ok) {
      throw new Error(
        "Selected image could not be loaded"
      );
    }

    const blob = await response.blob();

    const extension =
      blob.type?.split("/")[1] || "jpg";

    return new File(
      [blob],
      `${fileName}.${extension}`,
      {
        type: blob.type || "image/jpeg",
      }
    );
  }

  function isCancelledError(error) {
    const message =
      error?.message?.toLowerCase() || "";

    const code =
      error?.code?.toLowerCase() || "";

    return (
      message.includes("cancel") ||
      code.includes("0006") ||
      code.includes("0020") ||
      code.includes("cancel")
    );
  }

  async function takePhoto() {
    if (imageFiles.length >= MAX_IMAGES) {
      alert("Maximum 5 images allowed");
      return;
    }

    try {
      setOpeningCamera(true);

      const photo = await Camera.takePhoto({
        quality: 85,
        correctOrientation: true,
        saveToGallery: false,
        editable: "no",
      });

      if (!photo?.webPath) {
        throw new Error(
          "Camera photo could not be loaded"
        );
      }

      const file = await mediaPathToFile(
        photo.webPath,
        `campusmart-camera-${Date.now()}`
      );

      addSelectedImages(
        [file],
        [photo.webPath]
      );
    } catch (error) {
      if (!isCancelledError(error)) {
        console.error("Camera error:", error);

        alert(
          error?.message ||
            "Unable to open camera"
        );
      }
    } finally {
      setOpeningCamera(false);
    }
  }

  async function chooseFromGallery() {
    const remainingSlots =
      MAX_IMAGES - imageFiles.length;

    if (remainingSlots <= 0) {
      alert("Maximum 5 images allowed");
      return;
    }

    try {
      setOpeningGallery(true);

      const result =
        await Camera.chooseFromGallery({
          mediaType: MediaTypeSelection.Photo,
          allowMultipleSelection: true,
          limit: remainingSlots,
          includeMetadata: true,
        });

      const selectedPhotos =
        result?.results || [];

      if (selectedPhotos.length === 0) {
        return;
      }

      const validPhotos =
        selectedPhotos.filter(
          (photo) => photo.webPath
        );

      const files = await Promise.all(
        validPhotos.map((photo, index) =>
          mediaPathToFile(
            photo.webPath,
            `campusmart-gallery-${
              Date.now() + index
            }`
          )
        )
      );

      const previews = validPhotos.map(
        (photo) => photo.webPath
      );

      addSelectedImages(files, previews);
    } catch (error) {
      if (!isCancelledError(error)) {
        console.error("Gallery error:", error);

        alert(
          error?.message ||
            "Unable to open gallery"
        );
      }
    } finally {
      setOpeningGallery(false);
    }
  }

  function handleBrowserImages(event) {
    const files = Array.from(
      event.target.files || []
    );

    if (files.length === 0) return;

    const validFiles = files.filter(
      (file) =>
        file.type.startsWith("image/")
    );

    if (validFiles.length !== files.length) {
      alert("Please select image files only");
    }

    const previews = validFiles.map(
      (file) => URL.createObjectURL(file)
    );

    addSelectedImages(
      validFiles,
      previews
    );

    event.target.value = "";
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

    const uploaded = await response.json();

    if (
      !response.ok ||
      !uploaded.secure_url
    ) {
      throw new Error(
        uploaded?.error?.message ||
          "Image upload failed"
      );
    }

    return uploaded.secure_url;
  }

  async function uploadAllImages() {
    if (imageFiles.length === 0) {
      return [];
    }

    const uploadedUrls = [];

    for (const file of imageFiles) {
      const url =
        await uploadSingleImage(file);

      uploadedUrls.push(url);
    }

    return uploadedUrls;
  }

  async function publishProduct(event) {
    event.preventDefault();

    if (
      !form.name.trim() ||
      !form.price ||
      !form.description.trim()
    ) {
      alert(
        "Product name, price and description required"
      );
      return;
    }

    if (!currentUser?.uid) {
      alert("Please login again");
      return;
    }

    try {
      setLoading(true);

      const uploadedImages =
        await uploadAllImages();

      const mainImage =
        uploadedImages[0] || "";

      const iconMap = {
        Books: "📚",
        Electronics: "💻",
        Mobiles: "📱",
        Furniture: "🪑",
        Cycle: "🚲",
        "Hostel Items": "🛏️",
        Calculator: "🧮",
        Clothes: "👕",
      };

      await addDoc(
        collection(db, "products"),
        {
          name: form.name.trim(),
          price: form.price,
          category: form.category,
          description:
            form.description.trim(),
          city:
            form.city.trim() ||
            "Campus Area",

          image: mainImage,
          images: uploadedImages,

          icon:
            iconMap[form.category] ||
            "📦",

          ownerId: currentUser.uid,
          ownerName:
            currentUser.displayName ||
            "CampusMart User",
          ownerEmail:
            currentUser.email || "",

          views: 0,
          status: "available",
          createdAt: serverTimestamp(),
        }
      );

      await fetchProducts?.();

      navigate("/home");
    } catch (error) {
      console.error(
        "Publish product error:",
        error
      );

      alert(
        error?.message ||
          "Product could not be published"
      );
    } finally {
      setLoading(false);
    }
  }

  function removePreviewImage(index) {
    const previewToRemove =
      previewImages[index];

    if (
      previewToRemove?.startsWith("blob:")
    ) {
      URL.revokeObjectURL(
        previewToRemove
      );
    }

    const newFiles =
      imageFiles.filter(
        (_, fileIndex) =>
          fileIndex !== index
      );

    const newPreviews =
      previewImages.filter(
        (_, previewIndex) =>
          previewIndex !== index
      );

    updateSelectedImages(
      newFiles,
      newPreviews
    );
  }

  const selectedCount =
    previewImages.length;

  const remainingCount =
    MAX_IMAGES - selectedCount;

  const choosingImage =
    openingCamera || openingGallery;

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
                Add product details and upload up
                to 5 images.
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
                />

                <Input
                  label="Price"
                  name="price"
                  type="number"
                  min="0"
                  placeholder="250"
                  value={form.price}
                  onChange={handleChange}
                />

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">
                    Category
                  </label>

                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option>Books</option>
                    <option>
                      Electronics
                    </option>
                    <option>Mobiles</option>
                    <option>Furniture</option>
                    <option>Cycle</option>
                    <option>
                      Hostel Items
                    </option>
                    <option>
                      Calculator
                    </option>
                    <option>Clothes</option>
                  </select>
                </div>

                <Input
                  label="Location"
                  name="city"
                  placeholder="Hostel Gate, Campus Block A..."
                  value={form.city}
                  onChange={handleChange}
                />
              </div>

              <div className="rounded-[1.7rem] border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:rounded-[2rem] sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
                      Product Images
                    </label>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {selectedCount}/
                      {MAX_IMAGES} selected
                    </p>
                  </div>

                  {selectedCount > 0 && (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                      {remainingCount} left
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={takePhoto}
                    disabled={
                      choosingImage ||
                      selectedCount >= MAX_IMAGES
                    }
                    className="flex min-h-[130px] flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-blue-300 bg-blue-50 px-3 py-5 text-center transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-800 dark:bg-blue-950/30"
                  >
                    <span className="text-4xl">
                      📷
                    </span>

                    <span className="mt-3 text-sm font-black text-blue-700 dark:text-blue-300">
                      {openingCamera
                        ? "Opening..."
                        : "Take Photo"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={
                      chooseFromGallery
                    }
                    disabled={
                      choosingImage ||
                      selectedCount >= MAX_IMAGES
                    }
                    className="flex min-h-[130px] flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-slate-300 bg-white px-3 py-5 text-center transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <span className="text-4xl">
                      🖼️
                    </span>

                    <span className="mt-3 text-sm font-black text-slate-800 dark:text-white">
                      {openingGallery
                        ? "Opening..."
                        : "Choose Gallery"}
                    </span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={
                    handleBrowserImages
                  }
                  className="hidden"
                />

                {previewImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                    {previewImages.map(
                      (image, index) => (
                        <div
                          key={`${image}-${index}`}
                          className="group relative"
                        >
                          <img
                            src={image}
                            alt={`Product preview ${
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
                            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 font-black text-white shadow-md transition active:scale-95"
                            aria-label="Remove image"
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
                  placeholder="Write product condition, details..."
                  value={form.description}
                  onChange={handleChange}
                  className="h-36 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    loading || choosingImage
                  }
                >
                  {loading
                    ? "Publishing..."
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