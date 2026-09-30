import {
  addDoc,
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
import { DELIVERY_STATUS } from "../constants";

/**
 * Nayi delivery create karta hai.
 *
 * Subscription delivery ke liye same vendor,
 * same subscription aur same date par duplicate
 * document create nahi hoga.
 */
export async function createDelivery(
  data = {}
) {
  validateCreateDelivery(data);

  const vendorId = String(
    data.vendorId
  ).trim();

  const subscriptionId =
    data.subscriptionId || null;

  const orderId =
    data.orderId || null;

  const deliveryDate =
    normalizeDeliveryDate(
      data.deliveryDate
    );

  const status =
    data.status ||
    DELIVERY_STATUS?.SCHEDULED ||
    "scheduled";

  const delivered =
    isDeliveredStatus(status);

  /*
   * Existing same-day delivery check.
   * Purane addDoc wale records ke saath bhi
   * duplicate create nahi hoga.
   */
  const existingDeliveries =
    await getDeliveriesByVendorAndDate(
      vendorId,
      deliveryDate
    );

  const existingDelivery =
    existingDeliveries.find(
      (delivery) => {
        if (
          subscriptionId &&
          delivery.subscriptionId ===
            subscriptionId
        ) {
          return true;
        }

        if (
          !subscriptionId &&
          orderId &&
          delivery.orderId === orderId
        ) {
          return true;
        }

        return false;
      }
    );

  if (existingDelivery) {
    const existingReference = doc(
      db,
      COLLECTIONS.DELIVERIES,
      existingDelivery.id
    );

    await updateDoc(
      existingReference,
      removeUndefined({
        status,

        deliveredAt: delivered
          ? data.deliveredAt ||
            serverTimestamp()
          : data.deliveredAt ?? null,

        deliverySlot:
          data.deliverySlot ||
          existingDelivery.deliverySlot ||
          "",

        customerName:
          data.customerName ||
          existingDelivery.customerName ||
          "Customer",

        customerPhone:
          cleanPhoneNumber(
            data.customerPhone ||
              existingDelivery.customerPhone
          ),

        customerAddress:
          String(
            data.customerAddress ||
              existingDelivery.customerAddress ||
              ""
          ).trim(),

        mealType:
          data.mealType ||
          existingDelivery.mealType ||
          "",

        mealPreference:
          data.mealPreference ||
          existingDelivery.mealPreference ||
          "veg",

        updatedAt:
          serverTimestamp(),
      })
    );

    return existingDelivery.id;
  }

  const payload = removeUndefined({
    vendorId,

    vendorName: String(
      data.vendorName || ""
    ).trim(),

    vendorType:
      data.vendorType || "tiffin",

    orderId,

    subscriptionId,

    userId:
      data.userId || "",

    customerName: String(
      data.customerName ||
        "Customer"
    ).trim(),

    customerPhone:
      cleanPhoneNumber(
        data.customerPhone ||
          data.phone
      ),

    customerAddress: String(
      data.customerAddress ||
        data.address ||
        ""
    ).trim(),

    mealType:
      data.mealType || "",

    mealPreference:
      data.mealPreference ||
      "veg",

    deliveryDate,

    deliverySlot:
      data.deliverySlot || "",

    status,

    deliveredAt: delivered
      ? data.deliveredAt ||
        serverTimestamp()
      : data.deliveredAt || null,

    notes: String(
      data.notes || ""
    ).trim(),

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),
  });

  /*
   * Subscription ya order available ho toh
   * deterministic document ID use hoga.
   * Simultaneous clicks mein bhi duplicate
   * document create nahi hoga.
   */
  const referenceId =
    subscriptionId || orderId;

  if (referenceId) {
    const deliveryId =
      createDeliveryDocumentId(
        vendorId,
        referenceId,
        deliveryDate
      );

    const deliveryReference = doc(
      db,
      COLLECTIONS.DELIVERIES,
      deliveryId
    );

    await setDoc(
      deliveryReference,
      payload,
      {
        merge: true,
      }
    );

    return deliveryId;
  }

  const documentReference =
    await addDoc(
      collection(
        db,
        COLLECTIONS.DELIVERIES
      ),
      payload
    );

  return documentReference.id;
}

/**
 * Single delivery fetch karta hai.
 */
