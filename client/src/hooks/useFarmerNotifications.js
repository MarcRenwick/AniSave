import { useEffect, useState } from "react";
import { getMyProducts, getFarmerOrders } from "../services/api";
import { deriveNotifications } from "../utils/notifications";

export function useFarmerNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMyProducts(), getFarmerOrders()])
      .then(([productsRes, ordersRes]) => {
        setNotifications(deriveNotifications(productsRes.data, ordersRes.data));
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  return { notifications, loading };
}
