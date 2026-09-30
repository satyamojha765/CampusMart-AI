import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
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

const initialForm = {
  name: "",
  description: "",
  rent: "",
  deposit: "",
  city: "Asansol",
  location: "",
  address: "",
  phone: "",
  gender: "boys",
  availableBeds: "",
  foodIncluded: false,
  foodType: "",
};

export default function AddPG({ onSuccess }) {
  const { currentUser } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [sharing, setSharing] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [rules, setRules] = useState([""]);

  const [imageFiles, setImageFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);

  const [loading, setLoading] = useState(false);
  const [uploadProgressText, setUploadProgressText] =
    useState("");

  useEffect(() => {
    return () => {
      previewImages.forEach((image) => {
        if (image.startsWith("blob:")) {
          URL.revokeObjectURL(image);
        }
      });
    };
  }, [previewImages]);

  function handleChange(event) {
    const { name, value, type, checked } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function toggleSharing(value) {
    setSharing((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  function toggleAmenity(value) {
    setAmenities((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  function handleImages(event) {
    const selectedFiles = Array.from(
      event.target.files || []
    );

    const totalFiles =
      imageFiles.length + selectedFiles.length;

    if (totalFiles > 8) {
      alert("Maximum 8 images allowed");
      event.target.value = "";
      return;
    }

    const validFiles = selectedFiles.filter(
      (file) => file.type.startsWith("image/")
    );

    if (validFiles.length !== selectedFiles.length) {
      alert("Only image files are allowed");
    }

    const newPreviews = validFiles.map((file) =>
      URL.createObjectURL(file)
    );

    setImageFiles((current) => [
      ...current,
      ...validFiles,
    ]);

    setPreviewImages((current) => [
      ...current,
      ...newPreviews,
    ]);

    event.target.value = "";
  }

  function removeImage(index) {
    const imageToRemove = previewImages[index];

    if (imageToRemove?.startsWith("blob:")) {
      URL.revokeObjectURL(imageToRemove);
    }

    setImageFiles((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );

    setPreviewImages((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function updateRule(index, value) {
    setRules((current) =>
      current.map((rule, itemIndex) =>
        itemIndex === index ? value : rule
      )
    );
  }

  function addRule() {
    setRules((current) => [...current, ""]);
  }

  function removeRule(index) {
    setRules((current) => {
      if (current.length === 1) {
        return [""];
      }

      return current.filter(
        (_, itemIndex) => itemIndex !== index
      );
    });
  }

  async function uploadSingleImage(file) {
    const data = new FormData();

    data.append("file", file);
    data.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: data,
      }
    );

    if (!response.ok) {
      throw new Error("Image upload failed");
    }

    const uploaded = await response.json();

    if (!uploaded.secure_url) {
      throw new Error("Cloudinary image URL not found");
    }

    return uploaded.secure_url;
  }

  async function uploadAllImages() {
    if (imageFiles.length === 0) {
      return [];
    }

    const uploadedUrls = [];

    for (
      let index = 0;
      index < imageFiles.length;
      index += 1
    ) {
      setUploadProgressText(
        `Uploading image ${index + 1} of ${
          imageFiles.length
        }`
      );

      const uploadedUrl = await uploadSingleImage(
        imageFiles[index]
      );

      uploadedUrls.push(uploadedUrl);
    }

    return uploadedUrls;
  }

  function validateForm() {
    if (!form.name.trim()) {
      return "PG name required";
    }

    if (!form.description.trim()) {
      return "PG description required";
    }

    if (!form.rent || Number(form.rent) <= 0) {
      return "Valid monthly rent required";
    }

    if (!form.location.trim()) {
      return "Location required";
    }

    if (!form.address.trim()) {
      return "Full address required";
    }

    if (!form.phone.trim()) {
      return "Owner phone number required";
    }

    const cleanPhone = form.phone.replace(/\D/g, "");

    if (cleanPhone.length < 10) {
      return "Enter a valid phone number";
    }

    if (!form.availableBeds) {
      return "Available beds required";
    }

    if (sharing.length === 0) {
      return "Select at least one sharing type";
    }

    if (imageFiles.length === 0) {
      return "Upload at least one PG image";
    }

    if (
      form.foodIncluded &&
      !form.foodType.trim()
    ) {
      return "Food details required";
    }

    return "";
  }

  async function submitPG(event) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      alert(validationError);
      return;
    }

    if (!currentUser) {
      alert("Please login again");
      return;
    }

    try {
      setLoading(true);
      setUploadProgressText("Preparing images...");

      const uploadedImages =
        await uploadAllImages();

      const filteredRules = rules
        .map((rule) => rule.trim())
        .filter(Boolean);

      setUploadProgressText("Submitting PG...");

      await addDoc(collection(db, "pgs"), {
        ownerId: currentUser.uid,
        ownerName:
          currentUser.displayName || "PG Owner",
        ownerEmail: currentUser.email || "",

        owner: {
          name:
            currentUser.displayName || "PG Owner",
          phone: form.phone.trim(),
          photo: currentUser.photoURL || "",
          verified: false,
        },

        name: form.name.trim(),
        description: form.description.trim(),

        rent: Number(form.rent),
        deposit: Number(form.deposit) || 0,

        city: form.city.trim() || "Asansol",
        location: form.location.trim(),
        address: form.address.trim(),

        phone: form.phone.trim(),
        ownerPhone: form.phone.trim(),

        gender: form.gender,
        sharing,
        amenities,

        availableBeds:
          Number(form.availableBeds) || 0,

        foodIncluded:
          form.foodIncluded === true,

        foodType: form.foodIncluded
          ? form.foodType.trim()
          : "",

        rules: filteredRules,

        image: uploadedImages[0] || "",
        images: uploadedImages,

        verified: false,
        active: true,
        approvalStatus: "pending",
        rejectionReason: "",

        rating: 0,
        reviewCount: 0,
        views: 0,
        contactCount: 0,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      alert(
        "PG submitted successfully. Admin approval ke baad listing public page par show hogi."
      );

      setForm(initialForm);
      setSharing([]);
      setAmenities([]);
      setRules([""]);
      setImageFiles([]);

      previewImages.forEach((image) => {
        if (image.startsWith("blob:")) {
          URL.revokeObjectURL(image);
        }
      });

      setPreviewImages([]);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("PG submit error:", error);
      alert(error.message);
    } finally {
      setLoading(false);
      setUploadProgressText("");
    }
  }

  return (
    <section className="px-4 py-5">
      <div className="mb-5">
        <p className="text-sm font-black text-blue-600">
          New property
        </p>

        <h2 className="mt-1 text-3xl font-black tracking-tight">
          Add your PG
        </h2>

        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Complete details add karo. Listing admin approval
          ke baad public hogi.
        </p>
      </div>

      <form
        onSubmit={submitPG}
        className="space-y-5"
      >
        <FormSection
          title="Basic Information"
          description="PG ka naam aur description add karo."
        >
          <div className="space-y-4">
            <FormInput
              label="PG Name"
              name="name"
              placeholder="Campus Nest Boys PG"
              value={form.name}
              onChange={handleChange}
              required
            />

            <FormTextarea
              label="Description"
              name="description"
              placeholder="Rooms, environment aur PG ke baare me details..."
              value={form.description}
              onChange={handleChange}
              rows={5}
              required
            />
          </div>
        </FormSection>

        <FormSection
          title="Rent & Availability"
          description="Monthly pricing aur bed availability."
        >
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Monthly Rent"
              name="rent"
              type="number"
              min="0"
              placeholder="4500"
              value={form.rent}
              onChange={handleChange}
              required
            />

            <FormInput
              label="Deposit"
              name="deposit"
              type="number"
              min="0"
              placeholder="3000"
              value={form.deposit}
              onChange={handleChange}
            />
          </div>

          <div className="mt-4">
            <FormInput
              label="Available Beds"
              name="availableBeds"
              type="number"
              min="0"
              placeholder="3"
              value={form.availableBeds}
              onChange={handleChange}
              required
            />
          </div>
        </FormSection>

        <FormSection
          title="Location"
          description="Student ko exact property location samajh aani chahiye."
        >
          <div className="space-y-4">
            <FormInput
              label="Area / Location"
              name="location"
              placeholder="Burnpur, Court More..."
              value={form.location}
              onChange={handleChange}
              required
            />

            <FormInput
              label="City"
              name="city"
              placeholder="Asansol"
              value={form.city}
              onChange={handleChange}
            />

            <FormTextarea
              label="Full Address"
              name="address"
              placeholder="House number, road, landmark, area..."
              value={form.address}
              onChange={handleChange}
              rows={4}
              required
            />
          </div>
        </FormSection>

        <FormSection
          title="Owner Contact"
          description="Students isi number se owner ko contact karenge."
        >
          <FormInput
            label="Phone Number"
            name="phone"
            type="tel"
            placeholder="9876543210"
            value={form.phone}
            onChange={handleChange}
            required
          />
        </FormSection>

        <FormSection
          title="PG Type"
          description="Property kis category ke students ke liye hai."
        >
          <div className="grid grid-cols-3 gap-3">
            {["boys", "girls", "unisex"].map(
              (gender) => (
                <ChoiceButton
                  key={gender}
                  active={form.gender === gender}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      gender,
                    }))
                  }
                >
                  {gender === "boys" && "👨‍🎓 Boys"}
                  {gender === "girls" && "👩‍🎓 Girls"}
                  {gender === "unisex" && "✨ Unisex"}
                </ChoiceButton>
              )
            )}
          </div>
        </FormSection>

        <FormSection
          title="Room Sharing"
          description="Available room sharing options select karo."
        >
          <div className="grid grid-cols-3 gap-3">
            {sharingOptions.map((item) => (
              <ChoiceButton
                key={item}
                active={sharing.includes(item)}
                onClick={() => toggleSharing(item)}
              >
                {capitalize(item)}
              </ChoiceButton>
            ))}
          </div>
        </FormSection>

        <FormSection
          title="Amenities"
          description="PG me available facilities select karo."
        >
          <div className="grid grid-cols-2 gap-3">
            {amenityOptions.map((amenity) => (
              <ChoiceButton
                key={amenity}
                active={amenities.includes(amenity)}
                onClick={() =>
                  toggleAmenity(amenity)
                }
              >
                {amenity}
              </ChoiceButton>
            ))}
          </div>
        </FormSection>

        <FormSection
          title="Food Information"
          description="Food included hai ya nahi."
        >
          <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-slate-50 p-4">
            <div>
              <p className="font-black">
                Food included
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-500">
                Monthly rent ke saath meals included hain.
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
                placeholder="Veg & Non-Veg, Breakfast and Dinner..."
                value={form.foodType}
                onChange={handleChange}
                required
              />
            </div>
          )}
        </FormSection>

        <FormSection
          title="PG Rules"
          description="Owner ke important rules add karo."
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
                  placeholder={`Rule ${index + 1}`}
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={() => removeRule(index)}
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
          description="Minimum 1 aur maximum 8 images upload karo."
        >
          <label className="flex min-h-[170px] cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center transition active:scale-[0.99]">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImages}
              className="hidden"
            />

            <div className="text-5xl">📸</div>

            <p className="mt-3 font-black">
              Upload PG photos
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              {imageFiles.length}/8 images selected
            </p>
          </label>

          {previewImages.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {previewImages.map((image, index) => (
                <div
                  key={`${image}_${index}`}
                  className="relative overflow-hidden rounded-2xl"
                >
                  <img
                    src={image}
                    alt={`PG preview ${index + 1}`}
                    className="h-36 w-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 font-black text-white shadow-lg"
                  >
                    ×
                  </button>

                  {index === 0 && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-black text-white">
                      Main Image
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </FormSection>

        <div className="rounded-[26px] border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⏳</span>

            <div>
              <p className="font-black text-amber-900">
                Admin approval required
              </p>

              <p className="mt-1 text-xs font-semibold leading-5 text-amber-800">
                Submit karne ke baad listing pending
                rahegi. Admin approve karega tabhi public
                PG page par show hogi.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[22px] bg-blue-600 py-4 text-base font-black text-white shadow-xl shadow-blue-600/25 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? uploadProgressText || "Submitting..."
            : "Submit PG for Approval"}
        </button>
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
  const text = String(value || "");

  return text.charAt(0).toUpperCase() + text.slice(1);
}