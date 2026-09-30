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
import { PAYMENT_METHODS, PAYMENT_STATUS } from "../constants";

export async function createPayment(data) {
  const payload = {
    vendorId: data.vendorId,
    vendorType: data.vendorType || "tiffin",
    userId: data.userId,
    orderId: data.orderId || null,
    subscriptionId: data.subscriptionId || null,
    amount: Number(data.amount || 0),
    method: data.method || PAYMENT_METHODS.CASH,
    status: data.status || PAYMENT_STATUS.PENDING,
    transactionId: data.transactionId || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, COLLECTIONS.PAYMENTS), payload);
  return ref.id;
}

export async function getPaymentsByVendor(vendorId) {
  const q = query(
    collection(db, COLLECTIONS.PAYMENTS),
    where("vendorId", "==", vendorId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function getPaymentsByUser(userId) {
  const q = query(
    collection(db, COLLECTIONS.PAYMENTS),
    where("userId", "==", userId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function updatePayment(paymentId, data) {
  const ref = doc(db, COLLECTIONS.PAYMENTS, paymentId);

  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function updatePaymentStatus(paymentId, status) {
  return updatePayment(paymentId, { status });
}