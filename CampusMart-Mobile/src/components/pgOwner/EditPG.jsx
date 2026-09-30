import { useEffect, useMemo, useState } from "react";
import {
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

const CLOUD_NAME = "docilvuyz";
const UPLOAD_PRESET = "campusmart_unsigned";

const sharingOptions = [
  "single",
  "double",
  "triple",
];

const amenityOptions = [
  "WiFi",
  "Food",
  "AC",
  "CCTV",
  "RO Water",
  "Attached Bathroom",
  "Geyser",
  "Power Backup",
  "Parking",
  "Study Table",
  "Cupboard",
  "Housekeeping",
  "Laundry",
  "Refrigerator",
  "Balcony",
];

export default function EditPG({
  listing,
  onSuccess,
  onCancel,
}) {
  const { currentUser } = useAuth();

  const [form, setForm] = useState({
    name: "",
    description: "",
    rent: "",
    deposit: "",
    city: "",
    location: "",
    address: "",
    phone: "",
    gender: "boys",
    availableBeds: "",
    foodIncluded: false,
    foodType: "",
  });

  const [sharing, setSharing] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [rules, setRules] = useState([""]);

  const [existingImages, setExistingImages] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [newPreviewImages, setNewPreviewImages] = useState([]);

  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState("");

  useEffect(() => {
    if (!listing) {
      return;
    }

    setForm({
      name: listing.name || "",
      description: listing.description || "",
      rent:
        listing.rent !== undefined &&
        listing.rent !== null
          ? String(listing.rent)
          : "",
      deposit:
        listing.deposit !== undefined &&
        listing.deposit !== null
          ? String(listing.deposit)
          : "",
      city: listing.city || "Asansol",
      location: listing.location || "",
      address: listing.address || "",
      phone:
        listing.phone ||
        listing.ownerPhone ||
        listing.owner?.phone ||
        "",
      gender: listing.gender || "boys",
      availableBeds:
        listing.availableBeds !== undefined &&
        listing.availableBeds !== null
          ? String(listing.availableBeds)
          : "",
      foodIncluded:
        listing.foodIncluded === true,
      foodType: listing.foodType || "",
    });

    setSharing(
      Array.isArray(listing.sharing)
        ? listing.sharing
        : listing.sharing
        ? [listing.sharing]
        : []
    );

    setAmenities(
      Array.isArray(listing.amenities)
        ? listing.amenities
        : []
    );

    setRules(
      Array.isArray(listing.rules) &&
        listing.rules.length > 0
        ? listing.rules
        : [""]
    );

    const images =
      Array.isArray(listing.images) &&
      listing.images.length > 0
        ? listing.images
        : listing.image
        ? [listing.image]
        : [];

    setExistingImages(images);
  }, [listing]);

  useEffect(() => {
    return () => {
      newPreviewImages.forEach((image) => {
        if (image.startsWith("blob:")) {
          URL.revokeObjectURL(image);
        }
      });
    };
  }, [newPreviewImages]);

  const totalImageCount =
    existingImages.length + newImageFiles.length;

  const allPreviewImages = useMemo(() => {
    return [
      ...existingImages.map((url) => ({
        type: "existing",
        url,
      })),
      ...newPreviewImages.map((url, index) => ({
        type: "new",
        url,
        newIndex: index,
      })),
    ];
  }, [existingImages, newPreviewImages]);

  function handleChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]:
        type === "checkbox" ? checked : value,
    }));
  }

  function toggleSharing(value) {
    setSharing((current) =>
      current.includes(value)
        ? current.filter(
            (item) => item !== value
          )
        : [...current, value]
    );
  }

  function toggleAmenity(value) {
    setAmenities((current) =>
      current.includes(value)
        ? current.filter(
            (item) => item !== value
          )
        : [...current, value]
    );
  }

  function handleNewImages(event) {
    const selectedFiles = Array.from(
      event.target.files || []
    );

    if (selectedFiles.length === 0) {
      return;
    }

    const validFiles = selectedFiles.filter(
      (file) => file.type.startsWith("image/")
    );

    if (
      validFiles.length !== selectedFiles.length
    ) {
      alert("Only image files are allowed");
    }

    const nextTotal =
      existingImages.length +
      newImageFiles.length +
      validFiles.length;

    if (nextTotal > 8) {
      alert(
        `Maximum 8 images allowed. Abhi ${totalImageCount} images selected hain.`
      );

      event.target.value = "";
      return;
    }

    const previews = validFiles.map((file) =>
      URL.createObjectURL(file)
    );

    setNewImageFiles((current) => [
      ...current,
      ...validFiles,
    ]);

    setNewPreviewImages((current) => [
      ...current,
      ...previews,
    ]);

    event.target.value = "";
  }

  function removeExistingImage(index) {
    setExistingImages((current) =>
      current.filter(
        (_, itemIndex) => itemIndex !== index
      )
    );
  }

  function removeNewImage(index) {
    const image = newPreviewImages[index];

    if (image?.startsWith("blob:")) {
      URL.revokeObjectURL(image);
    }

    setNewImageFiles((current) =>
      current.filter(
        (_, itemIndex) => itemIndex !== index
      )
    );

    setNewPreviewImages((current) =>
      current.filter(
        (_, itemIndex) => itemIndex !== index
      )
    );
  }

  function removeImage(imageItem, index) {
    if (imageItem.type === "existing") {
      removeExistingImage(index);
      return;
    }

    removeNewImage(imageItem.newIndex);
  }

  function moveImageToMain(imageItem, index) {
    if (imageItem.type === "existing") {
      setExistingImages((current) => {
        const selected = current[index];

        return [
          selected,
          ...current.filter(
            (_, itemIndex) =>
              itemIndex !== index
          ),
        ];
      });

      return;
    }

    const newIndex = imageItem.newIndex;

    setNewImageFiles((current) => {
      const selected = current[newIndex];

      return [
        selected,
        ...current.filter(
          (_, itemIndex) =>
            itemIndex !== newIndex
        ),
      ];
    });

    setNewPreviewImages((current) => {
      const selected = current[newIndex];

      return [
        selected,
        ...current.filter(
          (_, itemIndex) =>
            itemIndex !== newIndex
        ),
      ];
    });

    setExistingImages([]);
  }

  function updateRule(index, value) {
    setRules((current) =>
      current.map((rule, itemIndex) =>
        itemIndex === index ? value : rule
      )
    );
  }

  function addRule() {
    setRules((current) => [
      ...current,
      "",
    ]);
  }

  function removeRule(index) {
    setRules((current) => {
      if (current.length === 1) {
        return [""];
      }

      return current.filter(
        (_, itemIndex) =>
          itemIndex !== index
      );
    });
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
        "Image upload failed"
      );
    }

    const uploaded = await response.json();

    if (!uploaded.secure_url) {
      throw new Error(
        "Cloudinary image URL not found"
      );
    }

    return uploaded.secure_url;
  }

  async function uploadNewImages() {
    if (newImageFiles.length === 0) {
      return [];
    }

    const urls = [];

    for (
      let index = 0;
      index < newImageFiles.length;
      index += 1
    ) {
      setProgressText(
        `Uploading new image ${index + 1} of ${
          newImageFiles.length
        }`
      );

      const url = await uploadSingleImage(
        newImageFiles[index]
      );

      urls.push(url);
    }

    return urls;
  }

  function validateForm() {
    if (!form.name.trim()) {
      return "PG name required";
    }

    if (!form.description.trim()) {
      return "PG description required";
    }

    if (
      !form.rent ||
      Number(form.rent) <= 0
    ) {
      return "Valid monthly rent required";
    }

    if (!form.location.trim()) {
      return "Location required";
    }

    if (!form.address.trim()) {
      return "Full address required";
    }

    if (!form.phone.trim()) {
      return "Phone number required";
    }

    const cleanPhone =
      form.phone.replace(/\D/g, "");

    if (cleanPhone.length < 10) {
      return "Enter a valid phone number";
    }

    if (
      form.availableBeds === "" ||
      Number(form.availableBeds) < 0
    ) {
      return "Valid available beds required";
    }

    if (sharing.length === 0) {
      return "Select at least one sharing type";
    }

    if (totalImageCount === 0) {
      return "At least one PG image required";
    }

    if (
      form.foodIncluded &&
      !form.foodType.trim()
    ) {
      return "Food details required";
    }

    return "";
  }

  async function saveChanges(event) {
    event.preventDefault();

    if (
      !currentUser ||
      !listing ||
      loading
    ) {
      return;
    }

    if (
      listing.ownerId !== currentUser.uid
    ) {
      alert(
        "You cannot edit this listing"
      );
      return;
    }

    const validationError =
      validateForm();

    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      setLoading(true);
      setProgressText(
        "Preparing listing..."
      );

      const uploadedNewImages =
        await uploadNewImages();

      const finalImages = [
        ...existingImages,
        ...uploadedNewImages,
      ].slice(0, 8);

      const filteredRules = rules
        .map((rule) => rule.trim())
        .filter(Boolean);

      setProgressText(
        "Saving changes..."
      );

      await updateDoc(
        doc(db, "pgs", listing.id),
        {
          name: form.name.trim(),
          description:
            form.description.trim(),

          rent: Number(form.rent),
          deposit:
            Number(form.deposit) || 0,

          city:
            form.city.trim() ||
            "Asansol",
          location:
            form.location.trim(),
          address:
            form.address.trim(),

          phone: form.phone.trim(),
          ownerPhone:
            form.phone.trim(),

          owner: {
            name:
              listing.owner?.name ||
              listing.ownerName ||
              currentUser.displayName ||
              "PG Owner",

            phone:
              form.phone.trim(),

            photo:
              listing.owner?.photo ||
              currentUser.photoURL ||
              "",

            verified: false,
          },

          gender: form.gender,
          sharing,
          amenities,

          availableBeds:
            Number(form.availableBeds) ||
            0,

          foodIncluded:
            form.foodIncluded === true,

          foodType:
            form.foodIncluded
              ? form.foodType.trim()
              : "",

          rules: filteredRules,

          image:
            finalImages[0] || "",
          images: finalImages,

          approvalStatus: "pending",
          verified: false,
          rejectionReason: "",

          updatedAt:
            serverTimestamp(),
        }
      );

      alert(
        "PG updated successfully. Admin approval ke baad listing dobara public hogi."
      );

      newPreviewImages.forEach(
        (image) => {
          if (image.startsWith("blob:")) {
            URL.revokeObjectURL(image);
          }
        }
      );

      setNewImageFiles([]);
      setNewPreviewImages([]);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(
        "PG update error:",
        error
      );

      alert(error.message);
    } finally {
      setLoading(false);
      setProgressText("");
    }
  }

  if (!listing) {
    return (
      <section className="px-4 py-6">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center">
          <div className="text-6xl">
            🏚️
          </div>

          <h2 className="mt-5 text-2xl font-black">
            Listing not selected
          </h2>

          <button
            type="button"
            onClick={onCancel}
            className="mt-6 rounded-2xl bg-blue-600 px-6 py-3 font-black text-white"
          >
            Back to My PGs
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black text-blue-600">
            Property editor
          </p>

          <h2 className="mt-1 text-3xl font-black tracking-tight">
            Edit PG
          </h2>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Changes save hone ke baad listing
            dobara admin approval me jayegi.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm disabled:opacity-60"
        >
          ← Back
        </button>
      </div>

      <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">
            ⚠️
          </span>

          <div>
            <p className="font-black text-amber-900">
              Re-approval required
            </p>

            <p className="mt-1 text-xs font-semibold leading-5 text-amber-800">
              Approved listing edit karne ke
              baad public page se hide ho jayegi.
              Admin approve karega tab dobara
              visible hogi.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={saveChanges}
        className="mt-5 space-y-5"
      >
        <FormSection
          title="Basic Information"
          description="PG ka naam aur complete description."
        >
          <div className="space-y-4">
            <FormInput
              label="PG Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Campus Nest Boys PG"
              required
            />

            <FormTextarea
              label="Description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Rooms, environment aur facilities..."
              rows={5}
              required
            />
          </div>
        </FormSection>

        <FormSection
          title="Rent & Availability"
          description="Pricing aur available beds update karo."
        >
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Monthly Rent"
              name="rent"
              type="number"
              min="0"
              value={form.rent}
              onChange={handleChange}
              placeholder="4500"
              required
            />

            <FormInput
              label="Deposit"
              name="deposit"
              type="number"
              min="0"
              value={form.deposit}
              onChange={handleChange}
              placeholder="3000"
            />
          </div>

          <div className="mt-4">
            <FormInput
              label="Available Beds"
              name="availableBeds"
              type="number"
              min="0"
              value={form.availableBeds}
              onChange={handleChange}
              placeholder="3"
              required
            />
          </div>
        </FormSection>

        <FormSection
          title="Location"
          description="Property ka exact location update karo."
        >
          <div className="space-y-4">
            <FormInput
              label="Area / Location"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Burnpur, Court More..."
              required
            />

            <FormInput
              label="City"
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="Asansol"
            />

            <FormTextarea
              label="Full Address"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="House number, road, landmark..."
              rows={4}
              required
            />
          </div>
        </FormSection>

        <FormSection
          title="Owner Contact"
          description="Students isi number par contact karenge."
        >
          <FormInput
            label="Phone Number"
            name="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange}
            placeholder="9876543210"
            required
          />
        </FormSection>

        <FormSection
          title="PG Type"
          description="Boys, Girls ya Unisex select karo."
        >
          <div className="grid grid-cols-3 gap-3">
            {[
              "boys",
              "girls",
              "unisex",
            ].map((gender) => (
              <ChoiceButton
                key={gender}
                active={
                  form.gender === gender
                }
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    gender,
                  }))
                }
              >
                {gender === "boys" &&
                  "👨‍🎓 Boys"}

                {gender === "girls" &&
                  "👩‍🎓 Girls"}

                {gender === "unisex" &&
                  "✨ Unisex"}
              </ChoiceButton>
            ))}
          </div>
        </FormSection>

        <FormSection
          title="Room Sharing"
          description="Available sharing options update karo."
        >
          <div className="grid grid-cols-3 gap-3">
            {sharingOptions.map((item) => (
              <ChoiceButton
                key={item}
                active={sharing.includes(item)}
                onClick={() =>
                  toggleSharing(item)
                }
              >
                {capitalize(item)}
              </ChoiceButton>
            ))}
          </div>
        </FormSection>

        <FormSection
          title="Amenities"
          description="Available facilities select karo."
        >
          <div className="grid grid-cols-2 gap-3">
            {amenityOptions.map(
              (amenity) => (
                <ChoiceButton
                  key={amenity}
                  active={amenities.includes(
                    amenity
                  )}
                  onClick={() =>
                    toggleAmenity(amenity)
                  }
                >
                  {amenity}
                </ChoiceButton>
              )
            )}
          </div>
        </FormSection>

        <FormSection
          title="Food Information"
          description="Food details update karo."
        >
          <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-slate-50 p-4">
            <div>
              <p className="font-black">
                Food included
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-500">
                Monthly rent ke saath meals
                included hain.
              </p>
            </div>

            <input
              type="checkbox"
              name="foodIncluded"
              checked={form.foodIncluded}
              onChange={handleChange}
              className="h-5 w-5 accent-blue-600"
            />
          </label>

          {form.foodIncluded && (
            <div className="mt-4">
              <FormInput
                label="Food Details"
                name="foodType"
                value={form.foodType}
                onChange={handleChange}
                placeholder="Veg & Non-Veg, Breakfast and Dinner..."
                required
              />
            </div>
          )}
        </FormSection>

        <FormSection
          title="PG Rules"
          description="Property ke rules update karo."
        >
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <div
                key={index}
                className="flex gap-2"
              >
                <input
                  value={rule}
                  onChange={(event) =>
                    updateRule(
                      index,
                      event.target.value
                    )
                  }
                  placeholder={`Rule ${
                    index + 1
                  }`}
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    removeRule(index)
                  }
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 font-black text-red-500"
                >
                  ×
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addRule}
              className="w-full rounded-2xl border-2 border-dashed border-blue-200 py-3 font-black text-blue-600"
            >
              + Add another rule
            </button>
          </div>
        </FormSection>

        <FormSection
          title="PG Images"
          description="Existing images remove ya new images add karo."
        >
          <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center transition active:scale-[0.99]">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleNewImages}
              className="hidden"
            />

            <div className="text-5xl">
              📸
            </div>

            <p className="mt-3 font-black">
              Add more PG photos
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              {totalImageCount}/8 images
            </p>
          </label>

          {allPreviewImages.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {allPreviewImages.map(
                (imageItem, index) => (
                  <div
                    key={`${imageItem.url}_${index}`}
                    className="relative overflow-hidden rounded-2xl"
                  >
                    <img
                      src={imageItem.url}
                      alt={`PG ${index + 1}`}
                      className="h-36 w-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeImage(
                          imageItem,
                          index
                        )
                      }
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 font-black text-white shadow-lg"
                    >
                      ×
                    </button>

                    {index === 0 ? (
                      <span className="absolute bottom-2 left-2 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-black text-white">
                        Main Image
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          moveImageToMain(
                            imageItem,
                            index
                          )
                        }
                        className="absolute bottom-2 left-2 rounded-full bg-white/95 px-3 py-1 text-[10px] font-black text-blue-700 shadow"
                      >
                        Make Main
                      </button>
                    )}

                    <span className="absolute bottom-2 right-2 rounded-full bg-slate-950/70 px-2 py-1 text-[9px] font-black text-white">
                      {imageItem.type ===
                      "existing"
                        ? "Saved"
                        : "New"}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </FormSection>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-[22px] bg-slate-100 py-4 font-black text-slate-700 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="rounded-[22px] bg-blue-600 py-4 font-black text-white shadow-xl shadow-blue-600/25 disabled:opacity-60"
          >
            {loading
              ? progressText ||
                "Saving..."
              : "Save & Submit Again"}
          </button>
        </div>
      </form>
    </section>
  );
}

function FormSection({
  title,
  description,
  children,
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-black">
          {title}
        </h3>

        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}

function FormInput({
  label,
  name,
  value,
  onChange,
  ...props
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">
        {label}
      </label>

      <input
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        {...props}
      />
    </div>
  );
}

function FormTextarea({
  label,
  name,
  value,
  onChange,
  rows = 4,
  ...props
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">
        {label}
      </label>

      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={rows}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        {...props}
      />
    </div>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-3 py-3 text-xs font-black transition ${
        active
          ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
          : "border-slate-200 bg-slate-50 text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function capitalize(value) {
  const text = String(
    value || ""
  ).trim();

  if (!text) {
    return "";
  }

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
}