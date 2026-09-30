import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const previewPGs = [
  {
    id: "preview-pg-1",
    name: "Campus Nest Boys PG",
    location: "Burnpur, Asansol",
    address: "Near Burnpur Market, Burnpur, Asansol, West Bengal",
    rent: 4500,
    deposit: 3000,
    gender: "boys",
    sharing: ["double", "triple"],
    availableBeds: 3,
    foodIncluded: true,
    foodType: "Veg & Non-Veg",
    verified: true,
    rating: 4.8,
    description:
      "A clean and student-friendly boys PG with comfortable rooms, homemade food and essential facilities. Suitable for college students looking for an affordable stay in Asansol.",
    amenities: [
      "WiFi",
      "Food",
      "CCTV",
      "RO Water",
      "Study Table",
      "Cupboard",
      "Power Backup",
      "Housekeeping",
    ],
    rules: [
      "Valid student ID is required",
      "No smoking inside rooms",
      "Visitors are allowed only in common areas",
      "Maintain cleanliness and silence after 10 PM",
    ],
    images: [
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=85",
    ],
    owner: {
      name: "Rahul Sharma",
      phone: "9876543210",
      photo: "",
      verified: true,
    },
  },
  {
    id: "preview-pg-2",
    name: "Bluebell Girls Residency",
    location: "Court More, Asansol",
    address: "Court More, Asansol, West Bengal",
    rent: 5200,
    deposit: 4000,
    gender: "girls",
    sharing: ["single", "double"],
    availableBeds: 2,
    foodIncluded: true,
    foodType: "Vegetarian",
    verified: true,
    rating: 4.9,
    description:
      "A secure and comfortable girls residency with CCTV, food, geyser and spacious rooms. The property is located close to markets and public transport.",
    amenities: [
      "WiFi",
      "Food",
      "Geyser",
      "CCTV",
      "RO Water",
      "Attached Bathroom",
      "Housekeeping",
      "Power Backup",
    ],
    rules: [
      "Valid identity proof is required",
      "Entry timing must be followed",
      "Visitors require owner permission",
      "Keep common spaces clean",
    ],
    images: [
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1400&q=85",
    ],
    owner: {
      name: "Priya Singh",
      phone: "9876543210",
      photo: "",
      verified: true,
    },
  },
  {
    id: "preview-pg-3",
    name: "Student Stay Premium PG",
    location: "Chelidanga, Asansol",
    address: "Chelidanga Main Road, Asansol, West Bengal",
    rent: 3800,
    deposit: 2500,
    gender: "unisex",
    sharing: ["double", "triple"],
    availableBeds: 5,
    foodIncluded: false,
    foodType: "Not included",
    verified: false,
    rating: 4.5,
    description:
      "An affordable student PG with flexible sharing rooms, WiFi, parking and power backup. Food services are available nearby.",
    amenities: [
      "WiFi",
      "Parking",
      "Power Backup",
      "Study Table",
      "Cupboard",
      "RO Water",
    ],
    rules: [
      "Student verification is required",
      "No damage to property",
      "No loud music after 10 PM",
    ],
    images: [
      "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?auto=format&fit=crop&w=1400&q=85",
    ],
    owner: {
      name: "Amit Kumar",
      phone: "9876543210",
      photo: "",
      verified: false,
    },
  },
  {
    id: "preview-pg-4",
    name: "Scholars Home PG",
    location: "Ushagram, Asansol",
    address: "Ushagram, Asansol, West Bengal",
    rent: 6000,
    deposit: 5000,
    gender: "boys",
    sharing: ["single", "double"],
    availableBeds: 1,
    foodIncluded: true,
    foodType: "Veg & Non-Veg",
    verified: true,
    rating: 4.7,
    description:
      "A premium student PG offering AC rooms, attached bathrooms, food and WiFi. Best suited for students who want privacy and better facilities.",
    amenities: [
      "AC",
      "WiFi",
      "Food",
      "Attached Bathroom",
      "Geyser",
      "CCTV",
      "Power Backup",
      "Housekeeping",
    ],
    rules: [
      "One month security deposit required",
      "No smoking or alcohol",
      "Visitors require permission",
      "Electricity usage rules apply for AC rooms",
    ],
    images: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1400&q=85",
      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1400&q=85",
    ],
    owner: {
      name: "Sanjay Verma",
      phone: "9876543210",
      photo: "",
      verified: true,
    },
  },
];

