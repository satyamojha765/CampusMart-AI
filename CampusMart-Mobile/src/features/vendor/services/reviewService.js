import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { db } from "../../../firebase";
import { COLLECTIONS } from "../firestorePaths";

export async function createReview(data) {
  const payload = {
    vendorId: data.vendorId,
    vendorType: data.vendorType || "tiffin",
    userId: data.userId,
    customerName: data.customerName,
    rating: Number(data.rating || 0),
    comment: data.comment || "",
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, COLLECTIONS.REVIEWS), payload);
  return ref.id;
}

export async function getReviewsByVendor(vendorId) {
  const q = query(
    collection(db, COLLECTIONS.REVIEWS),
    where("vendorId", "==", vendorId)
  );

  const snap = await getDocs(q);

  return snap.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}