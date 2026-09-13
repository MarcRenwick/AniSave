import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingDown, Coins, Banknote, TrendingUp, Award } from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import { useAuth } from "../../context/AuthContext";
import { getMyProducts, getFarmerOrders } from "../../services/api";
import { deriveNotifications, LOW_STOCK_THRESHOLD } from "../../utils/notifications";

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

function CardHeader({ children }) {
  return (
    <div className="rounded-t-xl bg-[#2f8f66] px-4 py-2 text-sm font-semibold text-white">{children}</div>
  );
}

function isToday(dateString) {
  const d = new Date(dateString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function FarmerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMyProducts(), getFarmerOrders()])
      .then(([productsRes, ordersRes]) => {
        setProducts(productsRes.data);
        setOrders(ordersRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const outOfStock = useMemo(() => products.filter((p) => p.stock === 0), [products]);
  const lowStock = useMemo(
    () => products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD),
    [products]
  );
  const totalStockKg = useMemo(() => products.reduce((sum, p) => sum + p.stock, 0), [products]);

  const topProducts = useMemo(() => {
    const salesByProduct = new Map();
    orders
      .filter((order) => order.status !== "cancelled")
      .forEach((order) => {
        const key = order.product;
        const entry = salesByProduct.get(key) || { title: order.productTitle, qty: 0 };
        entry.qty += order.quantity;
        salesByProduct.set(key, entry);
      });
    return [...salesByProduct.values()].sort((a, b) => b.qty - a.qty).slice(0, 6);
  }, [orders]);

  const todaysSales = useMemo(
    () =>
      orders
        .filter((o) => o.status !== "cancelled" && isToday(o.createdAt))
        .reduce((sum, o) => sum + o.total, 0),
    [orders]
  );

  const notifications = useMemo(() => deriveNotifications(products, orders), [products, orders]);

  return (
    <FarmerLayout>
      <FarmerTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">Hello, {user?.name}!😁</h1>
      </FarmerTopBar>

      <div className="grid grid-cols-3 gap-6 p-8">
        <div className="col-span-2 space-y-6">
          {/* Demand chart - sample data; real crop-demand forecasting is a separate feature */}
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

          {/* Notifications preview - real, derived from your products/orders */}
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="flex items-center justify-between rounded-t-xl bg-[#2f8f66] px-4 py-2 text-sm font-semibold text-white">
              <span>Notifications</span>
              <button
                type="button"
                onClick={() => navigate("/farmer/notifications")}
                className="text-xs font-medium underline-offset-2 hover:underline"
              >
                See All
              </button>
            </div>
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-400">You&apos;re all caught up!</p>
            ) : (
              <div className="grid grid-cols-3 gap-4 p-4">
                {notifications.slice(0, 3).map((note) => (
                  <div key={note.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-white ${note.color}`}>
                        <note.icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-sm font-semibold text-gray-800">{note.title}</span>
                    </div>
                    <p className="text-xs text-gray-600">{note.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-6">
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <CardHeader>Today&apos;s Sales</CardHeader>
              <div className="flex items-center gap-3 p-4">
                <Coins className="h-8 w-8 text-amber-500" />
                <span className="text-2xl font-bold text-gray-900">₱{todaysSales}</span>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <CardHeader>Profit</CardHeader>
              <div className="flex items-center gap-3 p-4">
                <Banknote className="h-8 w-8 text-green-600" />
                <span className="text-lg font-bold text-gray-400">N/A</span>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <CardHeader>Stock</CardHeader>
              <div className="flex items-center justify-between p-4">
                <div className="text-sm text-gray-700">
                  <p className="text-lg font-bold text-gray-900">{totalStockKg} kg</p>
                  <p>{products.length} products</p>
                  {lowStock.length > 0 && (
                    <p className="text-amber-600">⚠ {lowStock.length} product(s) low in stock</p>
                  )}
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
              {loading ? (
                <p className="text-sm text-gray-400">Loading...</p>
              ) : outOfStock.length === 0 ? (
                <p className="text-sm text-gray-400">Nothing out of stock 🎉</p>
              ) : (
                <ul className="space-y-1 text-sm text-gray-700">
                  {outOfStock.map((p) => (
                    <li key={p._id}>-{p.title}</li>
                  ))}
                </ul>
              )}
              <TrendingDown className="mt-2 h-8 w-8 shrink-0 text-red-500" />
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Best Selling Products</p>
            <p className="mt-1 flex items-center gap-1 font-bold text-amber-600">🏆 Top Products</p>
            <div className="mt-3 flex items-start justify-between gap-2">
              {loading ? (
                <p className="text-sm text-gray-400">Loading...</p>
              ) : topProducts.length === 0 ? (
                <p className="text-sm text-gray-400">No orders yet</p>
              ) : (
                <ol className="list-decimal space-y-1 pl-4 text-sm text-gray-700">
                  {topProducts.map((p) => (
                    <li key={p.title}>
                      {p.title} <span className="text-gray-400">({p.qty}kg sold)</span>
                    </li>
                  ))}
                </ol>
              )}
              <Award className="mt-2 h-8 w-8 shrink-0 text-yellow-500" />
            </div>
          </div>
        </div>
      </div>
    </FarmerLayout>
  );
}
