import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

const filters = [
  {
    id: "pending",
    label: "Pending",
    icon: "⏳",
  },
  {
    id: "approved",
    label: "Approved",
    icon: "✅",
  },
  {
    id: "rejected",
    label: "Rejected",
    icon: "⚠️",
  },
  {
    id: "all",
    label: "All",
    icon: "🏠",
  },
];


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

function getImageList(images, image, fallbackImages = []) {
  const list = Array.isArray(images)
    ? images.filter(Boolean)
    : [];

  if (list.length > 0) {
    return list;
  }

  if (image) {
    return [image];
  }

  return Array.isArray(fallbackImages)
    ? fallbackImages.filter(Boolean)
    : [];
}

function getListingRoomTypes(item) {
  if (!item) {
    return [];
  }

  const coverImages = getImageList(
    item.images,
    item.image
  );

  const source = Array.isArray(item.roomTypes)
    ? item.roomTypes
    : Array.isArray(item.rooms)
      ? item.rooms
      : [];

  const normalizedSource = source
    .map((room, index) => {
      const type = normalizeRoomType(
        room?.type ||
          room?.sharing ||
          room?.title
      );

      if (!type) {
        return null;
      }

      const option = roomTypeOptions.find(
        (entry) => entry.value === type
      );

      const images = getImageList(
        room?.images,
        room?.image,
        coverImages
      );

      return {
        ...room,
        id:
          room?.id ||
          `${type}-room-${index + 1}`,
        type,
        sharing: type,
        title:
          room?.title ||
          option?.label ||
          `${capitalize(type)} Room`,
        icon: option?.icon || "🛏️",
        rent: Number(
          room?.rent ??
            item[`${type}Rent`] ??
            item.rent ??
            0
        ),
        availableBeds: Number(
          room?.availableBeds ??
            item[
              `${type}AvailableBeds`
            ] ??
            item.availableBeds ??
            0
        ),
        image: images[0] || "",
        images,
        active: room?.active !== false,
      };
    })
    .filter(Boolean);

  if (normalizedSource.length > 0) {
    return normalizedSource;
  }

  const sharingList = Array.isArray(item.sharing)
    ? item.sharing
    : item.sharing
      ? [item.sharing]
      : [];

  const detectedTypes = roomTypeOptions
    .map((option) => option.value)
    .filter((type) => {
      const sharingIncludesType =
        sharingList
          .map(normalizeRoomType)
          .includes(type);

      const hasLegacyFields =
        item[`${type}Rent`] !== undefined ||
        item[
          `${type}AvailableBeds`
        ] !== undefined;

      return sharingIncludesType || hasLegacyFields;
    });

  const fallbackTypes =
    detectedTypes.length > 0
      ? detectedTypes
      : item.rent !== undefined ||
          item.availableBeds !== undefined
        ? ["single"]
        : [];

  return fallbackTypes.map((type) => {
    const option = roomTypeOptions.find(
      (entry) => entry.value === type
    );

    return {
      id: `${type}-room`,
      type,
      sharing: type,
      title:
        option?.label ||
        `${capitalize(type)} Room`,
      icon: option?.icon || "🛏️",
      rent: Number(
        item[`${type}Rent`] ??
          item.rent ??
          0
      ),
      availableBeds: Number(
        item[
          `${type}AvailableBeds`
        ] ??
          item.availableBeds ??
          0
      ),
      image: coverImages[0] || "",
      images: coverImages,
      active: true,
      legacy: true,
    };
  });
}

function getLowestRoomRent(roomTypes, fallbackRent) {
  const rents = roomTypes
    .map((room) => Number(room.rent))
    .filter((rent) => rent > 0);

  if (rents.length === 0) {
    return Number(fallbackRent) || 0;
  }

  return Math.min(...rents);
}

function getTotalRoomBeds(roomTypes, fallbackBeds) {
  if (roomTypes.length === 0) {
    return Number(fallbackBeds) || 0;
  }

  return roomTypes.reduce(
    (total, room) =>
      total +
      (Number(room.availableBeds) || 0),
    0
  );
}

