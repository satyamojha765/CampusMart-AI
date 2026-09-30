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
import { SUBSCRIPTION_STATUS } from "../constants";

const ACTIVE_STATUS =
  SUBSCRIPTION_STATUS.ACTIVE || "active";

/**
 * User ke liye nayi vendor subscription create karta hai.
 */
export async function createSubscription(
  data = {}
) {
  validateCreateSubscription(data);

  const vendorId = String(
    data.vendorId
  ).trim();

  const userId = String(
    data.userId
  ).trim();

  /*
   * Same vendor ke liye duplicate active
   * subscription create hone se rokta hai.
   */
  const userSubscriptions =
    await getSubscriptionsByUser(userId);

  const existingActiveSubscription =
    userSubscriptions.find(
      (subscription) =>
        subscription.vendorId ===
          vendorId &&
        isSubscriptionActive(
          subscription
        )
    );

  if (existingActiveSubscription) {
    throw new Error(
      "You already have an active subscription for this vendor."
    );
  }

  const durationDays =
    getDurationDays(
      data.startDate,
      data.endDate,
      data.durationDays ??
        data.daysCount ??
        data.totalDays ??
        30
    );

  const payload = removeUndefined({
    vendorId,

    vendorName: String(
      data.vendorName || ""
    ).trim(),

    vendorType:
      data.vendorType || "tiffin",

    userId,

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

    planName:
      data.planName ||
      "Monthly Plan",

    planType:
      data.planType || "monthly",

    mealType:
      data.mealType || "",

    mealPreference:
      data.mealPreference || "veg",

    price: getValidNumber(
      data.price,
      0
    ),

    durationDays,

    totalDays: durationDays,

    startDate:
      data.startDate ||
      serverTimestamp(),

    endDate:
      data.endDate || null,

    status: ACTIVE_STATUS,

    paymentMethod:
      data.paymentMethod ||
      data.paymentType ||
      "",

    paymentStatus:
      data.paymentStatus ||
      "pending",

    notes: String(
      data.notes || ""
    ).trim(),

    lastDeliveredAt:
      data.lastDeliveredAt ||
      null,

    deliveryStatus:
      data.deliveryStatus ||
      "pending",

    removedAt: null,

    removedBy: "",

    createdAt:
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),
  });

  const documentReference =
    await addDoc(
      collection(
        db,
        COLLECTIONS.SUBSCRIPTIONS
      ),
      payload
    );

  return documentReference.id;
}

/**
 * Selected vendor ke saare subscriptions.
 */
export async function getSubscriptionsByVendor(
  vendorId
) {
  if (
    !vendorId ||
    !String(vendorId).trim()
  ) {
    return [];
  }

  const subscriptionQuery = query(
    collection(
      db,
      COLLECTIONS.SUBSCRIPTIONS
    ),
    where(
      "vendorId",
      "==",
      String(vendorId).trim()
    )
  );

  const snapshot =
    await getDocs(subscriptionQuery);

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .sort(
      (
        firstSubscription,
        secondSubscription
      ) =>
        getTimeMs(
          secondSubscription.createdAt
        ) -
        getTimeMs(
          firstSubscription.createdAt
        )
    );
}

/**
 * Selected vendor ke sirf active subscribers.
 */
export async function getActiveSubscriptionsByVendor(
  vendorId
) {
  const subscriptions =
    await getSubscriptionsByVendor(
      vendorId
    );

  return subscriptions.filter(
    (subscription) =>
      isSubscriptionActive(
        subscription
      )
  );
}

/**
 * Selected user ki subscription history.
 */
export async function getSubscriptionsByUser(
  userId
) {
  if (
    !userId ||
    !String(userId).trim()
  ) {
    return [];
  }

  const subscriptionQuery = query(
    collection(
      db,
      COLLECTIONS.SUBSCRIPTIONS
    ),
    where(
      "userId",
      "==",
      String(userId).trim()
    )
  );

  const snapshot =
    await getDocs(subscriptionQuery);

  return snapshot.docs
    .map((item) => ({
      id: item.id,
      ...item.data(),
    }))
    .sort(
      (
        firstSubscription,
        secondSubscription
      ) =>
        getTimeMs(
          secondSubscription.createdAt
        ) -
        getTimeMs(
          firstSubscription.createdAt
        )
    );
}

/**
 * Single subscription fetch karta hai.
 */
