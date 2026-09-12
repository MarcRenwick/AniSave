import { FileText, AlertTriangle, CheckCircle2, TrendingDown } from "lucide-react";

export const categoryLabels = {
  orders: "Orders",
  market: "Market Updates",
  system: "System",
};

export const notifications = [
  {
    id: 1,
    category: "orders",
    icon: FileText,
    color: "bg-blue-500",
    title: "New Order",
    description: "Marian Salcedo ordered 5kg of tomatoes",
  },
  {
    id: 2,
    category: "market",
    icon: AlertTriangle,
    color: "bg-red-500",
    title: "Presyo Tumaas!",
    description: "The price of tomatoes increased by 10% this week",
  },
  {
    id: 3,
    category: "orders",
    icon: CheckCircle2,
    color: "bg-green-500",
    title: "Done Order",
    description: "You've completed an order",
  },
  {
    id: 4,
    category: "system",
    icon: TrendingDown,
    color: "bg-yellow-500",
    title: "Low Stock",
    description: "Some of your products are running low",
  },
  {
    id: 5,
    category: "market",
    icon: AlertTriangle,
    color: "bg-red-500",
    title: "Presyo Tumaas!",
    description: "The price of cabbage increased by 5% this week",
  },
];
