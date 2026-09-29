import { FileText, AlertTriangle, TrendingDown } from "lucide-react";
import { amountOf, unitOf } from "./units";

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
// dashboard's list puts a button on every one, and pressing one anywhere else
// opens it - and, for an order, the part of the sentence worth emphasising
// ("2 kg of Tomato"), and the photo of the product it is about, if it has one.
// A stock alert is one per product, so each leads to that product's page.
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
        description: `${order.buyer?.name || "A buyer"} ordered ${amountOf(order.quantity, unitOf(order))} of ${order.productTitle}`,
        lead: `${order.buyer?.name || "A buyer"} ordered`,
        emphasis: `${amountOf(order.quantity, unitOf(order))} of ${order.productTitle}`,
        to: `/farmer/orders/${order._id}`,
        action: "View order",
        image: order.product?.image || null,
      });
    });

  products
    .filter((p) => p.stock === 0)
    .forEach((product) => {
      list.push({
        id: `out-of-stock-${product._id}`,
        kind: "out-of-stock",
        image: product.image || null,
        category: "system",
        to: `/farmer/products/${product._id}`,
        action: "Restock",
        icon: TrendingDown,
        color: "bg-red-500",
        title: "Out of Stock",
        description: `${product.title} is out of stock`,
      });
    });

  products
    .filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD)
    .forEach((product) => {
      list.push({
        id: `low-stock-${product._id}`,
        kind: "low-stock",
        image: product.image || null,
        category: "system",
        to: `/farmer/products/${product._id}`,
        action: "Restock",
        icon: AlertTriangle,
        color: "bg-yellow-500",
        title: "Low Stock",
        description: `${product.title} is running low (${amountOf(product.stock, unitOf(product))} left)`,
      });
    });

  return list;
}
