import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { db } from "../../../firebase";
import { COLLECTIONS } from "../firestorePaths";

export async function getVendorById(vendorId) {
  const cleanVendorId = normalizeVendorId(vendorId);

  if (!cleanVendorId) {
    throw new Error("Vendor ID is required");
  }

  const vendorRef = doc(
    db,
    COLLECTIONS.VENDORS,
    cleanVendorId
  );

  const vendorSnapshot = await getDoc(vendorRef);

  if (!vendorSnapshot.exists()) {
    return null;
  }

  return {
    id: vendorSnapshot.id,
    ...vendorSnapshot.data(),
  };
}

export async function getAllVendors() {
  const vendorSnapshot = await getDocs(
    collection(db, COLLECTIONS.VENDORS)
  );

  return vendorSnapshot.docs
    .map((vendorDocument) => ({
      id: vendorDocument.id,
      ...vendorDocument.data(),
    }))
    .sort((firstVendor, secondVendor) =>
      getVendorName(firstVendor).localeCompare(
        getVendorName(secondVendor)
      )
    );
}

export async function upsertVendor(vendorId, vendorData = {}) {
  const cleanVendorId = normalizeVendorId(vendorId);

  if (!cleanVendorId) {
    throw new Error("Vendor ID is required");
  }

  const vendorRef = doc(
    db,
    COLLECTIONS.VENDORS,
    cleanVendorId
  );

  const cleanData = removeUndefinedValues(vendorData);

  await setDoc(
    vendorRef,
    {
      ...cleanData,
      updatedAt: serverTimestamp(),
    },
    {
      merge: true,
    }
  );

  return getVendorById(cleanVendorId);
}

function removeUndefinedValues(data) {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => value !== undefined
    )
  );
}

function normalizeVendorId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getVendorName(vendor = {}) {
  return (
    vendor.businessName ||
    vendor.name ||
    vendor.vendorName ||
    "Tiffin Vendor"
  );
}
