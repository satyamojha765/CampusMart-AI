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
import { ORDER_STATUS, PAYMENT_STATUS } from "../constants";

export async function createOrder(data) {
  const payload = {
    vendorId: data.vendorId,
    vendorType: data.vendorType || "tiffin",
    userId: data.userId,
    subscriptionId: data.subscriptionId || null,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    customerAddress: data.customerAddress,
    items: data.items || [],
    totalAmount: Number(data.totalAmount || 0),
    paymentStatus: data.paymentStatus || PAYMENT_STATUS.PENDING,
    orderStatus: data.orderStatus || ORDER_STATUS.PENDING,
    deliveryDate: data.deliveryDate || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, COLLECTIONS.ORDERS), payload);
  return ref.id;
}

export async function getOrdersByVendor(vendorId) {
  const q = query(
    collection(db, COLLECTIONS.ORDERS),
    where("vendorId", "==", vendorId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function getOrdersByUser(userId) {
  const q = query(
    collection(db, COLLECTIONS.ORDERS),
    where("userId", "==", userId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

export async function updateOrder(orderId, data) {
  const ref = doc(db, COLLECTIONS.ORDERS, orderId);

  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function updateOrderStatus(orderId, orderStatus) {
  return updateOrder(orderId, { orderStatus });
}