import { FileText, Clock, CheckCircle2, XCircle, PackageOpen, CalendarClock } from "lucide-react";

// How each status is labelled for a buyer in a list of their orders - My
// Orders, and the orders shown in a chat with the farmer.
export const BUYER_ORDER_STATUS = {
  new: { label: "New", icon: FileText, color: "text-blue-700 bg-blue-100" },
  preorder: { label: "Pre-Order", icon: CalendarClock, color: "text-amber-700 bg-amber-100" },
  processing: { label: "Processing", icon: PackageOpen, color: "text-indigo-700 bg-indigo-100" },
  ready: { label: "Ready", icon: Clock, color: "text-yellow-700 bg-yellow-100" },
  done: { label: "Completed", icon: CheckCircle2, color: "text-green-700 bg-green-100" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-red-700 bg-red-100" },
};

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

// Where "Undo" would put this order back to, or null when there is nothing to
// take back. The same straight line the server walks backwards (see
// undoOrderStatus in controllers/orderController.js): a completed order is
// finished and a declined one has been announced to the buyer, so neither is
// reopened.
export function previousStatusOf(order) {
  if (order.status === "processing") return order.openedAs || "new";
  if (order.status === "ready") return "processing";
  return null;
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

// A short reference for an order, the same on both sides: "#6878D4C7".
export const orderNumber = (order) => `#${String(order._id).slice(-8).toUpperCase()}`;

export function formatDateTime(date) {
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
