import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getBuyerOrders } from "../services/api";

const STORAGE_KEY = "anisave_buyer_seen_order_statuses";

function readSeen() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

const messages = {
  ready: (order) => `Your order for ${order.productTitle} has been approved by the seller!`,
  done: (order) => `Your order for ${order.productTitle} is complete. Enjoy!`,
};

// Polls the buyer's own orders once per mount and pops a toast for any
// order that has newly reached "ready" or "done" since the last visit -
// a lightweight substitute for real-time push notifications.
export function useBuyerOrderNotifications() {
  const { user } = useAuth();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (user?.role !== "buyer") return;

    getBuyerOrders()
      .then(({ data: orders }) => {
        const seen = readSeen();
        const next = { ...seen };
        let message = null;

        orders.forEach((order) => {
          if (messages[order.status] && seen[order._id] !== order.status) {
            message = messages[order.status](order);
          }
          next[order._id] = order.status;
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        if (message) setToast(message);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  return { toast, dismiss: () => setToast(null) };
}
