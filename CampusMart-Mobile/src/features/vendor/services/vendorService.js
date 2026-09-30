import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../../../firebase";
import { COLLECTIONS } from "../firestorePaths";
import { VENDOR_STATUS } from "../constants";

export async function createVendor(vendorId, data) {
  if (!vendorId) {
    throw new Error("Vendor ID is required");
  }

  const ref = doc(db, COLLECTIONS.VENDORS, vendorId);

  const payload = {
    ownerId: data.ownerId,
    businessName: data.businessName,
    vendorType: data.vendorType,
    phone: data.phone || "",
    email: data.email || "",
    address: data.address || "",
    city: data.city || "",
    area: data.area || "",
    imageUrl: data.imageUrl || "",
    status: data.status || VENDOR_STATUS.ACTIVE,
    ratingAverage: data.ratingAverage || 0,
    ratingCount: data.ratingCount || 0,
    totalOrders: data.totalOrders || 0,
    totalSubscribers: data.totalSubscribers || 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, payload, { merge: true });

  return vendorId;
}

export async function upsertVendor(vendorId, data) {
  if (!vendorId) {
    throw new Error("Vendor ID is required");
  }

  const ref = doc(db, COLLECTIONS.VENDORS, vendorId);

  await setDoc(
    ref,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return vendorId;
}

export async function getVendorById(vendorId) {
  if (!vendorId) return null;

  const ref = doc(db, COLLECTIONS.VENDORS, vendorId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  };
}

export async function getVendorsByOwner(ownerId) {
  const q = query(
    collection(db, COLLECTIONS.VENDORS),
    where("ownerId", "==", ownerId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function getVendorsByType(vendorType) {
  const q = query(
    collection(db, COLLECTIONS.VENDORS),
    where("vendorType", "==", vendorType),
    where("status", "==", VENDOR_STATUS.ACTIVE)
  );

  const snap = await getDocs(q);

  return snap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function updateVendor(vendorId, data) {
  if (!vendorId) {
    throw new Error("Vendor ID is required");
  }

  const ref = doc(db, COLLECTIONS.VENDORS, vendorId);

  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}