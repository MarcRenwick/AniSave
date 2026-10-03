import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRealtime } from "../context/RealtimeContext";
import { amountOf } from "../utils/units";

// What a farmer is told the moment a buyer does something with one of their
// orders. (The bell counts new orders too - see useFarmerNotifications.)
const alerts = {
  placed: (change) =>
    `${change.status === "preorder" ? "New pre-order" : "New order"}: ${change.buyerName || "A buyer"} ordered ${amountOf(
      change.quantity,
      change.unit
    )} of ${change.productTitle}.`,
  cancelled: (change) => `${change.buyerName || "A buyer"} cancelled their order for ${change.productTitle}.`,
};

// A toast on every farmer page for each order a buyer places, pre-orders or
// cancels, as it happens.
export function useFarmerOrderAlerts() {
  const { user } = useAuth();
  const { subscribe } = useRealtime();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (user?.role !== "farmer") return undefined;
    return subscribe("order:changed", (change) => {
      const say = change.by === "buyer" && alerts[change.action];
      if (say) setToast({ id: `${change.orderId}-${change.action}`, message: say(change) });
    });
  }, [user?.role, subscribe]);

  const dismiss = useCallback(() => setToast(null), []);
  return { toast, dismiss };
}
