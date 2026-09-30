import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../../../firebase";
import { COLLECTIONS } from "../firestorePaths";
import { DELIVERY_STATUS } from "../constants";

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

// Create Delivery
export async function createDelivery(data) {
  const payload = {
    vendorId: data.vendorId,
    vendorType: data.vendorType || "tiffin",

    orderId: data.orderId || null,
    subscriptionId: data.subscriptionId || null,

    userId: data.userId,

    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerAddress: data.customerAddress,

    mealType: data.mealType || "",
    mealPreference: data.mealPreference || "",

    deliveryDate: data.deliveryDate || getTodayString(),
    deliverySlot: data.deliverySlot || "",

    status: data.status || DELIVERY_STATUS.SCHEDULED,

    deliveredAt: data.deliveredAt || null,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(
    collection(db, COLLECTIONS.DELIVERIES),
    payload
  );

  return ref.id;
}

// Vendor Deliveries
export async function getDeliveriesByVendor(vendorId) {
  const q = query(
    collection(db, COLLECTIONS.DELIVERIES),
    where("vendorId", "==", vendorId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// User Delivery History
export async function getDeliveriesByUser(userId) {
  const q = query(
    collection(db, COLLECTIONS.DELIVERIES),
    where("userId", "==", userId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// Today's Deliveries
export async function getTodayDeliveries(vendorId) {
  const q = query(
    collection(db, COLLECTIONS.DELIVERIES),
    where("vendorId", "==", vendorId),
    where("deliveryDate", "==", getTodayString())
  );

  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// Update Delivery
export async function updateDelivery(deliveryId, data) {
  const ref = doc(db, COLLECTIONS.DELIVERIES, deliveryId);

  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Update Status
export async function updateDeliveryStatus(deliveryId, status) {
  return updateDelivery(deliveryId, {
    status,
    deliveredAt:
      status === DELIVERY_STATUS.DELIVERED
        ? serverTimestamp()
        : null,
  });
}

// Helper
export { getTodayString };