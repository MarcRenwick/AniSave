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

// Each notification also says where it leads and what to call that - the
// dashboard's list puts a button on every one - and, for an order, the part of
// the sentence worth emphasising ("2 kg of Tomato"), and the photo of the
// product it is about (the first one, when it names several), if it has one.
export function deriveNotifications(products, orders) {
  const list = [];

  orders
    .filter((order) => order.status === "new")
    .forEach((order) => {
      list.push({
        id: `order-${order._id}`,
        kind: "order",
        category: "orders",
        icon: FileText,
        color: "bg-blue-500",
        title: "New Order",
        description: `${order.buyer?.name || "A buyer"} ordered ${order.quantity}kg of ${order.productTitle}`,
        lead: `${order.buyer?.name || "A buyer"} ordered`,
        emphasis: `${order.quantity} kg of ${order.productTitle}`,
        to: `/farmer/orders/${order._id}`,
        action: "View order",
        image: order.product?.image || null,
      });
    });

  const outOfStock = products.filter((p) => p.stock === 0);
  if (outOfStock.length > 0) {
    list.push({
      id: "out-of-stock",
      kind: "out-of-stock",
      image: outOfStock.find((p) => p.image)?.image || null,
      category: "system",
      to: "/farmer/products",
      action: "Restock",
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
      kind: "low-stock",
      image: lowStock.find((p) => p.image)?.image || null,
      category: "system",
      to: "/farmer/products",
      action: "Restock",
      icon: AlertTriangle,
      color: "bg-yellow-500",
      title: "Low Stock",
      description: `${lowStock.map((p) => p.title).join(", ")} running low (under ${LOW_STOCK_THRESHOLD}kg)`,
    });
  }

  return list;
}