export async function getDeliveryById(
  deliveryId
) {
  validateDeliveryId(deliveryId);

  const reference = doc(
    db,
    COLLECTIONS.DELIVERIES,
    deliveryId
  );

  const snapshot =
    await getDoc(reference);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

/**
 * Selected vendor ki complete delivery history.
 */
export async function getDeliveriesByVendor(
  vendorId
) {
  if (!isValidId(vendorId)) {
    return [];
  }

  const deliveryQuery = query(
    collection(
      db,
      COLLECTIONS.DELIVERIES
    ),
    where(
      "vendorId",
      "==",
      String(vendorId).trim()
    )
  );

  const snapshot =
    await getDocs(deliveryQuery);

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .sort(
      (
        firstDelivery,
        secondDelivery
      ) =>
        getDeliveryTime(
          secondDelivery
        ) -
        getDeliveryTime(
          firstDelivery
        )
    );
}

/**
 * Selected user ki delivery history.
 */
export async function getDeliveriesByUser(
  userId
) {
  if (!isValidId(userId)) {
    return [];
  }

  const deliveryQuery = query(
    collection(
      db,
      COLLECTIONS.DELIVERIES
    ),
    where(
      "userId",
      "==",
      String(userId).trim()
    )
  );

  const snapshot =
    await getDocs(deliveryQuery);

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .sort(
      (
        firstDelivery,
        secondDelivery
      ) =>
        getDeliveryTime(
          secondDelivery
        ) -
        getDeliveryTime(
          firstDelivery
        )
    );
}

/**
 * Selected vendor aur date ki deliveries.
 */
export async function getDeliveriesByVendorAndDate(
  vendorId,
  deliveryDate
) {
  if (!isValidId(vendorId)) {
    return [];
  }

  const normalizedDate =
    normalizeDeliveryDate(
      deliveryDate
    );

  const deliveryQuery = query(
    collection(
      db,
      COLLECTIONS.DELIVERIES
    ),
    where(
      "vendorId",
      "==",
      String(vendorId).trim()
    ),
    where(
      "deliveryDate",
      "==",
      normalizedDate
    )
  );

  const snapshot =
    await getDocs(deliveryQuery);

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .sort(
      (
        firstDelivery,
        secondDelivery
      ) =>
        getTimeMs(
          secondDelivery.deliveredAt ||
            secondDelivery.createdAt
        ) -
        getTimeMs(
          firstDelivery.deliveredAt ||
            firstDelivery.createdAt
        )
    );
}

/**
 * Aaj selected vendor ki deliveries.
 */
export async function getTodayDeliveries(
  vendorId
) {
  return getDeliveriesByVendorAndDate(
    vendorId,
    getTodayString()
  );
}

/**
 * Delivery safely update karta hai.
 *
 * vendorId, userId, orderId, subscriptionId aur
 * createdAt is function se change nahi honge.
 */
export async function updateDelivery(
  deliveryId,
  data = {}
) {
  validateDeliveryId(deliveryId);

  const safeUpdate =
    sanitizeDeliveryUpdate(data);

  if (
    Object.keys(safeUpdate)
      .length === 0
  ) {
    throw new Error(
      "No valid delivery fields provided"
    );
  }

  const reference = doc(
    db,
    COLLECTIONS.DELIVERIES,
    deliveryId
  );

  await updateDoc(reference, {
    ...safeUpdate,

    updatedAt:
      serverTimestamp(),
  });

  return deliveryId;
}

/**
 * Vendor ownership verify karke delivery update.
 */
export async function updateVendorDelivery(
  deliveryId,
  vendorId,
  data = {}
) {
  validateDeliveryId(deliveryId);

  if (!isValidId(vendorId)) {
    throw new Error(
      "Vendor ID is required"
    );
  }

  const reference = doc(
    db,
    COLLECTIONS.DELIVERIES,
    deliveryId
  );

  const snapshot =
    await getDoc(reference);

  if (!snapshot.exists()) {
    throw new Error(
      "Delivery not found"
    );
  }

  const delivery =
    snapshot.data();

  if (
    delivery.vendorId !==
    vendorId
  ) {
    throw new Error(
      "You cannot update another vendor's delivery"
    );
  }

  const safeUpdate =
    sanitizeDeliveryUpdate(data);

  if (
    Object.keys(safeUpdate)
      .length === 0
  ) {
    throw new Error(
      "No valid delivery fields provided"
    );
  }

  await updateDoc(reference, {
    ...safeUpdate,

    updatedAt:
      serverTimestamp(),
  });

  return deliveryId;
}

/**
 * Delivery status shortcut.
 */
export async function updateDeliveryStatus(
  deliveryId,
  status
) {
  if (!status) {
    throw new Error(
      "Delivery status is required"
    );
  }

  const delivered =
    isDeliveredStatus(status);

  return updateDelivery(
    deliveryId,
    {
      status,

      deliveredAt: delivered
        ? serverTimestamp()
        : null,
    }
  );
}

/**
 * Local timezone ke according YYYY-MM-DD date.
 *
 * toISOString UTC use nahi karta,
 * isliye India mein midnight date issue nahi hoga.
 */
export function getTodayString(
  dateValue = new Date()
) {
  const date =
    toValidDate(dateValue);

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function sanitizeDeliveryUpdate(
  data = {}
) {
  const allowedFields = [
    "status",
    "deliveryDate",
    "deliverySlot",
    "deliveredAt",
    "customerName",
    "customerPhone",
    "customerAddress",
    "mealType",
    "mealPreference",
    "notes",
  ];

  const cleanedData = {};

  allowedFields.forEach(
    (fieldName) => {
      if (
        data[fieldName] !==
        undefined
      ) {
        cleanedData[fieldName] =
          data[fieldName];
      }
    }
  );

  if (
    cleanedData.deliveryDate !==
    undefined
  ) {
    cleanedData.deliveryDate =
      normalizeDeliveryDate(
        cleanedData.deliveryDate
      );
  }

  if (
    cleanedData.customerPhone !==
    undefined
  ) {
    cleanedData.customerPhone =
      cleanPhoneNumber(
        cleanedData.customerPhone
      );
  }

  if (
    cleanedData.customerName !==
    undefined
  ) {
    cleanedData.customerName =
      String(
        cleanedData.customerName ||
          ""
      ).trim();
  }

  if (
    cleanedData.customerAddress !==
    undefined
  ) {
    cleanedData.customerAddress =
      String(
        cleanedData.customerAddress ||
          ""
      ).trim();
  }

  if (
    cleanedData.notes !== undefined
  ) {
    cleanedData.notes =
      String(
        cleanedData.notes || ""
      ).trim();
  }

  return removeUndefined(
    cleanedData
  );
}

function validateCreateDelivery(
  data
) {
  if (!isValidId(data.vendorId)) {
    throw new Error(
      "Vendor ID is required"
    );
  }

  if (
    !data.subscriptionId &&
    !data.orderId
  ) {
    throw new Error(
      "Subscription ID or Order ID is required"
    );
  }
}

function validateDeliveryId(
  deliveryId
) {
  if (!isValidId(deliveryId)) {
    throw new Error(
      "Delivery ID is required"
    );
  }
}

function isValidId(value) {
  return Boolean(
    value &&
      String(value).trim()
  );
}

function normalizeDeliveryDate(
  value
) {
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return value;
  }

  return getTodayString(
    value || new Date()
  );
}

function isDeliveredStatus(
  status
) {
  return (
    String(status || "")
      .trim()
      .toLowerCase() ===
    "delivered"
  );
}

function cleanPhoneNumber(
  value
) {
  return String(
    value || ""
  ).replace(/[^0-9]/g, "");
}

function createDeliveryDocumentId(
  vendorId,
  referenceId,
  deliveryDate
) {
  const safeVendorId =
    sanitizeDocumentSegment(
      vendorId
    );

  const safeReferenceId =
    sanitizeDocumentSegment(
      referenceId
    );

  const safeDate =
    sanitizeDocumentSegment(
      deliveryDate
    );

  return `${safeVendorId}_${safeReferenceId}_${safeDate}`;
}

function sanitizeDocumentSegment(
  value
) {
  return String(value || "")
    .trim()
    .replace(/\//g, "-")
    .replace(/\s+/g, "-");
}

function removeUndefined(
  object = {}
) {
  return Object.fromEntries(
    Object.entries(
      object
    ).filter(
      ([, value]) =>
        value !== undefined
    )
  );
}

function getDeliveryTime(
  delivery
) {
  return getTimeMs(
    delivery.deliveredAt ||
      delivery.createdAt
  );
}

function getTimeMs(value) {
  if (!value) {
    return 0;
  }

  if (
    typeof value?.toDate ===
    "function"
  ) {
    return value
      .toDate()
      .getTime();
  }

  if (value?.seconds) {
    return (
      value.seconds * 1000
    );
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? 0
    : date.getTime();
}

function toValidDate(value) {
  if (
    typeof value?.toDate ===
    "function"
  ) {
    return value.toDate();
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return new Date();
  }

  return date;
}