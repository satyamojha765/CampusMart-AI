import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  deleteField,
  doc,
  serverTimestamp,
  updateDoc,
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
    imageItems: [],
    originalData: null,
  };
}

function createInitialRoomTypeDetails() {
  return {
    single: createEmptyRoomDetails(),
    double: createEmptyRoomDetails(),
    triple: createEmptyRoomDetails(),
  };
}

export default function EditPG({
  listing,
  onSuccess,
  onCancel,
}) {
  const { currentUser } = useAuth();

  const [form, setForm] = useState(initialForm);

  const [
    selectedRoomTypes,
    setSelectedRoomTypes,
  ] = useState([]);

  const [
    roomTypeDetails,
    setRoomTypeDetails,
  ] = useState(createInitialRoomTypeDetails);

  const [amenities, setAmenities] = useState([]);
  const [rules, setRules] = useState([""]);

  const [
    coverImageItems,
    setCoverImageItems,
  ] = useState([]);

  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] =
    useState("");

  const coverItemsRef = useRef([]);
  const roomDetailsRef = useRef(
    createInitialRoomTypeDetails()
  );

  useEffect(() => {
    coverItemsRef.current = coverImageItems;
  }, [coverImageItems]);

  useEffect(() => {
    roomDetailsRef.current = roomTypeDetails;
  }, [roomTypeDetails]);

  useEffect(() => {
    if (!listing) {
      return;
    }

    revokeAllNewImageItems(coverItemsRef.current);

    Object.values(roomDetailsRef.current).forEach(
      (room) => {
        revokeAllNewImageItems(room.imageItems);
      }
    );

    const listingCoverImages =
      getImageURLs(listing.images, listing.image);

    const roomSource = Array.isArray(listing.roomTypes)
      ? listing.roomTypes
      : Array.isArray(listing.rooms)
        ? listing.rooms
        : [];

    const legacySharing = normalizeSharingList(
      listing.sharing
    );

    const detectedRoomTypes = roomTypeOptions
      .map((option) => option.value)
      .filter((roomType) => {
        const matchingRoom = roomSource.find(
          (room) =>
            normalizeRoomType(
              room?.type || room?.sharing
            ) === roomType
        );

        return Boolean(
          matchingRoom ||
            legacySharing.includes(roomType) ||
            listing[`${roomType}Rent`] !== undefined ||
            listing[
              `${roomType}AvailableBeds`
            ] !== undefined
        );
      });

    const fallbackRoomTypes =
      detectedRoomTypes.length > 0
        ? detectedRoomTypes
        : listing.rent !== undefined
          ? ["single"]
          : [];

    const nextRoomTypeDetails =
      createInitialRoomTypeDetails();

    fallbackRoomTypes.forEach((roomType) => {
      const matchingRoom = roomSource.find(
        (room) =>
          normalizeRoomType(
            room?.type || room?.sharing
          ) === roomType
      );

      const roomImages = getImageURLs(
        matchingRoom?.images,
        matchingRoom?.image
      );

      const fallbackImages =
        roomImages.length > 0
          ? roomImages
          : listingCoverImages;

      const rent =
        matchingRoom?.rent ??
        listing[`${roomType}Rent`] ??
        listing.rent ??
        "";

      const availableBeds =
        matchingRoom?.availableBeds ??
        listing[
          `${roomType}AvailableBeds`
        ] ??
        (fallbackRoomTypes.length === 1
          ? listing.availableBeds
          : "");

      nextRoomTypeDetails[roomType] = {
        rent:
          rent !== undefined && rent !== null
            ? String(rent)
            : "",
        availableBeds:
          availableBeds !== undefined &&
          availableBeds !== null
            ? String(availableBeds)
            : "",
        imageItems:
          createExistingImageItems(fallbackImages),
        originalData: matchingRoom || null,
      };
    });

    setForm({
      name: listing.name || "",
      description: listing.description || "",
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
      foodIncluded:
        listing.foodIncluded === true,
      foodType: listing.foodType || "",
    });

    setSelectedRoomTypes(fallbackRoomTypes);
    setRoomTypeDetails(nextRoomTypeDetails);

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

    setCoverImageItems(
      createExistingImageItems(listingCoverImages)
    );
  }, [listing]);

  useEffect(() => {
    return () => {
      revokeAllNewImageItems(
        coverItemsRef.current
      );

      Object.values(
        roomDetailsRef.current
      ).forEach((room) => {
        revokeAllNewImageItems(room.imageItems);
      });
    };
  }, []);

  function handleChange(event) {
    const { name, value, type, checked } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]:
        type === "checkbox" ? checked : value,
    }));
  }

  function toggleRoomType(roomType) {
    const isSelected =
      selectedRoomTypes.includes(roomType);

    if (isSelected) {
      revokeAllNewImageItems(
        roomTypeDetails[roomType].imageItems
      );

      setSelectedRoomTypes((current) =>
        current.filter((item) => item !== roomType)
      );

      setRoomTypeDetails((current) => ({
        ...current,
        [roomType]: createEmptyRoomDetails(),
      }));

      return;
    }

    setSelectedRoomTypes((current) =>
      roomTypeOptions
        .map((option) => option.value)
        .filter(
          (value) =>
            current.includes(value) ||
            value === roomType
        )
    );

    setRoomTypeDetails((current) => ({
      ...current,
      [roomType]: createEmptyRoomDetails(),
    }));
  }

  function updateRoomField(
    roomType,
    field,
    value
  ) {
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
      coverImageItems.length +
        selectedFiles.length >
      8
    ) {
      alert("Maximum 8 PG cover images allowed");
      event.target.value = "";
      return;
    }

    setCoverImageItems((current) => [
      ...current,
      ...createNewImageItems(selectedFiles),
    ]);

    event.target.value = "";
  }

  function removeCoverImage(index) {
    setCoverImageItems((current) => {
      const selectedItem = current[index];

      revokeImageItem(selectedItem);

      return current.filter(
        (_, itemIndex) => itemIndex !== index
      );
    });
  }

  function makeCoverImageMain(index) {
    setCoverImageItems((current) =>
      moveItemToStart(current, index)
    );
  }

  function handleRoomImages(
    roomType,
    event
  ) {
    const selectedFiles = getValidImages(
      event.target.files
    );

    const currentRoom =
      roomTypeDetails[roomType];

    if (
      currentRoom.imageItems.length +
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

    setRoomTypeDetails((current) => ({
      ...current,
      [roomType]: {
        ...current[roomType],
        imageItems: [
          ...current[roomType].imageItems,
          ...createNewImageItems(
            selectedFiles
          ),
        ],
      },
    }));

    event.target.value = "";
  }

  function removeRoomImage(
    roomType,
    index
  ) {
    setRoomTypeDetails((current) => {
      const selectedItem =
        current[roomType].imageItems[index];

      revokeImageItem(selectedItem);

      return {
        ...current,
        [roomType]: {
          ...current[roomType],
          imageItems: current[
            roomType
          ].imageItems.filter(
            (_, itemIndex) =>
              itemIndex !== index
          ),
        },
      };
    });
  }

  function makeRoomImageMain(
    roomType,
    index
  ) {
    setRoomTypeDetails((current) => ({
      ...current,
      [roomType]: {
        ...current[roomType],
        imageItems: moveItemToStart(
          current[roomType].imageItems,
          index
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

  async function resolveImageItems(
    imageItems,
    progressLabel
  ) {
    const resolvedURLs = [];

    for (
      let index = 0;
      index < imageItems.length;
      index += 1
    ) {
      const imageItem = imageItems[index];

      if (imageItem.kind === "existing") {
        resolvedURLs.push(imageItem.url);
        continue;
      }

      setProgressText(
        `Uploading ${progressLabel} ${index + 1} of ${
          imageItems.length
        }`
      );

      const uploadedURL =
        await uploadSingleImage(imageItem.file);

      resolvedURLs.push(uploadedURL);
    }

    return resolvedURLs;
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
      return "Phone number required";
    }

    const cleanPhone =
      form.phone.replace(/\D/g, "");

    if (cleanPhone.length < 10) {
      return "Enter a valid phone number";
    }

    if (selectedRoomTypes.length === 0) {
      return "Select at least one room type";
    }

    for (const roomType of selectedRoomTypes) {
      const room =
        roomTypeDetails[roomType];

      const roomLabel =
        roomTypeOptions.find(
          (option) =>
            option.value === roomType
        )?.label || capitalize(roomType);

      if (
        room.rent === "" ||
        Number(room.rent) <= 0
      ) {
        return `Valid rent required for ${roomLabel}`;
      }

      if (
        room.availableBeds === "" ||
        Number(room.availableBeds) < 0
      ) {
        return `Valid available beds required for ${roomLabel}`;
      }

      if (room.imageItems.length === 0) {
        return `At least one image required for ${roomLabel}`;
      }
    }

    if (coverImageItems.length === 0) {
      return "At least one PG cover image required";
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
      alert("You cannot edit this listing");
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
        "Preparing PG cover images..."
      );

      const finalCoverImages =
        await resolveImageItems(
          coverImageItems,
          "PG cover image"
        );

      const updatedRoomTypes = [];

      for (const roomType of selectedRoomTypes) {
        const room =
          roomTypeDetails[roomType];

        const option =
          roomTypeOptions.find(
            (item) =>
              item.value === roomType
          );

        const finalRoomImages =
          await resolveImageItems(
            room.imageItems,
            `${option?.shortLabel || capitalize(
              roomType
            )} room image`
          );

        updatedRoomTypes.push({
          ...(room.originalData || {}),
          id:
            room.originalData?.id ||
            `${roomType}-room`,
          type: roomType,
          sharing: roomType,
          title:
            room.originalData?.title ||
            option?.label ||
            `${capitalize(roomType)} Room`,
          rent: Number(room.rent),
          availableBeds:
            Number(room.availableBeds) || 0,
          image:
            finalRoomImages[0] ||
            finalCoverImages[0] ||
            "",
          images:
            finalRoomImages.length > 0
              ? finalRoomImages
              : finalCoverImages,
          active:
            room.originalData?.active !== false,
        });
      }

      const lowestRent = Math.min(
        ...updatedRoomTypes.map(
          (room) => room.rent
        )
      );

      const totalAvailableBeds =
        updatedRoomTypes.reduce(
          (total, room) =>
            total + room.availableBeds,
          0
        );

      const legacyRoomFieldUpdates = {};

      roomTypeOptions.forEach((option) => {
        const matchingRoom =
          updatedRoomTypes.find(
            (room) =>
              room.type === option.value
          );

        legacyRoomFieldUpdates[
          `${option.value}Rent`
        ] = matchingRoom
          ? matchingRoom.rent
          : deleteField();

        legacyRoomFieldUpdates[
          `${option.value}AvailableBeds`
        ] = matchingRoom
          ? matchingRoom.availableBeds
          : deleteField();
      });

      const filteredRules = rules
        .map((rule) => rule.trim())
        .filter(Boolean);

      setProgressText("Saving changes...");

      await updateDoc(
        doc(db, "pgs", listing.id),
        {
          name: form.name.trim(),
          description:
            form.description.trim(),

          rent: lowestRent,
          deposit:
            Number(form.deposit) || 0,

          city:
            form.city.trim() || "Asansol",
          location: form.location.trim(),
          address: form.address.trim(),

          phone: form.phone.trim(),
          ownerPhone: form.phone.trim(),

          owner: {
            name:
              listing.owner?.name ||
              listing.ownerName ||
              currentUser.displayName ||
              "PG Owner",

            phone: form.phone.trim(),

            photo:
              listing.owner?.photo ||
              currentUser.photoURL ||
              "",

            verified: false,
          },

          gender: form.gender,

          sharing: selectedRoomTypes,
          roomTypes: updatedRoomTypes,
          roomTypeCount:
            updatedRoomTypes.length,

          ...legacyRoomFieldUpdates,

          amenities,

          availableBeds:
            totalAvailableBeds,

          foodIncluded:
            form.foodIncluded === true,

          foodType: form.foodIncluded
            ? form.foodType.trim()
            : "",

          rules: filteredRules,

          image:
            finalCoverImages[0] || "",
          images: finalCoverImages,

          approvalStatus: "pending",
          verified: false,
          rejectionReason: "",

          updatedAt: serverTimestamp(),
        }
      );

      alert(
        "PG updated successfully. Admin approval ke baad listing dobara public hogi."
      );

      revokeAllNewImageItems(
        coverImageItems
      );

      Object.values(roomTypeDetails).forEach(
        (room) => {
          revokeAllNewImageItems(
            room.imageItems
          );
        }
      );

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
            PG aur har room type ki details update
            karo. Save hone ke baad listing dobara
            admin approval me jayegi.
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
          description="PG ka naam, description aur security deposit update karo."
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

            <FormInput
              label="Security Deposit"
              name="deposit"
              type="number"
              min="0"
              value={form.deposit}
              onChange={handleChange}
              placeholder="3000"
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
          title="Room Types"
          description="Single, Double aur Triple select karo. Har selected type ka alag rent, beds aur photos edit honge."
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
                Kam se kam ek room type select karo
              </p>
            </div>
          )}

          <div className="mt-4 space-y-4">
            {selectedRoomTypes.map(
              (roomType) => {
                const option =
                  roomTypeOptions.find(
                    (item) =>
                      item.value === roomType
                  );

                return (
                  <RoomTypeEditor
                    key={roomType}
                    roomType={roomType}
                    option={option}
                    room={
                      roomTypeDetails[roomType]
                    }
                    onFieldChange={
                      updateRoomField
                    }
                    onImagesChange={
                      handleRoomImages
                    }
                    onRemoveImage={
                      removeRoomImage
                    }
                    onMakeMain={
                      makeRoomImageMain
                    }
                  />
                );
              }
            )}
          </div>
        </FormSection>

        <FormSection
          title="PG Cover Images"
          description="Ye images Find PG ki first screen par dikhti hain. Maximum 8 images."
        >
          <ImagePicker
            title="Add more PG cover photos"
            countText={`${coverImageItems.length}/8 images`}
            multiple
            onChange={handleCoverImages}
          />

          {coverImageItems.length > 0 && (
            <ImageItemsGrid
              items={coverImageItems}
              onRemove={removeCoverImage}
              onMakeMain={makeCoverImageMain}
              firstBadge="Main PG Image"
            />
          )}
        </FormSection>

        <FormSection
          title="Amenities"
          description="Available common facilities select karo."
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
              ? progressText || "Saving..."
              : "Save & Submit Again"}
          </button>
        </div>
      </form>
    </section>
  );
}

function RoomTypeEditor({
  roomType,
  option,
  room,
  onFieldChange,
  onImagesChange,
  onRemoveImage,
  onMakeMain,
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
            min="0"
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
          title={`Add ${
            option?.shortLabel ||
            capitalize(roomType)
          } room photos`}
          countText={`${room.imageItems.length}/6 images`}
          multiple
          onChange={(event) =>
            onImagesChange(roomType, event)
          }
          compact
        />

        {room.imageItems.length > 0 && (
          <ImageItemsGrid
            items={room.imageItems}
            onRemove={(index) =>
              onRemoveImage(roomType, index)
            }
            onMakeMain={(index) =>
              onMakeMain(roomType, index)
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
        compact
          ? "min-h-[130px] py-5"
          : "min-h-[170px] py-7"
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

      <p className="mt-3 font-black">
        {title}
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-500">
        {countText}
      </p>
    </label>
  );
}

function ImageItemsGrid({
  items,
  onRemove,
  onMakeMain,
  firstBadge,
}) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {items.map((item, index) => (
        <div
          key={`${item.kind}_${item.url}_${index}`}
          className="relative overflow-hidden rounded-2xl bg-slate-100"
        >
          <img
            src={item.url}
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

          {index === 0 ? (
            <span className="absolute bottom-2 left-2 rounded-full bg-blue-600 px-3 py-1 text-[10px] font-black text-white">
              {firstBadge}
            </span>
          ) : (
            <button
              type="button"
              onClick={() =>
                onMakeMain(index)
              }
              className="absolute bottom-2 left-2 rounded-full bg-white/95 px-3 py-1 text-[10px] font-black text-blue-700 shadow"
            >
              Make Main
            </button>
          )}

          <span className="absolute bottom-2 right-2 rounded-full bg-slate-950/70 px-2 py-1 text-[9px] font-black text-white">
            {item.kind === "existing"
              ? "Saved"
              : "New"}
          </span>
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

function normalizeSharingList(value) {
  const source = Array.isArray(value)
    ? value
    : value
      ? [value]
      : [];

  return source
    .map(normalizeRoomType)
    .filter(Boolean);
}

function normalizeRoomType(value) {
  const text = String(value || "")
    .trim()
    .toLowerCase();

  if (text.includes("single")) {
    return "single";
  }

  if (text.includes("double")) {
    return "double";
  }

  if (text.includes("triple")) {
    return "triple";
  }

  return "";
}

function getImageURLs(images, image) {
  if (Array.isArray(images)) {
    const validImages = images.filter(
      (item) =>
        typeof item === "string" &&
        item.trim()
    );

    if (validImages.length > 0) {
      return validImages;
    }
  }

  if (
    typeof image === "string" &&
    image.trim()
  ) {
    return [image];
  }

  return [];
}

function createExistingImageItems(urls) {
  return urls.map((url) => ({
    kind: "existing",
    url,
    file: null,
  }));
}

function createNewImageItems(files) {
  return files.map((file) => ({
    kind: "new",
    file,
    url: URL.createObjectURL(file),
  }));
}

function getValidImages(fileList) {
  const selectedFiles = Array.from(
    fileList || []
  );

  const validFiles = selectedFiles.filter(
    (file) =>
      file.type.startsWith("image/")
  );

  if (
    validFiles.length !== selectedFiles.length
  ) {
    alert("Only image files are allowed");
  }

  return validFiles;
}

function moveItemToStart(items, index) {
  const selectedItem = items[index];

  if (!selectedItem) {
    return items;
  }

  return [
    selectedItem,
    ...items.filter(
      (_, itemIndex) => itemIndex !== index
    ),
  ];
}

function revokeImageItem(item) {
  if (
    item?.kind === "new" &&
    item.url?.startsWith("blob:")
  ) {
    URL.revokeObjectURL(item.url);
  }
}

function revokeAllNewImageItems(items) {
  items.forEach(revokeImageItem);
}

function capitalize(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
}