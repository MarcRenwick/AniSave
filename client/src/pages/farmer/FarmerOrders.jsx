import { FileText, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";

const columns = [
  {
    key: "new",
    label: "New",
    description: "Orders waiting to be processed",
    count: 10,
    icon: FileText,
    accent: "bg-blue-100 text-blue-700",
    badge: "bg-blue-500",
    orders: [
      { name: "Rany Torio", date: "Sep 7, 2026", time: "3:42 PM", item: "2kg Potato", total: 50, emoji: "🥔" },
      { name: "Angel Aquino", date: "Sep 5, 2026", time: "3:57 PM", item: "1kg Cabbage", total: 80, emoji: "🥬" },
      { name: "France Esguerra", date: "Sep 7, 2026", time: "4:00 PM", item: "10kg Cucumber", total: 70, emoji: "🥒" },
      { name: "Travis Landon", date: "Sep 7, 2026", time: "3:10 PM", item: "4kg Carrot", total: 80, emoji: "🥕" },
    ],
  },
  {
    key: "ready",
    label: "Ready",
    description: "Orders are prepared and ready",
    count: 4,
    icon: Clock,
    accent: "bg-yellow-100 text-yellow-700",
    badge: "bg-yellow-500",
    orders: [
      { name: "Adrian Riola", date: "Sep 4, 2026", time: "12:41 PM", item: "4kg Peas", total: 50, emoji: "🫛" },
      { name: "Gian Petilla", date: "Sep 5, 2026", time: "5:22 PM", item: "5kg Orange", total: 100, emoji: "🍊" },
      { name: "Jeremiah Lomibao", date: "Sep 4, 2026", time: "2:04 PM", item: "2kg Broccoli", total: 65, emoji: "🥦" },
      { name: "Junald Valencia", date: "Sep 4, 2026", time: "5:04 PM", item: "3kg Red Pepper", total: 30, emoji: "🫑" },
    ],
  },
  {
    key: "done",
    label: "Done",
    description: "Successfully completed orders",
    count: 8,
    icon: CheckCircle2,
    accent: "bg-green-100 text-green-700",
    badge: "bg-green-500",
    orders: [
      { name: "Bernadette Pascual", date: "Sep 1, 2026", time: "10:38 AM", item: "1kg Radish", total: 50, emoji: "🥬" },
      { name: "Jherain Salcedo", date: "Sep 2, 2026", time: "8:32 PM", item: "2kg Chillies", total: 20, emoji: "🌶️" },
      { name: "Danica Coolie", date: "Sep 3, 2026", time: "9:12 PM", item: "1kg Potatoes", total: 40, emoji: "🥔" },
      { name: "Marc Rosario", date: "Sep 2, 2026", time: "3:42 PM", item: "4kg Potatoes", total: 25, emoji: "🥔" },
    ],
  },
];

export default function FarmerOrders() {
  return (
    <FarmerLayout>
      <FarmerTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500">Manage and track your customer orders</p>
      </FarmerTopBar>

      <div className="p-8">
        <div className="grid grid-cols-3 gap-6">
          {columns.map(({ key, label, description, count, icon: Icon, accent }) => (
            <div key={key} className={`flex items-center justify-between rounded-xl p-5 ${accent}`}>
              <div>
                <div className="flex items-center gap-2 font-semibold">
                  <Icon className="h-5 w-5" />
                  {label}
                </div>
                <p className="mt-1 text-xs">{description}</p>
                <p className="mt-3 text-2xl font-bold">{count} orders</p>
              </div>
              <ChevronRight className="h-5 w-5 opacity-60" />
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-6">
          {columns.map(({ key, label, count, badge, orders }) => (
            <div key={key} className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className={`flex items-center justify-between px-4 py-2 text-sm font-semibold text-white ${badge}`}>
                <span>{label}</span>
                <span>{count} orders</span>
              </div>
              <div className="space-y-3 p-4">
                {orders.map((order) => (
                  <div key={order.name} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
                    <span className="text-2xl">{order.emoji}</span>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="truncate font-medium text-gray-900">{order.name}</p>
                      <p className="text-xs text-gray-400">
                        {order.date} · {order.time}
                      </p>
                      <p className="text-gray-600">{order.item}</p>
                      <p className="font-semibold text-gray-900">Total: ₱{order.total}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="w-full border-t border-gray-100 py-3 text-sm font-medium text-[#2f8f66] hover:bg-gray-50"
              >
                View all {label.toLowerCase()} orders →
              </button>
            </div>
          ))}
        </div>
      </div>
    </FarmerLayout>
  );
}
