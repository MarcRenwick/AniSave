import { TrendingDown, Coins, Banknote, TrendingUp, Award } from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import { useAuth } from "../../context/AuthContext";

const demandChart = [
  {
    month: "January",
    color: "bg-amber-400",
    crops: [
      { label: "Peas", pct: 40 },
      { label: "Broccoli", pct: 55 },
      { label: "Cabbage", pct: 90 },
    ],
  },
  {
    month: "February",
    color: "bg-rose-400",
    crops: [
      { label: "Tomato", pct: 45 },
      { label: "Broccoli", pct: 35 },
      { label: "Carrot", pct: 90 },
    ],
  },
  {
    month: "March",
    color: "bg-indigo-400",
    crops: [
      { label: "Peas", pct: 40 },
      { label: "Pechay", pct: 55 },
      { label: "Cucumber", pct: 90 },
    ],
  },
];

const notifications = [
  { emoji: "🏃", title: "May gustong bumili", lines: 3 },
  { emoji: "🚨", title: "Paalala", lines: 3 },
  { emoji: "📈", title: "Presyo Tumaas", lines: 3 },
];

const outOfStock = ["Tomato", "Carrot", "Lettuce", "Pechay", "Potatoes", "Broccoli", "Onions", "Garlic", "Cucumber"];

const bestSelling = ["Carrot", "Tomatoes", "Garlic", "Onions", "Petchay", "Potato"];

function CardHeader({ children }) {
  return (
    <div className="rounded-t-xl bg-[#2f8f66] px-4 py-2 text-sm font-semibold text-white">{children}</div>
  );
}

export default function FarmerDashboard() {
  const { user } = useAuth();

  return (
    <FarmerLayout>
      <FarmerTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">Magandang Araw, {user?.name}! 😏</h1>
      </FarmerTopBar>

      <div className="grid grid-cols-3 gap-6 p-8">
        <div className="col-span-2 space-y-6">
          {/* Demand chart */}
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <CardHeader>Analytical Demands this Upcoming Months</CardHeader>
            <div className="p-6">
              <div className="flex items-end justify-around border-b-2 border-gray-800" style={{ height: "170px" }}>
                {demandChart.map((month) => (
                  <div key={month.month} className="flex items-end gap-3" style={{ height: "150px" }}>
                    {month.crops.map((crop) => (
                      <div key={crop.label} className="flex h-full flex-col items-center justify-end">
                        <span className="mb-1 whitespace-nowrap text-[11px] font-medium text-gray-700">
                          {crop.label}
                        </span>
                        <div
                          className={`w-9 rounded-t ${month.color}`}
                          style={{ height: `${crop.pct}%` }}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-around text-sm font-semibold text-gray-800">
                {demandChart.map((month) => (
                  <span key={month.month}>{month.month}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="flex items-center justify-between rounded-t-xl bg-[#2f8f66] px-4 py-2 text-sm font-semibold text-white">
              <span>Notifications</span>
              <button type="button" className="text-xs font-medium underline-offset-2 hover:underline">
                See All
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 p-4">
              {notifications.map((note) => (
                <div key={note.title} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xl">{note.emoji}</span>
                    <span className="text-sm font-semibold text-gray-800">{note.title}</span>
                  </div>
                  <div className="space-y-1.5">
                    {Array.from({ length: note.lines }).map((_, i) => (
                      <div key={i} className="h-1.5 w-full rounded bg-gray-300" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-6">
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <CardHeader>Today&apos;s Sales</CardHeader>
              <div className="flex items-center gap-3 p-4">
                <Coins className="h-8 w-8 text-amber-500" />
                <span className="text-2xl font-bold text-gray-900">₱8,452</span>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <CardHeader>Profit</CardHeader>
              <div className="flex items-center gap-3 p-4">
                <Banknote className="h-8 w-8 text-green-600" />
                <span className="text-2xl font-bold text-gray-900">₱2,850</span>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <CardHeader>Stock</CardHeader>
              <div className="flex items-center justify-between p-4">
                <div className="text-sm text-gray-700">
                  <p className="text-lg font-bold text-gray-900">1,250 kg</p>
                  <p>12 products</p>
                  <p className="text-amber-600">⚠ 3 products low in stock</p>
                </div>
                <TrendingUp className="h-8 w-8 shrink-0 text-blue-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Out-of-Stock Products</p>
            <p className="mt-1 flex items-center gap-1 font-bold text-amber-600">⚠ Out of Stock</p>
            <div className="mt-3 flex items-start justify-between gap-2">
              <ul className="space-y-1 text-sm text-gray-700">
                {outOfStock.map((item) => (
                  <li key={item}>-{item}</li>
                ))}
              </ul>
              <TrendingDown className="mt-2 h-8 w-8 shrink-0 text-red-500" />
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Best Selling Products</p>
            <p className="mt-1 flex items-center gap-1 font-bold text-amber-600">🏆 Top Products</p>
            <div className="mt-3 flex items-start justify-between gap-2">
              <ol className="list-decimal space-y-1 pl-4 text-sm text-gray-700">
                {bestSelling.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
              <Award className="mt-2 h-8 w-8 shrink-0 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>
    </FarmerLayout>
  );
}
