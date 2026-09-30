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
import { SUBSCRIPTION_STATUS } from "../constants";

export async function createSubscription(data) {
  const payload = {
    vendorId: data.vendorId,
    vendorType: data.vendorType || "tiffin",
    userId: data.userId,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerAddress: data.customerAddress,
    planName: data.planName,
    mealType: data.mealType || "",
    mealPreference: data.mealPreference || "veg",
    price: Number(data.price || 0),
    startDate: data.startDate,
    endDate: data.endDate || null,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    notes: data.notes || "",
    lastDeliveredAt: data.lastDeliveredAt || null,
    deliveryStatus: data.deliveryStatus || "pending",
    removedAt: null,
    removedBy: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, COLLECTIONS.SUBSCRIPTIONS), payload);
  return ref.id;
}

export async function getSubscriptionsByVendor(vendorId) {
  const q = query(
    collection(db, COLLECTIONS.SUBSCRIPTIONS),
    where("vendorId", "==", vendorId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function getActiveSubscriptionsByVendor(vendorId) {
  const list = await getSubscriptionsByVendor(vendorId);

  return list.filter((item) => item.status !== "removed");
}

export async function getSubscriptionsByUser(userId) {
  const q = query(
    collection(db, COLLECTIONS.SUBSCRIPTIONS),
    where("userId", "==", userId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function updateSubscription(subscriptionId, data) {
  const ref = doc(db, COLLECTIONS.SUBSCRIPTIONS, subscriptionId);

  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function updateSubscriptionStatus(subscriptionId, status) {
  return updateSubscription(subscriptionId, { status });
}

export async function removeSubscription(subscriptionId, vendorId) {
  return updateSubscription(subscriptionId, {
    status: "removed",
    removedAt: serverTimestamp(),
    removedBy: vendorId || "",
  });
}

export async function restoreSubscription(subscriptionId) {
  return updateSubscription(subscriptionId, {
    status: SUBSCRIPTION_STATUS.ACTIVE,
    removedAt: null,
    removedBy: "",
  });
}