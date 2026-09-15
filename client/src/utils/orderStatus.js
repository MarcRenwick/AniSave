// Six display steps over five real statuses. Accepting an order stamps one
// real timestamp (acceptedAt) that covers both "Order Accepted" and the
// preparing step, and marking it done covers both "Picked Up" and
// "Completed" - so the tracker reads as a full journey without inventing
// events the backend never recorded.
export const FARMER_STEPS = [
  "New",
  "Order Accepted",
  "Preparing",
  "Ready for Pickup",
  "Picked Up",
  "Completed",
];

export const BUYER_STEPS = [
  "Order Placed",
  "Order Accepted",
  "Seller is preparing your order",
  "Ready for Pickup",
  "Picked Up",
  "Completed",
];

export function doneCountFor(status) {
  if (status === "new" || status === "preorder") return 1;
  if (status === "processing") return 3;
  if (status === "ready") return 4;
  if (status === "done") return FARMER_STEPS.length;
  return 0;
}

export function stepDate(order, index) {
  if (index === 0) return order.createdAt;
  if (index <= 2) return order.acceptedAt;
  if (index === 3) return order.readyAt;
  return order.doneAt;
}

export const FARMER_STATUS_TITLE = {
  new: "New",
  preorder: "Pre-Order",
  processing: "Processing",
  ready: "Ready",
  done: "Complete",
  cancelled: "Cancelled",
};

export const BUYER_STATUS_TITLE = {
  new: "Pending",
  preorder: "Pre-Order",
  processing: "Pending",
  ready: "Ready",
  done: "Complete",
  cancelled: "Cancelled",
};

export function formatDateTime(date) {
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
