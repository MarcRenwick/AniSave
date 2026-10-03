import { useEffect, useState } from "react";
import { getMyProducts, getFarmerOrders } from "../services/api";
import { deriveNotifications } from "../utils/notifications";
import useLiveRefresh from "./useLiveRefresh";

export function useFarmerNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    Promise.all([getMyProducts(), getFarmerOrders()]).then(([productsRes, ordersRes]) => {
      setNotifications(deriveNotifications(productsRes.data, ordersRes.data));
    });

  useEffect(() => {
    load()
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  // A new order, or stock running low, counts on the bell straight away.
  useLiveRefresh(["order:changed", "product:changed"], load);

  return { notifications, loading };
}
