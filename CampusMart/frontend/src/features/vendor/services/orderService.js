import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../../../firebase";
import { COLLECTIONS } from "../firestorePaths";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
} from "../constants";

/**
 * Customer ka naya order create karta hai.
 */
export async function createOrder(
  data = {}
) {
  validateCreateOrder(data);

  const payload = removeUndefined({
    vendorId: String(
      data.vendorId
    ).trim(),

    vendorName:
      String(
        data.vendorName || ""
      ).trim(),

    vendorType:
      data.vendorType ||
      "tiffin",

    userId: String(
      data.userId
    ).trim(),

    subscriptionId:
      data.subscriptionId || null,

    customerName:
      String(
        data.customerName ||
          "Customer"
      ).trim(),

    customerPhone:
      cleanPhoneNumber(
        data.customerPhone ||
          data.phone
      ),

    customerAddress:
      String(
        data.customerAddress ||
          data.address ||
          ""
      ).trim(),

    mealType:
      data.mealType ||
      data.items?.[0]?.mealType ||
      "",

    mealPreference:
      data.mealPreference ||
      data.items?.[0]
        ?.mealPreference ||
      "veg",

    planType:
      data.planType || "",

    planName:
      data.planName ||
      data.items?.[0]?.planName ||
      "",

    items: Array.isArray(
      data.items
    )
      ? data.items
      : [],

    quantity:
      getValidNumber(
        data.quantity,
        1
      ),

    price:
      getValidNumber(
        data.price,
        0
      ),

    totalAmount:
      getValidNumber(
        data.totalAmount ??
          data.price,
        0
      ),

    paymentMethod:
      data.paymentMethod ||
      data.paymentType ||
      "",

    paymentStatus:
      data.paymentStatus ||
      PAYMENT_STATUS.PENDING,

    orderStatus:
      data.orderStatus ||
      ORDER_STATUS.PENDING,

    deliveryStatus:
      data.deliveryStatus ||
      data.orderStatus ||
      ORDER_STATUS.PENDING,

    deliveryDate:
      data.deliveryDate || null,

    notes:
      String(
        data.notes || ""
      ).trim(),

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),
  });

  const documentReference =
    await addDoc(
      collection(
        db,
        COLLECTIONS.ORDERS
      ),
      payload
    );

  return documentReference.id;
}

/**
 * Selected vendor ke orders fetch karta hai.
 */
export async function getOrdersByVendor(
  vendorId
) {
  if (
    !vendorId ||
    !String(vendorId).trim()
  ) {
    return [];
  }

  const ordersQuery = query(
    collection(
      db,
      COLLECTIONS.ORDERS
    ),
    where(
      "vendorId",
      "==",
      String(vendorId).trim()
    )
  );

  const snapshot =
    await getDocs(ordersQuery);

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .sort(
      (
        firstOrder,
        secondOrder
      ) =>
        getTimeMs(
          secondOrder.createdAt
        ) -
        getTimeMs(
          firstOrder.createdAt
        )
    );
}

/**
 * Selected user ke saare orders fetch karta hai.
 */
export async function getOrdersByUser(
  userId
) {
  if (
    !userId ||
    !String(userId).trim()
  ) {
    return [];
  }

  const ordersQuery = query(
    collection(
      db,
      COLLECTIONS.ORDERS
    ),
    where(
      "userId",
      "==",
      String(userId).trim()
    )
  );

  const snapshot =
    await getDocs(ordersQuery);

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .sort(
      (
        firstOrder,
        secondOrder
      ) =>
        getTimeMs(
          secondOrder.createdAt
        ) -
        getTimeMs(
          firstOrder.createdAt
        )
    );
}

/**
 * Single order fetch karne ke liye.
 */
