export const VENDOR_TYPES = {
  TIFFIN: "tiffin",
  PG: "pg",
  LAUNDRY: "laundry",
  TUTOR: "tutor",
};

export const VENDOR_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
};

export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  PAUSED: "paused",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
};

export const ORDER_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

export const DELIVERY_STATUS = {
  SCHEDULED: "scheduled",
  PICKED_UP: "picked_up",
  DELIVERED: "delivered",
  FAILED: "failed",
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
};

export const PAYMENT_METHODS = {
  CASH: "cash",
  UPI: "upi",
  CARD: "card",
  ONLINE: "online",
};