const amenityIcons = {
  WiFi: "📶",
  Food: "🍛",
  AC: "❄️",
  CCTV: "📹",
  "RO Water": "💧",
  "Study Table": "📚",
  Cupboard: "🚪",
  "Power Backup": "🔋",
  Housekeeping: "🧹",
  Geyser: "🚿",
  "Attached Bathroom": "🚽",
  Parking: "🅿️",
  Laundry: "👕",
  Refrigerator: "🧊",
  Balcony: "🌤️",
};

export default function PGDetails({ onLogout }) {
  const { id } = useParams();
  const { currentUser } = useAuth();

  const [pg, setPG] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  const [saved, setSaved] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(true);
  const [savingWishlist, setSavingWishlist] = useState(false);

  const viewTrackedRef = useRef(false);

  const isPreviewPG = Boolean(id?.startsWith("preview-pg-"));

  useEffect(() => {
    viewTrackedRef.current = false;
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    if (isPreviewPG) {
      const previewPG = previewPGs.find((item) => item.id === id);

      setPG(previewPG || null);
      setSelectedImage(0);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "pgs", id),
      (snapshot) => {
        if (!snapshot.exists()) {
          setPG(null);
          setLoading(false);
          return;
        }

        const data = {
          id: snapshot.id,
          ...snapshot.data(),
        };

        const isApproved =
          data.approvalStatus === "approved" ||
          data.status === "approved" ||
          data.approved === true;

        const isActive = data.active !== false;

        setPG(isApproved && isActive ? data : null);
        setSelectedImage(0);
        setLoading(false);
      },
      (error) => {
        console.error("PG details error:", error);
        setPG(null);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [id, isPreviewPG]);

  useEffect(() => {
    if (!currentUser || !id) {
      setSaved(false);
      setWishlistLoading(false);
      return;
    }

    setWishlistLoading(true);

    const wishlistDocId = `${currentUser.uid}_${id}`;

    const unsubscribe = onSnapshot(
      doc(db, "pgWishlist", wishlistDocId),
      (snapshot) => {
        setSaved(snapshot.exists());
        setWishlistLoading(false);
      },
      (error) => {
        console.error("PG wishlist status error:", error);
        setSaved(false);
        setWishlistLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser, id]);

  useEffect(() => {
  async function trackUniqueView() {
    if (
      !pg ||
      !id ||
      !currentUser ||
      isPreviewPG ||
      viewTrackedRef.current ||
      currentUser.uid === pg.ownerId
    ) {
      return;
    }

    viewTrackedRef.current = true;

    const viewDocId = `${id}_${currentUser.uid}`;
    const viewRef = doc(db, "pgViews", viewDocId);

    try {
      await setDoc(viewRef, {
        pgId: id,
        userId: currentUser.uid,
        ownerId: pg.ownerId,
        createdAt: serverTimestamp(),
      });

      console.log("Unique PG view created:", viewDocId);
    }  catch (error) {
        if (error.code === "permission-denied") {
        console.log("PG view already recorded for this user.");
        return;
  }

  console.error("PG unique view tracking error:", error);
  viewTrackedRef.current = false;
    }
  }

  trackUniqueView();
}, [pg, id, currentUser, isPreviewPG]);

  const images = useMemo(() => {
    if (!pg) {
      return [];
    }

    if (Array.isArray(pg.images) && pg.images.length > 0) {
      return pg.images;
    }

    if (pg.image) {
      return [pg.image];
    }

    return [
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1400&q=85",
    ];
  }, [pg]);

  // Preload and decode every gallery image as soon as the PG data arrives.
  // This prevents the 4th, 5th, 6th and later images from waiting to download
  // only after the user presses the next button.
  useEffect(() => {
    if (images.length === 0) {
      return undefined;
    }

    const preloaders = images.map((imageUrl, index) => {
      const image = new Image();

      image.decoding = "async";
      image.fetchPriority = index === 0 ? "high" : "auto";
      image.src = imageUrl;

      if (typeof image.decode === "function") {
        image.decode().catch(() => {
          // Some browsers reject decode() even though the image still loads.
        });
      }

      return image;
    });

    return () => {
      preloaders.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [images]);

  async function toggleWishlist() {
  if (!currentUser || !pg || savingWishlist) {
    return;
  }

  if (isPreviewPG) {
    alert("Preview PG ko wishlist me save nahi kiya ja sakta.");
    return;
  }

  const wishlistDocId = `${currentUser.uid}_${pg.id}`;
  const wishlistRef = doc(db, "pgWishlist", wishlistDocId);

  try {
    setSavingWishlist(true);

    if (saved) {
      await deleteDoc(wishlistRef);
      return;
    }

    await setDoc(wishlistRef, {
      userId: currentUser.uid,
      pgId: pg.id,

      name: pg.name || "Student PG",

      location:
        pg.location ||
        pg.address ||
        pg.area ||
        pg.city ||
        "Asansol",

      rent: Number(pg.rent) || 0,
      deposit: Number(pg.deposit) || 0,

      gender: pg.gender || "students",

      sharing: Array.isArray(pg.sharing)
        ? pg.sharing
        : [pg.sharing || "flexible"],

      availableBeds: Number(pg.availableBeds) || 0,

      foodIncluded: pg.foodIncluded === true,
      foodType: pg.foodType || "",

      verified: pg.verified === true,
      rating: Number(pg.rating) || 0,

      image: pg.images?.[0] || pg.image || "",

      ownerId: pg.ownerId || "",
      savedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("PG wishlist update error:", error);
    alert(error.message);
  } finally {
    setSavingWishlist(false);
  }
}
  async function trackContactClick(type) {
  if (
    !currentUser ||
    !pg ||
    isPreviewPG ||
    currentUser.uid === pg.ownerId
  ) {
    return;
  }

  const contactDocId = `${pg.id}_${currentUser.uid}_${type}`;
  const contactRef = doc(db, "pgContacts", contactDocId);

  try {
    await setDoc(contactRef, {
      pgId: pg.id,
      userId: currentUser.uid,
      ownerId: pg.ownerId || "",
      type,
      createdAt: serverTimestamp(),
    });

    console.log(`PG ${type} contact recorded`);
  } catch (error) {
    if (error.code === "permission-denied") {
      console.log(`PG ${type} contact already recorded`);
      return;
    }

    console.error("PG contact tracking error:", error);
  }
}

  const amenities = Array.isArray(pg?.amenities) ? pg.amenities : [];
  const rules = Array.isArray(pg?.rules) ? pg.rules : [];

  const sharingText = Array.isArray(pg?.sharing)
    ? pg.sharing.map(capitalize).join(", ")
    : capitalize(pg?.sharing || "Flexible");

  const ownerName =
    pg?.owner?.name ||
    pg?.ownerName ||
    pg?.contactName ||
    "PG Owner";

  const ownerPhone =
    pg?.owner?.phone ||
    pg?.ownerPhone ||
    pg?.phone ||
    pg?.contactPhone ||
    "";

  const ownerPhoto =
    pg?.owner?.photo ||
    pg?.ownerPhoto ||
    pg?.ownerImage ||
    "";

  const cleanPhone = String(ownerPhone).replace(/\D/g, "");

  const whatsappPhone =
    cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const locationText =
    pg?.address ||
    pg?.location ||
    pg?.area ||
    pg?.city ||
    "Asansol";

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    locationText
  )}`;

  const whatsappMessage = encodeURIComponent(
    `Hello, I found your PG "${
      pg?.name || "PG"
    }" on CampusMart. I want to know more details.`
  );

  if (loading) {
    return <PGDetailsSkeleton onLogout={onLogout} />;
  }

  if (!pg) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950">
        <Navbar onLogout={onLogout} />

        <main className="mx-auto flex min-h-[75vh] max-w-3xl items-center justify-center px-4 py-10">
          <div className="w-full rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="text-7xl">🏚️</div>

            <h1 className="mt-5 text-2xl font-black text-slate-950 dark:text-white">
              PG not available
            </h1>

            <p className="mx-auto mt-2 max-w-md font-semibold text-slate-500">
              Ye PG remove, inactive ya admin approval ke liye pending ho sakta
              hai.
            </p>

            <Link
              to="/pg"
              className="mt-7 inline-flex rounded-2xl bg-blue-600 px-6 py-4 font-black text-white shadow-lg shadow-blue-600/25"
            >
              ← Explore other PGs
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-28 text-slate-950 dark:bg-slate-950 dark:text-white">
      <Navbar onLogout={onLogout} />

      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-5 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            to="/pg"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            ← Back to PGs
          </Link>

          <button
            type="button"
            onClick={toggleWishlist}
            disabled={wishlistLoading || savingWishlist}
            className={`flex h-12 w-12 items-center justify-center rounded-full border text-2xl font-black shadow-sm transition active:scale-90 disabled:opacity-60 ${
              saved
                ? "border-red-200 bg-red-50 text-red-500 dark:border-red-900 dark:bg-red-950/40"
                : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            }`}
            aria-label={
              saved ? "Remove PG from wishlist" : "Save PG to wishlist"
            }
          >
            {wishlistLoading || savingWishlist ? "…" : saved ? "♥" : "♡"}
          </button>
        </div>

        <section className="grid gap-4 lg:grid-cols-[1.45fr_0.55fr]">
          <div className="relative overflow-hidden rounded-[30px] bg-slate-200 shadow-xl dark:bg-slate-900">
            <div className="aspect-[4/3] sm:aspect-[16/9]">
              <img
                key={images[selectedImage]}
                src={images[selectedImage]}
                alt={`${pg.name || "PG"} ${selectedImage + 1}`}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="h-full w-full object-cover"
              />
            </div>

            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              {pg.verified && (
                <span className="rounded-full bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-lg">
                  ✓ Verified PG
                </span>
              )}

              {isPreviewPG && (
                <span className="rounded-full bg-yellow-400 px-4 py-2 text-xs font-black text-slate-950 shadow-lg">
                  Preview
                </span>
              )}
            </div>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedImage((current) =>
                      current === 0 ? images.length - 1 : current - 1
                    )
                  }
                  className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl font-black text-slate-950 shadow-lg backdrop-blur"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedImage((current) =>
                      current === images.length - 1 ? 0 : current + 1
                    )
                  }
                  className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl font-black text-slate-950 shadow-lg backdrop-blur"
                >
                  ›
                </button>
              </>
            )}

            <span className="absolute bottom-4 right-4 rounded-full bg-slate-950/75 px-4 py-2 text-xs font-black text-white backdrop-blur">
              {selectedImage + 1} / {images.length}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
            {images.slice(0, 3).map((image, index) => (
              <button
                key={`${image}_${index}`}
                type="button"
                onClick={() => setSelectedImage(index)}
                className={`relative overflow-hidden rounded-[22px] border-2 bg-slate-200 transition ${
                  selectedImage === index
                    ? "border-blue-600 shadow-lg shadow-blue-600/20"
                    : "border-transparent"
                }`}
              >
                <img
                  src={image}
                  alt={`${pg.name || "PG"} ${index + 1}`}
                  loading="eager"
                  decoding="async"
                  className="aspect-square h-full w-full object-cover lg:aspect-auto"
                />

                {index === 2 && images.length > 3 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-lg font-black text-white">
                    +{images.length - 3}
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-black uppercase tracking-wider text-blue-600">
                    Student PG
                  </p>

                  <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight sm:text-4xl">
                    {pg.name || "Student PG"}
                  </h1>

                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-start gap-2 font-semibold text-slate-500 hover:text-blue-600"
                  >
                    <span>📍</span>
                    <span>{locationText}</span>
                  </a>
                </div>

                {Number(pg.rating) > 0 && (
                  <div className="shrink-0 rounded-2xl bg-green-50 px-3 py-2 text-center dark:bg-green-950/40">
                    <p className="text-lg font-black text-green-700 dark:text-green-400">
                      ★ {Number(pg.rating).toFixed(1)}
                    </p>

                    <p className="text-[10px] font-black uppercase text-green-600">
                      Rating
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <InfoBox
                  icon="👥"
                  label="PG Type"
                  value={capitalize(pg.gender || "Students")}
                />

                <InfoBox icon="🛏️" label="Sharing" value={sharingText} />

                <InfoBox
                  icon="🚪"
                  label="Beds left"
                  value={
                    Number(pg.availableBeds) > 0
                      ? `${pg.availableBeds} available`
                      : "Ask owner"
                  }
                />

                <InfoBox
                  icon="🍛"
                  label="Food"
                  value={pg.foodIncluded ? "Included" : "Not included"}
                />
              </div>
            </section>

            <DetailsSection eyebrow="About property" title="PG description">
              <p className="whitespace-pre-line text-[15px] font-medium leading-7 text-slate-600 dark:text-slate-300">
                {pg.description ||
                  "A student-friendly PG with essential facilities and comfortable rooms. Contact the owner for more information."}
              </p>
            </DetailsSection>

            <DetailsSection eyebrow="Included facilities" title="Amenities">
              {amenities.length === 0 ? (
                <p className="font-semibold text-slate-500">
                  Amenities ki information owner se confirm karo.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {amenities.map((amenity) => (
                    <div
                      key={amenity}
                      className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm dark:bg-slate-900">
                        {amenityIcons[amenity] || "✓"}
                      </span>

                      <span className="text-sm font-black">{amenity}</span>
                    </div>
                  ))}
                </div>
              )}
            </DetailsSection>

            <DetailsSection eyebrow="Meal information" title="Food details">
              <div className="flex items-start gap-4 rounded-2xl bg-orange-50 p-4 dark:bg-orange-950/30">
                <span className="text-3xl">🍱</span>

                <div>
                  <p className="font-black">
                    {pg.foodIncluded
                      ? "Food included with monthly rent"
                      : "Food is not included"}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {pg.foodType ||
                      (pg.foodIncluded
                        ? "Contact owner for menu and meal timings."
                        : "Nearby food and tiffin options may be available.")}
                  </p>
                </div>
              </div>
            </DetailsSection>

            <DetailsSection eyebrow="Important" title="PG rules">
              {rules.length === 0 ? (
                <p className="font-semibold text-slate-500">
                  Rules aur entry timings owner se confirm karo.
                </p>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule, index) => (
                    <div
                      key={`${rule}_${index}`}
                      className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {index + 1}
                      </span>

                      <p className="pt-0.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {rule}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </DetailsSection>

            <section className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 dark:border-blue-900 dark:from-blue-950/40 dark:to-indigo-950/30 sm:p-7">
              <SectionHeading
                eyebrow="Property location"
                title="Get directions"
              />

              <p className="mt-3 font-semibold text-slate-600 dark:text-slate-300">
                {locationText}
              </p>

              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 font-black text-white shadow-lg shadow-blue-600/25"
              >
                📍 Open in Google Maps
              </a>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-5 lg:self-start">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
              <p className="text-sm font-bold text-slate-500">
                Monthly rent
              </p>

              <p className="mt-1 text-4xl font-black">
                ₹{Number(pg.rent || 0).toLocaleString("en-IN")}
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-400">
                per month
              </p>

              {Number(pg.deposit) > 0 && (
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                  <span className="text-sm font-bold text-slate-500">
                    Security deposit
                  </span>

                  <span className="font-black">
                    ₹{Number(pg.deposit).toLocaleString("en-IN")}
                  </span>
                </div>
              )}

              <p className="mt-4 text-xs font-semibold leading-5 text-slate-400">
                Rent, deposit, electricity aur additional charges owner se
                confirm karo.
              </p>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-black text-blue-600">
                Listed by
              </p>

              <div className="mt-4 flex items-center gap-3">
                {ownerPhoto ? (
                  <img
                    src={ownerPhoto}
                    alt={ownerName}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-black text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    {ownerName.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-black">{ownerName}</p>

                    {(pg.owner?.verified || pg.ownerVerified) && (
                      <span title="Verified owner">✅</span>
                    )}
                  </div>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    PG Owner
                  </p>
                </div>
              </div>

              {cleanPhone ? (
                <div className="mt-5 grid gap-3">
                  <a
                    href={`tel:${cleanPhone}`}
                    onClick={() => trackContactClick("call")}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-black text-white shadow-lg shadow-blue-600/25"
                  >
                    📞 Call Owner
                  </a>

                  <a
                    href={`https://wa.me/${whatsappPhone}?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => trackContactClick("whatsapp")}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-green-500 py-4 font-black text-white shadow-lg shadow-green-500/20"
                  >
                    💬 WhatsApp
                  </a>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-center dark:bg-amber-950/30">
                  <p className="text-sm font-black text-amber-700 dark:text-amber-300">
                    Contact number not available
                  </p>
                </div>
              )}

              <div className="mt-4 rounded-2xl bg-red-50 p-4 dark:bg-red-950/30">
                <p className="text-xs font-semibold leading-5 text-red-700 dark:text-red-300">
                  Advance payment karne se pehle PG visit karo, owner identity
                  verify karo aur room details confirm karo.
                </p>
              </div>
            </section>
          </aside>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 p-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-[1fr_1.4fr] gap-3">
          <button
            type="button"
            onClick={toggleWishlist}
            disabled={wishlistLoading || savingWishlist}
            className={`rounded-2xl border py-4 font-black disabled:opacity-60 ${
              saved
                ? "border-red-200 bg-red-50 text-red-500 dark:border-red-900 dark:bg-red-950/40"
                : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            }`}
          >
            {wishlistLoading || savingWishlist
              ? "Saving..."
              : saved
              ? "♥ Saved"
              : "♡ Wishlist"}
          </button>

          {cleanPhone ? (
            <a
              href={`tel:${cleanPhone}`}
              onClick={() => trackContactClick("call")}
              className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 font-black text-white shadow-lg shadow-blue-600/25"
            >
              📞 Contact Owner
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="rounded-2xl bg-slate-300 py-4 font-black text-slate-500 dark:bg-slate-800"
            >
              Contact unavailable
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailsSection({ eyebrow, title, children }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
      <SectionHeading eyebrow={eyebrow} title={title} />

      <div className="mt-5">{children}</div>
    </section>
  );
}

function InfoBox({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
      <span className="text-2xl">{icon}</span>

      <p className="mt-3 text-xs font-bold text-slate-400">
        {label}
      </p>

      <p className="mt-1 line-clamp-2 text-sm font-black">
        {value}
      </p>
    </div>
  );
}

function SectionHeading({ eyebrow, title }) {
  return (
    <div>
      <p className="text-sm font-black uppercase tracking-wider text-blue-600">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-2xl font-black tracking-tight">
        {title}
      </h2>
    </div>
  );
}

function PGDetailsSkeleton({ onLogout }) {
  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <Navbar onLogout={onLogout} />

      <main className="mx-auto max-w-7xl animate-pulse px-4 py-5 sm:px-5 lg:px-8">
        <div className="h-12 w-36 rounded-2xl bg-slate-200 dark:bg-slate-800" />

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.45fr_0.55fr]">
          <div className="aspect-[4/3] rounded-[30px] bg-slate-200 dark:bg-slate-800 sm:aspect-[16/9]" />

          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="aspect-square rounded-[22px] bg-slate-200 dark:bg-slate-800"
              />
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-52 rounded-[28px] bg-slate-200 dark:bg-slate-800"
              />
            ))}
          </div>

          <div className="space-y-5">
            <div className="h-52 rounded-[28px] bg-slate-200 dark:bg-slate-800" />
            <div className="h-80 rounded-[28px] bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </main>
    </div>
  );
}

function capitalize(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}