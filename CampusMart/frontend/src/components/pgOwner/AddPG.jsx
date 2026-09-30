import { useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

const CLOUD_NAME = "docilvuyz";
const UPLOAD_PRESET = "campusmart_unsigned";

const roomTypeOptions = [
  {
    value: "single",
    label: "Single Room",
    shortLabel: "Single",
    icon: "🛏️",
  },
  {
    value: "double",
    label: "Double Sharing",
    shortLabel: "Double",
    icon: "🛏️🛏️",
  },
  {
    value: "triple",
    label: "Triple Sharing",
    shortLabel: "Triple",
    icon: "🛏️🛏️🛏️",
  },
];

const amenityOptions = [
  "WiFi",
  "Food",
  "AC",
  "Cooler",
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
  deposit: "",
  city: "Asansol",
  location: "",
  address: "",
  phone: "",
  gender: "boys",
  foodIncluded: false,
  foodType: "",
};

function createEmptyRoomDetails() {
  return {
    rent: "",
    availableBeds: "",
    imageFiles: [],
    previewImages: [],
  };
}

function createInitialRoomTypeDetails() {
  return {
    single: createEmptyRoomDetails(),
    double: createEmptyRoomDetails(),
    triple: createEmptyRoomDetails(),
  };
}

export default function AddPG({ onSuccess }) {
  const { currentUser } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [selectedRoomTypes, setSelectedRoomTypes] =
    useState([]);
  const [roomTypeDetails, setRoomTypeDetails] = useState(
    createInitialRoomTypeDetails
  );

  const [amenities, setAmenities] = useState([]);
  const [rules, setRules] = useState([""]);

  const [imageFiles, setImageFiles] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);

  const [loading, setLoading] = useState(false);
  const [uploadProgressText, setUploadProgressText] =
    useState("");

  const coverPreviewRef = useRef([]);
  const roomPreviewRef = useRef(
    createInitialRoomTypeDetails()
  );

  useEffect(() => {
    coverPreviewRef.current = previewImages;
  }, [previewImages]);

  useEffect(() => {
    roomPreviewRef.current = roomTypeDetails;
  }, [roomTypeDetails]);

  useEffect(() => {
    return () => {
      coverPreviewRef.current.forEach(revokePreview);

      Object.values(roomPreviewRef.current).forEach(
        (room) => {
          room.previewImages.forEach(revokePreview);
        }
      );
    };
  }, []);

  function handleChange(event) {
    const { name, value, type, checked } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function toggleRoomType(value) {
    const isSelected =
      selectedRoomTypes.includes(value);

    if (isSelected) {
      roomTypeDetails[value].previewImages.forEach(
        revokePreview
      );

      setSelectedRoomTypes((current) =>
        current.filter((item) => item !== value)
      );

      setRoomTypeDetails((current) => ({
        ...current,
        [value]: createEmptyRoomDetails(),
      }));

      return;
    }

    setSelectedRoomTypes((current) =>
      roomTypeOptions
        .map((option) => option.value)
        .filter(
          (roomType) =>
            current.includes(roomType) ||
            roomType === value
        )
    );
  }

  function updateRoomField(roomType, field, value) {
    setRoomTypeDetails((current) => ({
      ...current,
      [roomType]: {
        ...current[roomType],
        [field]: value,
      },
    }));
  }

  function toggleAmenity(value) {
    setAmenities((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  function handleCoverImages(event) {
    const selectedFiles = getValidImages(
      event.target.files
    );

    if (
      imageFiles.length + selectedFiles.length >
      8
    ) {
      alert("Maximum 8 PG cover images allowed");
      event.target.value = "";
      return;
    }

    const newPreviews = selectedFiles.map((file) =>
      URL.createObjectURL(file)
    );

    setImageFiles((current) => [
      ...current,
      ...selectedFiles,
    ]);

    setPreviewImages((current) => [
      ...current,
      ...newPreviews,
    ]);

    event.target.value = "";
  }

  function removeCoverImage(index) {
    const imageToRemove = previewImages[index];
    revokePreview(imageToRemove);

    setImageFiles((current) =>
      current.filter(
        (_, itemIndex) => itemIndex !== index
      )
    );

    setPreviewImages((current) =>
      current.filter(
        (_, itemIndex) => itemIndex !== index
      )
    );
  }

  function handleRoomImages(roomType, event) {
    const selectedFiles = getValidImages(
      event.target.files
    );

    const currentRoom = roomTypeDetails[roomType];

    if (
      currentRoom.imageFiles.length +
        selectedFiles.length >
      6
    ) {
      alert(
        `Maximum 6 ${capitalize(
          roomType
        )} room images allowed`
      );
      event.target.value = "";
      return;
    }

    const newPreviews = selectedFiles.map((file) =>
      URL.createObjectURL(file)
    );

    setRoomTypeDetails((current) => ({
      ...current,
      [roomType]: {
        ...current[roomType],
        imageFiles: [
          ...current[roomType].imageFiles,
          ...selectedFiles,
        ],
        previewImages: [
          ...current[roomType].previewImages,
          ...newPreviews,
        ],
      },
    }));

    event.target.value = "";
  }

  function removeRoomImage(roomType, index) {
    const room = roomTypeDetails[roomType];
    revokePreview(room.previewImages[index]);

    setRoomTypeDetails((current) => ({
      ...current,
      [roomType]: {
        ...current[roomType],
        imageFiles: current[
          roomType
        ].imageFiles.filter(
          (_, itemIndex) => itemIndex !== index
        ),
        previewImages: current[
          roomType
        ].previewImages.filter(
          (_, itemIndex) => itemIndex !== index
        ),
      },
    }));
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
      throw new Error(
        "Cloudinary image URL not found"
      );
    }

    return uploaded.secure_url;
  }

  async function uploadImageList(
    files,
    progressLabel
  ) {
    if (files.length === 0) {
      return [];
    }

    const uploadedUrls = [];

    for (
      let index = 0;
      index < files.length;
      index += 1
    ) {
      setUploadProgressText(
        `Uploading ${progressLabel} ${index + 1} of ${
          files.length
        }`
      );

      const uploadedUrl = await uploadSingleImage(
        files[index]
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

    if (selectedRoomTypes.length === 0) {
      return "Select at least one room type";
    }

    for (const roomType of selectedRoomTypes) {
      const room = roomTypeDetails[roomType];
      const roomLabel =
        roomTypeOptions.find(
          (option) => option.value === roomType
        )?.label || capitalize(roomType);

      if (!room.rent || Number(room.rent) <= 0) {
        return `Valid rent required for ${roomLabel}`;
      }

      if (
        !room.availableBeds ||
        Number(room.availableBeds) <= 0
      ) {
        return `Available beds required for ${roomLabel}`;
      }

      if (room.imageFiles.length === 0) {
        return `Upload at least one image for ${roomLabel}`;
      }
    }

    if (imageFiles.length === 0) {
      return "Upload at least one PG cover image";
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
      setUploadProgressText(
        "Preparing PG cover images..."
      );

      const uploadedCoverImages =
        await uploadImageList(
          imageFiles,
          "PG cover image"
        );

      const uploadedRoomTypes = [];

      for (const roomType of selectedRoomTypes) {
        const room = roomTypeDetails[roomType];
        const roomOption = roomTypeOptions.find(
          (option) => option.value === roomType
        );

        const uploadedRoomImages =
          await uploadImageList(
            room.imageFiles,
            `${roomOption?.shortLabel || capitalize(
              roomType
            )} room image`
          );

        uploadedRoomTypes.push({
          id: `${roomType}-room`,
          type: roomType,
          sharing: roomType,
          title:
            roomOption?.label ||
            `${capitalize(roomType)} Room`,
          rent: Number(room.rent),
          availableBeds:
            Number(room.availableBeds) || 0,
          image:
            uploadedRoomImages[0] ||
            uploadedCoverImages[0] ||
            "",
          images:
            uploadedRoomImages.length > 0
              ? uploadedRoomImages
              : uploadedCoverImages,
          active: true,
        });
      }

      const roomRents = uploadedRoomTypes.map(
        (room) => room.rent
      );

      const lowestRent = Math.min(...roomRents);

      const totalAvailableBeds =
        uploadedRoomTypes.reduce(
          (total, room) =>
            total + room.availableBeds,
          0
        );

      const legacyRoomFields =
        uploadedRoomTypes.reduce(
          (fields, room) => ({
            ...fields,
            [`${room.type}Rent`]: room.rent,
            [`${room.type}AvailableBeds`]:
              room.availableBeds,
          }),
          {}
        );

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

        rent: lowestRent,
        deposit: Number(form.deposit) || 0,

        city: form.city.trim() || "Asansol",
        location: form.location.trim(),
        address: form.address.trim(),

        phone: form.phone.trim(),
        ownerPhone: form.phone.trim(),

        gender: form.gender,
        sharing: selectedRoomTypes,
        roomTypes: uploadedRoomTypes,
        roomTypeCount: uploadedRoomTypes.length,
        ...legacyRoomFields,

        amenities,

        availableBeds: totalAvailableBeds,

        foodIncluded:
          form.foodIncluded === true,

        foodType: form.foodIncluded
          ? form.foodType.trim()
          : "",

        rules: filteredRules,

        image: uploadedCoverImages[0] || "",
        images: uploadedCoverImages,

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

      resetForm();

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

  function resetForm() {
    previewImages.forEach(revokePreview);

    Object.values(roomTypeDetails).forEach(
      (room) => {
        room.previewImages.forEach(revokePreview);
      }
    );

    setForm(initialForm);
    setSelectedRoomTypes([]);
    setRoomTypeDetails(
      createInitialRoomTypeDetails()
    );
    setAmenities([]);
    setRules([""]);
    setImageFiles([]);
    setPreviewImages([]);
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
          PG aur har room sharing type ki complete
          details add karo. Listing admin approval ke
          baad public hogi.
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

            <FormInput
              label="Security Deposit"
              name="deposit"
              type="number"
              min="0"
              placeholder="3000"
              value={form.deposit}
              onChange={handleChange}
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
                  {gender === "unisex" &&
                    "✨ Unisex"}
                </ChoiceButton>
              )
            )}
          </div>
        </FormSection>

        <FormSection
          title="Room Types"
          description="Available room types select karo. Har selected type ka alag rent, beds aur photos add honge."
        >
          <div className="grid grid-cols-3 gap-3">
            {roomTypeOptions.map((option) => (
              <ChoiceButton
                key={option.value}
                active={selectedRoomTypes.includes(
                  option.value
                )}
                onClick={() =>
                  toggleRoomType(option.value)
                }
              >
                <span className="block text-base">
                  {option.icon}
                </span>
                <span className="mt-1 block">
                  {option.shortLabel}
                </span>
              </ChoiceButton>
            ))}
          </div>

          {selectedRoomTypes.length === 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-4 py-4 text-center">
              <p className="text-sm font-black text-blue-700">
                Single, Double ya Triple select karo
              </p>
              <p className="mt-1 text-xs font-semibold text-blue-600">
                Select karte hi us room ka form niche
                open hoga.
              </p>
            </div>
          )}

          <div className="mt-4 space-y-4">
            {selectedRoomTypes.map((roomType) => {
              const room =
                roomTypeDetails[roomType];
              const option = roomTypeOptions.find(
                (item) => item.value === roomType
              );

              return (
                <RoomTypeForm
                  key={roomType}
                  roomType={roomType}
                  option={option}
                  room={room}
                  onFieldChange={updateRoomField}
                  onImagesChange={handleRoomImages}
                  onRemoveImage={removeRoomImage}
                />
              );
            })}
          </div>
        </FormSection>

        <FormSection
          title="PG Cover Images"
          description="Ye image Find PG ki first screen par PG name ke saath dikhegi. Minimum 1 aur maximum 8 images."
        >
          <ImagePicker
            title="Upload PG cover photos"
            countText={`${imageFiles.length}/8 images selected`}
            multiple
            onChange={handleCoverImages}
          />

          {previewImages.length > 0 && (
            <ImagePreviewGrid
              images={previewImages}
              onRemove={removeCoverImage}
              firstBadge="Main PG Image"
            />
          )}
        </FormSection>

        <FormSection
          title="Amenities"
          description="PG me available common facilities select karo."
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
                Monthly rent ke saath meals included
                hain.
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

        <div className="rounded-[26px] border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⏳</span>

            <div>
              <p className="font-black text-amber-900">
                Admin approval required
              </p>

              <p className="mt-1 text-xs font-semibold leading-5 text-amber-800">
                Submit karne ke baad listing pending
                rahegi. Admin approve karega tabhi
                public PG page par show hogi.
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

function RoomTypeForm({
  roomType,
  option,
  room,
  onFieldChange,
  onImagesChange,
  onRemoveImage,
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-blue-200 bg-blue-50/60">
      <div className="flex items-center gap-3 border-b border-blue-100 bg-white px-4 py-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-lg">
          {option?.icon || "🛏️"}
        </div>

        <div>
          <h4 className="font-black text-slate-900">
            {option?.label ||
              `${capitalize(roomType)} Room`}
          </h4>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">
            Is room type ki alag details
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Monthly Rent"
            type="number"
            min="0"
            placeholder="4500"
            value={room.rent}
            onChange={(event) =>
              onFieldChange(
                roomType,
                "rent",
                event.target.value
              )
            }
            required
          />

          <FormInput
            label="Available Beds"
            type="number"
            min="1"
            placeholder="2"
            value={room.availableBeds}
            onChange={(event) =>
              onFieldChange(
                roomType,
                "availableBeds",
                event.target.value
              )
            }
            required
          />
        </div>

        <ImagePicker
          title={`Upload ${
            option?.shortLabel ||
            capitalize(roomType)
          } room photos`}
          countText={`${room.imageFiles.length}/6 images selected`}
          multiple
          onChange={(event) =>
            onImagesChange(roomType, event)
          }
          compact
        />

        {room.previewImages.length > 0 && (
          <ImagePreviewGrid
            images={room.previewImages}
            onRemove={(index) =>
              onRemoveImage(roomType, index)
            }
            firstBadge={`${option?.shortLabel || capitalize(
              roomType
            )} Main`}
          />
        )}
      </div>
    </section>
  );
}

function ImagePicker({
  title,
  countText,
  onChange,
  multiple = false,
  compact = false,
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-slate-300 bg-white px-4 text-center transition active:scale-[0.99] ${
        compact ? "min-h-[130px] py-5" : "min-h-[170px] py-7"
      }`}
    >
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={onChange}
        className="hidden"
      />

      <div className={compact ? "text-4xl" : "text-5xl"}>
        📸
      </div>

      <p className="mt-3 font-black">{title}</p>

      <p className="mt-1 text-xs font-semibold text-slate-500">
        {countText}
      </p>
    </label>
  );
}

function ImagePreviewGrid({
  images,
  onRemove,
  firstBadge,
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {images.map((image, index) => (
        <div
          key={`${image}_${index}`}
          className="relative overflow-hidden rounded-2xl bg-slate-100"
        >
          <img
            src={image}
            alt={`Preview ${index + 1}`}
            className="h-36 w-full object-cover"
          />

          <button
            type="button"
            onClick={() => onRemove(index)}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 font-black text-white shadow-lg"
          >
            ×
          </button>

          {index === 0 && (
            <span className="absolute bottom-2 left-2 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-black text-white">
              {firstBadge}
            </span>
          )}
        </div>
      ))}
    </div>
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

function getValidImages(fileList) {
  const selectedFiles = Array.from(fileList || []);
  const validFiles = selectedFiles.filter((file) =>
    file.type.startsWith("image/")
  );

  if (validFiles.length !== selectedFiles.length) {
    alert("Only image files are allowed");
  }

  return validFiles;
}

function revokePreview(image) {
  if (image?.startsWith("blob:")) {
    URL.revokeObjectURL(image);
  }
}

function capitalize(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}