export default function AdminPGApprovals() {
  const [listings, setListings] = useState([]);
  const [activeFilter, setActiveFilter] = useState("pending");
  const [selectedPG, setSelectedPG] = useState(null);
  const [rejectingPG, setRejectingPG] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "pgs"),
      (snapshot) => {
        const list = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data(),
          }))
          .sort((a, b) => {
            const timeA =
              a.createdAt?.seconds ||
              a.createdAt?.toMillis?.() ||
              0;

            const timeB =
              b.createdAt?.seconds ||
              b.createdAt?.toMillis?.() ||
              0;

            return timeB - timeA;
          });

        setListings(list);
        setLoading(false);
      },
      (error) => {
        console.error("Admin PG load error:", error);
        setListings([]);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const counts = useMemo(() => {
    return {
      all: listings.length,

      pending: listings.filter(
        (item) =>
          (item.approvalStatus || "pending") === "pending"
      ).length,

      approved: listings.filter(
        (item) => item.approvalStatus === "approved"
      ).length,

      rejected: listings.filter(
        (item) => item.approvalStatus === "rejected"
      ).length,
    };
  }, [listings]);

  const filteredListings = useMemo(() => {
    if (activeFilter === "all") {
      return listings;
    }

    return listings.filter(
      (item) =>
        (item.approvalStatus || "pending") === activeFilter
    );
  }, [listings, activeFilter]);

  async function approveListing(item) {
    if (updatingId) {
      return;
    }

    const confirmed = window.confirm(
      `Approve "${item.name || "this PG"}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingId(item.id);

      await updateDoc(doc(db, "pgs", item.id), {
        approvalStatus: "approved",
        verified: true,
        rejectionReason: "",
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSelectedPG(null);
    } catch (error) {
      console.error("PG approve error:", error);
      alert(error.message);
    } finally {
      setUpdatingId("");
    }
  }

  function openRejectModal(item) {
    setRejectingPG(item);
    setRejectionReason(
      item.rejectionReason || item.rejectReason || ""
    );
  }

  async function rejectListing() {
    if (!rejectingPG || updatingId) {
      return;
    }

    const cleanReason = rejectionReason.trim();

    if (!cleanReason) {
      alert("Rejection reason required");
      return;
    }

    try {
      setUpdatingId(rejectingPG.id);

      await updateDoc(doc(db, "pgs", rejectingPG.id), {
        approvalStatus: "rejected",
        verified: false,
        rejectionReason: cleanReason,
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setRejectingPG(null);
      setRejectionReason("");
      setSelectedPG(null);
    } catch (error) {
      console.error("PG reject error:", error);
      alert(error.message);
    } finally {
      setUpdatingId("");
    }
  }

  async function moveToPending(item) {
    if (updatingId) {
      return;
    }

    const confirmed = window.confirm(
      `Move "${item.name || "this PG"}" back to pending review?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingId(item.id);

      await updateDoc(doc(db, "pgs", item.id), {
        approvalStatus: "pending",
        verified: false,
        rejectionReason: "",
        updatedAt: serverTimestamp(),
      });

      setSelectedPG(null);
    } catch (error) {
      console.error("PG pending update error:", error);
      alert(error.message);
    } finally {
      setUpdatingId("");
    }
  }

  async function deleteListing(item) {
    if (deletingId) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete "${item.name || "this PG"}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(item.id);

      await deleteDoc(doc(db, "pgs", item.id));

      setSelectedPG(null);
    } catch (error) {
      console.error("Admin PG delete error:", error);
      alert(error.message);
    } finally {
      setDeletingId("");
    }
  }

  return (
    <section className="mt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-bold text-blue-600">
            Student Housing
          </p>

          <h2 className="text-3xl font-extrabold">
            PG Approval
          </h2>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            Owner listings review, approve aur reject karo.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-black uppercase text-amber-700">
            Pending review
          </p>

          <p className="mt-1 text-2xl font-black text-amber-900">
            {counts.pending}
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
        {filters.map((filter) => {
          const active = activeFilter === filter.id;

          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${
                active
                  ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              <span>{filter.icon}</span>
              <span>{filter.label}</span>

              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                }`}
              >
                {counts[filter.id]}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <ApprovalSkeleton />
      ) : filteredListings.length === 0 ? (
        <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="text-6xl">
            {activeFilter === "pending" ? "🎉" : "🏠"}
          </div>

          <h3 className="mt-5 text-2xl font-black">
            {activeFilter === "pending"
              ? "No pending PG approvals"
              : `No ${activeFilter} PG listings`}
          </h3>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            New PG submissions yahan automatically show hongi.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {filteredListings.map((item) => (
            <PGApprovalCard
              key={item.id}
              item={item}
              updating={updatingId === item.id}
              deleting={deletingId === item.id}
              onView={() => setSelectedPG(item)}
              onApprove={() => approveListing(item)}
              onReject={() => openRejectModal(item)}
              onPending={() => moveToPending(item)}
              onDelete={() => deleteListing(item)}
            />
          ))}
        </div>
      )}

      {selectedPG && (
        <PGPreviewModal
          item={selectedPG}
          updating={updatingId === selectedPG.id}
          deleting={deletingId === selectedPG.id}
          onClose={() => setSelectedPG(null)}
          onApprove={() => approveListing(selectedPG)}
          onReject={() => openRejectModal(selectedPG)}
          onPending={() => moveToPending(selectedPG)}
          onDelete={() => deleteListing(selectedPG)}
        />
      )}

      {rejectingPG && (
        <RejectModal
          item={rejectingPG}
          reason={rejectionReason}
          setReason={setRejectionReason}
          loading={updatingId === rejectingPG.id}
          onClose={() => {
            setRejectingPG(null);
            setRejectionReason("");
          }}
          onSubmit={rejectListing}
        />
      )}
    </section>
  );
}

function PGApprovalCard({
  item,
  updating,
  deleting,
  onView,
  onApprove,
  onReject,
  onPending,
  onDelete,
}) {
  const image =
    item.images?.[0] ||
    item.image ||
    "";

  const status = item.approvalStatus || "pending";

  const statusStyles = {
    pending:
      "border-amber-200 bg-amber-50 text-amber-700",
    approved:
      "border-green-200 bg-green-50 text-green-700",
    rejected:
      "border-red-200 bg-red-50 text-red-700",
  };

  const roomTypes = getListingRoomTypes(item);

  const sharing =
    roomTypes.length > 0
      ? roomTypes
          .map((room) => capitalize(room.type))
          .join(" / ")
      : Array.isArray(item.sharing)
        ? item.sharing
            .map(capitalize)
            .join(" / ")
        : capitalize(
            item.sharing || "Flexible"
          );

  const lowestRoomRent =
    getLowestRoomRent(
      roomTypes,
      item.rent
    );

  const totalRoomBeds =
    getTotalRoomBeds(
      roomTypes,
      item.availableBeds
    );

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-800">
        {image ? (
          <img
            src={image}
            alt={item.name || "PG"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-7xl">
            🏠
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
          <span
            className={`rounded-full border px-3 py-1.5 text-xs font-black capitalize shadow-sm ${
              statusStyles[status] || statusStyles.pending
            }`}
          >
            {status === "approved" && "✓ "}
            {status === "pending" && "⏳ "}
            {status === "rejected" && "⚠ "}
            {status}
          </span>

          <span
            className={`rounded-full px-3 py-1.5 text-xs font-black shadow-sm ${
              item.active === false
                ? "bg-slate-800 text-white"
                : "bg-green-600 text-white"
            }`}
          >
            {item.active === false ? "Inactive" : "Active"}
          </span>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="truncate text-xl font-black">
              {item.name || "Student PG"}
            </h3>

            <p className="mt-1 truncate text-sm font-semibold text-slate-500">
              📍 {item.location || item.city || "Asansol"}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-xl font-black text-blue-600">
              ₹{lowestRoomRent.toLocaleString("en-IN")}
            </p>

            <p className="text-[10px] font-bold text-slate-400">
              starting / month
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black capitalize text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            {item.gender || "Students"}
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {sharing}
          </span>

          <span className="rounded-full bg-purple-50 px-3 py-1.5 text-xs font-black text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
            🛏 {totalRoomBeds} beds
          </span>

          {item.foodIncluded && (
            <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
              🍛 Food
            </span>
          )}
        </div>

        {roomTypes.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {roomTypes.map((room) => (
              <div
                key={room.id}
                className="rounded-2xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30"
              >
                <p className="truncate text-xs font-black text-blue-700 dark:text-blue-300">
                  {room.icon}{" "}
                  {capitalize(room.type)}
                </p>

                <p className="mt-2 text-sm font-black text-slate-900 dark:text-white">
                  ₹{Number(
                    room.rent || 0
                  ).toLocaleString("en-IN")}
                </p>

                <p className="mt-1 text-[10px] font-bold text-slate-500">
                  {Number(
                    room.availableBeds
                  ) || 0}{" "}
                  beds •{" "}
                  {room.images.length} photos
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
          <p className="text-xs font-bold text-slate-400">
            Owner
          </p>

          <p className="mt-1 font-black">
            {item.ownerName ||
              item.owner?.name ||
              "PG Owner"}
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {item.ownerEmail || "Email unavailable"}
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            📞{" "}
            {item.phone ||
              item.ownerPhone ||
              item.owner?.phone ||
              "Phone unavailable"}
          </p>
        </div>

        {status === "rejected" && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-black text-red-900">
              Rejection reason
            </p>

            <p className="mt-1 text-sm font-semibold leading-6 text-red-700">
              {item.rejectionReason ||
                item.rejectReason ||
                "No reason added."}
            </p>
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onView}
            className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 transition active:scale-95 dark:bg-slate-800 dark:text-slate-200"
          >
            👁 Full Details
          </button>

          {status === "pending" && (
            <button
              type="button"
              onClick={onApprove}
              disabled={updating}
              className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-black text-white transition active:scale-95 disabled:opacity-60"
            >
              {updating ? "Updating..." : "✓ Approve"}
            </button>
          )}

          {status === "pending" && (
            <button
              type="button"
              onClick={onReject}
              disabled={updating}
              className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-600 transition active:scale-95 disabled:opacity-60"
            >
              ⚠ Reject
            </button>
          )}

          {status !== "pending" && (
            <button
              type="button"
              onClick={onPending}
              disabled={updating}
              className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 transition active:scale-95 disabled:opacity-60"
            >
              {updating ? "Updating..." : "⏳ Move to Pending"}
            </button>
          )}

          {status === "approved" && (
            <Link
              to={`/pg/${item.id}`}
              className="rounded-2xl bg-blue-600 px-4 py-3 text-center text-sm font-black text-white transition active:scale-95"
            >
              Open Public Page
            </Link>
          )}

          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white transition active:scale-95 disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "🗑 Delete"}
          </button>
        </div>
      </div>
    </article>
  );
}

function PGPreviewModal({
  item,
  updating,
  deleting,
  onClose,
  onApprove,
  onReject,
  onPending,
  onDelete,
}) {
  const images = Array.isArray(item.images)
    ? item.images
    : item.image
    ? [item.image]
    : [];

  const amenities = Array.isArray(item.amenities)
    ? item.amenities
    : [];

  const rules = Array.isArray(item.rules)
    ? item.rules
    : [];

  const status = item.approvalStatus || "pending";

  const roomTypes = getListingRoomTypes(item);

  const lowestRoomRent =
    getLowestRoomRent(
      roomTypes,
      item.rent
    );

  const totalRoomBeds =
    getTotalRoomBeds(
      roomTypes,
      item.availableBeds
    );

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-5"
      onClick={onClose}
    >
      <div
        className="max-h-[94vh] w-full overflow-y-auto rounded-t-[32px] bg-white shadow-2xl dark:bg-slate-950 sm:max-w-4xl sm:rounded-[32px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div>
            <p className="text-sm font-black text-blue-600">
              Admin review
            </p>

            <h2 className="text-xl font-black">
              {item.name || "Student PG"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-xl font-black dark:bg-slate-900"
          >
            ×
          </button>
        </div>

        <div className="p-5 sm:p-7">
          {images.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((image, index) => (
                <img
                  key={`${image}_${index}`}
                  src={image}
                  alt={`PG ${index + 1}`}
                  className={`w-full rounded-2xl object-cover ${
                    index === 0
                      ? "col-span-2 h-64 sm:col-span-2"
                      : "h-36"
                  }`}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-[26px] bg-slate-100 text-7xl dark:bg-slate-900">
              🏠
            </div>
          )}

          <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              <ReviewSection title="Property information">
                <InfoRow label="PG Name" value={item.name} />

                <InfoRow
                  label="Description"
                  value={item.description}
                />

                <InfoRow
                  label="Location"
                  value={item.location}
                />

                <InfoRow
                  label="City"
                  value={item.city}
                />

                <InfoRow
                  label="Full address"
                  value={item.address}
                />
              </ReviewSection>

              <ReviewSection title="Pricing summary">
                <InfoRow
                  label="Starting monthly rent"
                  value={`₹${lowestRoomRent.toLocaleString(
                    "en-IN"
                  )}`}
                />

                <InfoRow
                  label="Security deposit"
                  value={`₹${Number(
                    item.deposit || 0
                  ).toLocaleString("en-IN")}`}
                />

                <InfoRow
                  label="Total available beds"
                  value={String(totalRoomBeds)}
                />

                <InfoRow
                  label="Room types"
                  value={String(roomTypes.length)}
                />

                <InfoRow
                  label="Gender"
                  value={capitalize(
                    item.gender || "Students"
                  )}
                />
              </ReviewSection>

              <ReviewSection title="Room types, rent and photos">
                {roomTypes.length === 0 ? (
                  <p className="text-sm font-semibold text-slate-500">
                    Room details not provided.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {roomTypes.map((room) => (
                      <RoomReviewCard
                        key={room.id}
                        pgId={item.id}
                        room={room}
                        showPublicLink={
                          status === "approved"
                        }
                      />
                    ))}
                  </div>
                )}
              </ReviewSection>

              <ReviewSection title="Amenities">
                {amenities.length === 0 ? (
                  <p className="text-sm font-semibold text-slate-500">
                    No amenities added.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className="rounded-full bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                )}
              </ReviewSection>

              <ReviewSection title="Food details">
                <InfoRow
                  label="Food included"
                  value={item.foodIncluded ? "Yes" : "No"}
                />

                <InfoRow
                  label="Food type"
                  value={item.foodType || "Not provided"}
                />
              </ReviewSection>

              <ReviewSection title="PG rules">
                {rules.length === 0 ? (
                  <p className="text-sm font-semibold text-slate-500">
                    No rules added.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {rules.map((rule, index) => (
                      <div
                        key={`${rule}_${index}`}
                        className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">
                          {index + 1}
                        </span>

                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                          {rule}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ReviewSection>
            </div>

            <aside className="space-y-5">
              <ReviewSection title="Owner details">
                <InfoRow
                  label="Name"
                  value={
                    item.ownerName ||
                    item.owner?.name ||
                    "PG Owner"
                  }
                />

                <InfoRow
                  label="Email"
                  value={item.ownerEmail || "Not available"}
                />

                <InfoRow
                  label="Phone"
                  value={
                    item.phone ||
                    item.ownerPhone ||
                    item.owner?.phone ||
                    "Not available"
                  }
                />

                <InfoRow
                  label="Owner UID"
                  value={item.ownerId || "Not available"}
                />
              </ReviewSection>

              <ReviewSection title="Listing status">
                <InfoRow
                  label="Approval"
                  value={capitalize(status)}
                />

                <InfoRow
                  label="Verified"
                  value={item.verified ? "Yes" : "No"}
                />

                <InfoRow
                  label="Active"
                  value={item.active === false ? "No" : "Yes"}
                />

                {status === "rejected" && (
                  <InfoRow
                    label="Rejection reason"
                    value={
                      item.rejectionReason ||
                      item.rejectReason ||
                      "Not provided"
                    }
                  />
                )}
              </ReviewSection>
            </aside>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {status === "pending" && (
              <>
                <button
                  type="button"
                  onClick={onApprove}
                  disabled={updating}
                  className="rounded-2xl bg-green-600 px-4 py-4 font-black text-white disabled:opacity-60"
                >
                  {updating ? "Updating..." : "✓ Approve"}
                </button>

                <button
                  type="button"
                  onClick={onReject}
                  disabled={updating}
                  className="rounded-2xl bg-red-50 px-4 py-4 font-black text-red-600 disabled:opacity-60"
                >
                  ⚠ Reject
                </button>
              </>
            )}

            {status !== "pending" && (
              <button
                type="button"
                onClick={onPending}
                disabled={updating}
                className="rounded-2xl bg-amber-50 px-4 py-4 font-black text-amber-700 disabled:opacity-60"
              >
                ⏳ Pending
              </button>
            )}

            {status === "approved" && (
              <Link
                to={`/pg/${item.id}`}
                className="rounded-2xl bg-blue-600 px-4 py-4 text-center font-black text-white"
              >
                Public Page
              </Link>
            )}

            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="rounded-2xl bg-red-600 px-4 py-4 font-black text-white disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "🗑 Delete"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-slate-100 px-4 py-4 font-black text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function RoomReviewCard({
  pgId,
  room,
  showPublicLink,
}) {
  const roomImages = getImageList(
    room.images,
    room.image
  );

  const publicRoomUrl =
    `/pg/${encodeURIComponent(
      pgId || ""
    )}?sharing=${encodeURIComponent(
      room.type || ""
    )}&room=${encodeURIComponent(
      room.id || ""
    )}`;

  return (
    <article className="overflow-hidden rounded-[22px] border border-blue-100 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-black text-blue-700 dark:text-blue-300">
            {room.icon || "🛏️"}{" "}
            {room.title ||
              `${capitalize(
                room.type
              )} Room`}
          </p>

          <p className="mt-1 text-xs font-bold text-slate-500">
            {capitalize(room.type)} room
            {room.legacy
              ? " • Old listing format"
              : ""}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1.5 text-[10px] font-black ${
            room.active === false
              ? "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              : "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
          }`}
        >
          {room.active === false
            ? "Inactive"
            : "Active"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 px-4 pb-4">
        <RoomMetric
          label="Monthly rent"
          value={`₹${Number(
            room.rent || 0
          ).toLocaleString("en-IN")}`}
        />

        <RoomMetric
          label="Beds"
          value={String(
            Number(
              room.availableBeds
            ) || 0
          )}
        />

        <RoomMetric
          label="Photos"
          value={String(roomImages.length)}
        />
      </div>

      {roomImages.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 border-t border-blue-100 p-4 dark:border-blue-900">
          {roomImages
            .slice(0, 6)
            .map((image, index) => (
              <div
                key={`${room.id}_${image}_${index}`}
                className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800"
              >
                <img
                  src={image}
                  alt={`${room.title || room.type} ${
                    index + 1
                  }`}
                  className="aspect-square h-full w-full object-cover"
                />

                {index === 0 && (
                  <span className="absolute bottom-1 left-1 rounded-full bg-blue-600 px-2 py-1 text-[8px] font-black text-white">
                    Main
                  </span>
                )}

                {index === 5 &&
                  roomImages.length > 6 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-sm font-black text-white">
                      +{roomImages.length - 6}
                    </div>
                  )}
              </div>
            ))}
        </div>
      ) : (
        <div className="border-t border-blue-100 px-4 py-5 text-center text-sm font-bold text-slate-500 dark:border-blue-900">
          No separate room photos
        </div>
      )}

      {showPublicLink && (
        <div className="border-t border-blue-100 p-4 dark:border-blue-900">
          <Link
            to={publicRoomUrl}
            className="flex w-full items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white"
          >
            Open this room publicly
          </Link>
        </div>
      )}
    </article>
  );
}