export async function getOrderById(
  orderId
) {
  validateOrderId(orderId);

  const reference = doc(
    db,
    COLLECTIONS.ORDERS,
    orderId
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
 * Existing order safely update karta hai.
 *
 * vendorId, userId, subscriptionId aur createdAt
 * is function se change nahi kiye ja sakte.
 */
export async function updateOrder(
  orderId,
  data = {}
) {
  validateOrderId(orderId);

  const safeUpdate =
    sanitizeOrderUpdate(data);

  if (
    Object.keys(safeUpdate)
      .length === 0
  ) {
    throw new Error(
      "No valid order fields provided"
    );
  }

  const reference = doc(
    db,
    COLLECTIONS.ORDERS,
    orderId
  );

  await updateDoc(reference, {
    ...safeUpdate,
    updatedAt:
      serverTimestamp(),
  });

  return orderId;
}

/**
 * Optional ownership check ke saath vendor order update.
 *
 * Future mein direct service calls ke liye useful hai.
 */
export async function updateVendorOrder(
  orderId,
  vendorId,
  data = {}
) {
  validateOrderId(orderId);

  if (!vendorId) {
    throw new Error(
      "Vendor ID is required"
    );
  }

  const reference = doc(
    db,
    COLLECTIONS.ORDERS,
    orderId
  );

  const snapshot =
    await getDoc(reference);

  if (!snapshot.exists()) {
    throw new Error(
      "Order not found"
    );
  }

  const orderData =
    snapshot.data();

  if (
    orderData.vendorId !==
    vendorId
  ) {
    throw new Error(
      "You cannot update another vendor's order"
    );
  }

  const safeUpdate =
    sanitizeOrderUpdate(data);

  if (
    Object.keys(safeUpdate)
      .length === 0
  ) {
    throw new Error(
      "No valid order fields provided"
    );
  }

  await updateDoc(reference, {
    ...safeUpdate,
    updatedAt:
      serverTimestamp(),
  });

  return orderId;
}

/**
 * Order status update shortcut.
 */
export async function updateOrderStatus(
  orderId,
  orderStatus
) {
  if (!orderStatus) {
    throw new Error(
      "Order status is required"
    );
  }

  return updateOrder(orderId, {
    orderStatus,

    deliveryStatus:
      orderStatus,
  });
}

/**
 * Payment status update shortcut.
 */
export async function updatePaymentStatus(
  orderId,
  paymentStatus
) {
  if (!paymentStatus) {
    throw new Error(
      "Payment status is required"
    );
  }

  return updateOrder(orderId, {
    paymentStatus,
  });
}

function sanitizeOrderUpdate(
  data = {}
) {
  const allowedFields = [
    "orderStatus",
    "deliveryStatus",
    "paymentStatus",
    "paymentMethod",
    "deliveryDate",
    "deliveredAt",
    "acceptedAt",
    "cancelledAt",
    "notes",
    "vendorNotes",
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

  return removeUndefined(
    cleanedData
  );
}

function validateCreateOrder(
  data
) {
  if (
    !data.vendorId ||
    !String(data.vendorId).trim()
  ) {
    throw new Error(
      "Vendor ID is required"
    );
  }

  if (
    !data.userId ||
    !String(data.userId).trim()
  ) {
    throw new Error(
      "User ID is required"
    );
  }

  const totalAmount =
    getValidNumber(
      data.totalAmount ??
        data.price,
      0
    );

  if (totalAmount < 0) {
    throw new Error(
      "Order amount cannot be negative"
    );
  }
}

function validateOrderId(
  orderId
) {
  if (
    !orderId ||
    !String(orderId).trim()
  ) {
    throw new Error(
      "Order ID is required"
    );
  }
}

function cleanPhoneNumber(
  value
) {
  return String(
    value || ""
  ).replace(/[^0-9]/g, "");
}

function getValidNumber(
  value,
  fallback = 0
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const parsedValue = Number(
    String(value)
      .replace(/₹/g, "")
      .replace(/,/g, "")
      .trim()
  );

  return Number.isNaN(
    parsedValue
  )
    ? fallback
    : parsedValue;
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