export async function getSubscriptionById(
  subscriptionId
) {
  validateSubscriptionId(
    subscriptionId
  );

  const reference = doc(
    db,
    COLLECTIONS.SUBSCRIPTIONS,
    subscriptionId
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
 * User aur vendor ki latest subscription.
 */
export async function getLatestSubscriptionByUserAndVendor(
  userId,
  vendorId
) {
  if (!userId || !vendorId) {
    return null;
  }

  const subscriptions =
    await getSubscriptionsByUser(
      userId
    );

  return (
    subscriptions.find(
      (subscription) =>
        subscription.vendorId ===
        vendorId
    ) || null
  );
}

/**
 * Subscription safely update karta hai.
 *
 * vendorId, userId aur createdAt
 * is function se change nahi honge.
 */
export async function updateSubscription(
  subscriptionId,
  data = {}
) {
  validateSubscriptionId(
    subscriptionId
  );

  const safeUpdate =
    sanitizeSubscriptionUpdate(
      data
    );

  if (
    Object.keys(safeUpdate)
      .length === 0
  ) {
    throw new Error(
      "No valid subscription fields provided"
    );
  }

  const reference = doc(
    db,
    COLLECTIONS.SUBSCRIPTIONS,
    subscriptionId
  );

  await updateDoc(reference, {
    ...safeUpdate,

    updatedAt:
      serverTimestamp(),
  });

  return subscriptionId;
}

/**
 * Vendor ownership verify karke
 * subscription update karta hai.
 */
export async function updateVendorSubscription(
  subscriptionId,
  vendorId,
  data = {}
) {
  validateSubscriptionId(
    subscriptionId
  );

  if (!vendorId) {
    throw new Error(
      "Vendor ID is required"
    );
  }

  const reference = doc(
    db,
    COLLECTIONS.SUBSCRIPTIONS,
    subscriptionId
  );

  const snapshot =
    await getDoc(reference);

  if (!snapshot.exists()) {
    throw new Error(
      "Subscription not found"
    );
  }

  const subscriptionData =
    snapshot.data();

  if (
    subscriptionData.vendorId !==
    vendorId
  ) {
    throw new Error(
      "You cannot update another vendor's subscription"
    );
  }

  const safeUpdate =
    sanitizeSubscriptionUpdate(
      data
    );

  if (
    Object.keys(safeUpdate)
      .length === 0
  ) {
    throw new Error(
      "No valid subscription fields provided"
    );
  }

  await updateDoc(reference, {
    ...safeUpdate,

    updatedAt:
      serverTimestamp(),
  });

  return subscriptionId;
}

/**
 * Subscription status shortcut.
 */
export async function updateSubscriptionStatus(
  subscriptionId,
  status
) {
  if (!status) {
    throw new Error(
      "Subscription status is required"
    );
  }

  return updateSubscription(
    subscriptionId,
    {
      status,
    }
  );
}

/**
 * Vendor subscriber remove karta hai.
 *
 * Actual subscription vendorId verify hota hai.
 */
export async function removeSubscription(
  subscriptionId,
  vendorId
) {
  validateSubscriptionId(
    subscriptionId
  );

  if (!vendorId) {
    throw new Error(
      "Vendor ID is required"
    );
  }

  const reference = doc(
    db,
    COLLECTIONS.SUBSCRIPTIONS,
    subscriptionId
  );

  const snapshot =
    await getDoc(reference);

  if (!snapshot.exists()) {
    throw new Error(
      "Subscription not found"
    );
  }

  const subscriptionData =
    snapshot.data();

  if (
    subscriptionData.vendorId !==
    vendorId
  ) {
    throw new Error(
      "You cannot remove another vendor's subscriber"
    );
  }

  await updateDoc(reference, {
    status: "removed",

    removedAt:
      serverTimestamp(),

    removedBy: vendorId,

    deliveryStatus:
      "stopped",

    updatedAt:
      serverTimestamp(),
  });

  return subscriptionId;
}

/**
 * Removed subscription restore karta hai.
 */
export async function restoreSubscription(
  subscriptionId,
  vendorId = ""
) {
  validateSubscriptionId(
    subscriptionId
  );

  const reference = doc(
    db,
    COLLECTIONS.SUBSCRIPTIONS,
    subscriptionId
  );

  if (vendorId) {
    const snapshot =
      await getDoc(reference);

    if (!snapshot.exists()) {
      throw new Error(
        "Subscription not found"
      );
    }

    if (
      snapshot.data().vendorId !==
      vendorId
    ) {
      throw new Error(
        "You cannot restore another vendor's subscription"
      );
    }
  }

  await updateDoc(reference, {
    status: ACTIVE_STATUS,

    removedAt: null,

    removedBy: "",

    deliveryStatus:
      "pending",

    updatedAt:
      serverTimestamp(),
  });

  return subscriptionId;
}

/**
 * Existing subscription ko renew karta hai.
 */
export async function renewSubscription(
  subscriptionId,
  newEndDate,
  vendorId = ""
) {
  validateSubscriptionId(
    subscriptionId
  );

  if (!newEndDate) {
    throw new Error(
      "New end date is required"
    );
  }

  const updateData = {
    status: ACTIVE_STATUS,

    endDate: newEndDate,

    removedAt: null,

    removedBy: "",

    deliveryStatus:
      "pending",

    renewedAt:
      serverTimestamp(),
  };

  if (vendorId) {
    return updateVendorSubscription(
      subscriptionId,
      vendorId,
      updateData
    );
  }

  return updateSubscription(
    subscriptionId,
    updateData
  );
}

function sanitizeSubscriptionUpdate(
  data = {}
) {
  const allowedFields = [
    "customerName",
    "customerPhone",
    "customerAddress",
    "planName",
    "planType",
    "mealType",
    "mealPreference",
    "price",
    "durationDays",
    "totalDays",
    "startDate",
    "endDate",
    "status",
    "paymentMethod",
    "paymentStatus",
    "notes",
    "lastDeliveredAt",
    "deliveryStatus",
    "removedAt",
    "removedBy",
    "renewedAt",
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
    cleanedData.price !== undefined
  ) {
    cleanedData.price =
      getValidNumber(
        cleanedData.price,
        0
      );
  }

  if (
    cleanedData.durationDays !==
    undefined
  ) {
    cleanedData.durationDays =
      getValidNumber(
        cleanedData.durationDays,
        30
      );
  }

  if (
    cleanedData.totalDays !==
    undefined
  ) {
    cleanedData.totalDays =
      getValidNumber(
        cleanedData.totalDays,
        30
      );
  }

  return removeUndefined(
    cleanedData
  );
}

function validateCreateSubscription(
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

  const price =
    getValidNumber(
      data.price,
      0
    );

  if (price < 0) {
    throw new Error(
      "Subscription price cannot be negative"
    );
  }

  if (
    data.startDate &&
    data.endDate
  ) {
    const startDate =
      toDate(data.startDate);

    const endDate =
      toDate(data.endDate);

    if (
      startDate &&
      endDate &&
      endDate <= startDate
    ) {
      throw new Error(
        "Subscription end date must be after start date"
      );
    }
  }
}

function validateSubscriptionId(
  subscriptionId
) {
  if (
    !subscriptionId ||
    !String(
      subscriptionId
    ).trim()
  ) {
    throw new Error(
      "Subscription ID is required"
    );
  }
}

function isSubscriptionActive(
  subscription
) {
  const status = String(
    subscription.status ||
      ACTIVE_STATUS
  ).toLowerCase();

  if (
    [
      "removed",
      "cancelled",
      "expired",
      "deleted",
    ].includes(status)
  ) {
    return false;
  }

  if (!subscription.endDate) {
    return true;
  }

  const endDate =
    toDate(
      subscription.endDate
    );

  if (
    !endDate ||
    Number.isNaN(
      endDate.getTime()
    )
  ) {
    return true;
  }

  return (
    endDate.getTime() >
    Date.now()
  );
}

function getDurationDays(
  startDate,
  endDate,
  fallback = 30
) {
  const start =
    toDate(startDate);

  const end =
    toDate(endDate);

  if (
    start &&
    end &&
    !Number.isNaN(
      start.getTime()
    ) &&
    !Number.isNaN(
      end.getTime()
    )
  ) {
    const difference =
      end.getTime() -
      start.getTime();

    const days = Math.ceil(
      difference /
        (1000 * 60 * 60 * 24)
    );

    return days > 0
      ? days
      : getValidNumber(
          fallback,
          30
        );
  }

  return getValidNumber(
    fallback,
    30
  );
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

function toDate(value) {
  if (!value) {
    return null;
  }

  if (
    typeof value?.toDate ===
    "function"
  ) {
    return value.toDate();
  }

  if (value?.seconds) {
    return new Date(
      value.seconds * 1000
    );
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function getTimeMs(value) {
  const date = toDate(value);

  return date
    ? date.getTime()
    : 0;
}