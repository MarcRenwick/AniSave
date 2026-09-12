import { FileText, AlertTriangle, TrendingDown } from "lucide-react";

// "market" (price-change alerts) has no real data source yet - no price-history
// feature exists - so it's kept here only so the Notifications page's filter tab
// renders with a real (currently empty) count instead of being removed outright.
export const categoryLabels = {
  orders: "Orders",
  market: "Market Updates",
  system: "System",
};

export const LOW_STOCK_THRESHOLD = 10;

export function deriveNotifications(products, orders) {
  const list = [];

  orders
    .filter((order) => order.status === "new")
    .forEach((order) => {
      list.push({
        id: `order-${order._id}`,
        category: "orders",
        icon: FileText,
        color: "bg-blue-500",
        title: "New Order",
        description: `${order.buyer?.name || "A buyer"} ordered ${order.quantity}kg of ${order.productTitle}`,
      });
    });

  const outOfStock = products.filter((p) => p.stock === 0);
  if (outOfStock.length > 0) {
    list.push({
      id: "out-of-stock",
      category: "system",
      icon: TrendingDown,
      color: "bg-red-500",
      title: "Out of Stock",
      description: `${outOfStock.map((p) => p.title).join(", ")} ${
        outOfStock.length > 1 ? "are" : "is"
      } out of stock`,
    });
  }

  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD);
  if (lowStock.length > 0) {
    list.push({
      id: "low-stock",
      category: "system",
      icon: AlertTriangle,
      color: "bg-yellow-500",
      title: "Low Stock",
      description: `${lowStock.map((p) => p.title).join(", ")} running low (under ${LOW_STOCK_THRESHOLD}kg)`,
    });
  }

  return list;
}