function RoomMetric({ label, value }) {
  return (
    <div className="rounded-xl bg-white p-3 text-center shadow-sm dark:bg-slate-900">
      <p className="text-[9px] font-bold uppercase text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function RejectModal({
  item,
  reason,
  setReason,
  loading,
  onClose,
  onSubmit,
}) {
  return (
    <div
      className="fixed inset-0 z-[250] flex items-end justify-center bg-black/60 sm:items-center sm:p-5"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-[32px] bg-white p-5 shadow-2xl dark:bg-slate-950 sm:max-w-lg sm:rounded-[32px] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-red-600">
              Reject listing
            </p>

            <h2 className="mt-1 text-2xl font-black">
              {item.name || "Student PG"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-xl font-black dark:bg-slate-900"
          >
            ×
          </button>
        </div>

        <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
          Clear reason likho taaki owner details correct karke listing dobara
          submit kar sake.
        </p>

        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Example: Phone number invalid hai ya property images clear nahi hain..."
          rows={6}
          className="mt-5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-4 font-semibold outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:border-slate-800 dark:bg-slate-900"
        />

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-2xl bg-slate-100 py-4 font-black text-slate-700 disabled:opacity-60 dark:bg-slate-900 dark:text-slate-200"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="rounded-2xl bg-red-600 py-4 font-black text-white shadow-lg shadow-red-600/20 disabled:opacity-60"
          >
            {loading ? "Rejecting..." : "Reject PG"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewSection({ title, children }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-4 text-lg font-black">
        {title}
      </h3>

      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-400">
        {label}
      </p>

      <p className="mt-1 whitespace-pre-line break-words text-sm font-semibold text-slate-700 dark:text-slate-200">
        {value || "Not provided"}
      </p>
    </div>
  );
}

function ApprovalSkeleton() {
  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[28px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="aspect-[16/9] animate-pulse bg-slate-200 dark:bg-slate-800" />

          <div className="space-y-4 p-5">
            <div className="h-6 w-2/3 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />

            <div className="flex gap-2">
              <div className="h-8 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="h-8 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>

            <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />

            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((__, buttonIndex) => (
                <div
                  key={buttonIndex}
                  className="h-11 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
                />
              ))}
            </div>
          </div>
        </div>
      ))}
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