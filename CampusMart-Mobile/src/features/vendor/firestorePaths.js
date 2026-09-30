export const COLLECTIONS = {
  VENDORS: "vendors",
  SUBSCRIPTIONS: "subscriptions",
  ORDERS: "orders",
  DELIVERIES: "deliveries",
  PAYMENTS: "payments",
  REVIEWS: "reviews",
};

export const getVendorPath = (vendorId) => `${COLLECTIONS.VENDORS}/${vendorId}`;

export const getSubscriptionPath = (subscriptionId) =>
  `${COLLECTIONS.SUBSCRIPTIONS}/${subscriptionId}`;

export const getOrderPath = (orderId) => `${COLLECTIONS.ORDERS}/${orderId}`;

export const getDeliveryPath = (deliveryId) =>
  `${COLLECTIONS.DELIVERIES}/${deliveryId}`;

export const getPaymentPath = (paymentId) =>
  `${COLLECTIONS.PAYMENTS}/${paymentId}`;

export const getReviewPath = (reviewId) =>
  `${COLLECTIONS.REVIEWS}/${reviewId}`;