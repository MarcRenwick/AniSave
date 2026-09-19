import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import VerificationBanner from "../../components/farmer/VerificationBanner";
import DemandChart from "../../components/farmer/DemandChart";
import { useAuth } from "../../context/AuthContext";
import { getMyProducts, getFarmerOrders } from "../../services/api";
import { deriveNotifications, LOW_STOCK_THRESHOLD } from "../../utils/notifications";

// "Old stock nobody bought" - long enough that a normal slow week doesn't
// get flagged as needing a discount.
const STALE_PRODUCT_DAYS = 14;

// Shared by the all-time and this-month leaderboards below - only the set of
// orders considered differs between them.
// getFarmerOrders populates `product` (for its image/category/location), so
// an order's product is an object here, not a plain id - grouping or
// comparing by the object itself would treat every order as a different
// product, since each is a distinct object from JSON parsing.
const orderProductId = (order) => order.product?._id || order.product;

function rankByQuantitySold(orders) {
  const salesByProduct = new Map();
  orders.forEach((order) => {
    const key = orderProductId(order);
    const entry = salesByProduct.get(key) || { title: order.productTitle, qty: 0 };
    entry.qty += order.quantity;
    salesByProduct.set(key, entry);
  });
  return [...salesByProduct.values()].sort((a, b) => b.qty - a.qty).slice(0, 6);
}

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

  const lowStock = useMemo(
    () => products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD),
    [products]
  );
  const totalStockKg = useMemo(() => products.reduce((sum, p) => sum + p.stock, 0), [products]);

  // A buyer placing an order doesn't move any produce yet - the farmer still
  // has to accept it, and it can still be rejected or cancelled after that.
  // Everything the dashboard reports as sold/demand only counts an order once
  // it's actually done, not the moment it's placed.
  const completedOrders = useMemo(() => orders.filter((o) => o.status === "done"), [orders]);

  // All-time demand, by total quantity sold.
  const topProducts = useMemo(() => rankByQuantitySold(completedOrders), [completedOrders]);

  // Same ranking, narrowed to this calendar month - by when the order was
  // actually completed, not when it was first placed.
  const topProductsThisMonth = useMemo(() => {
    const now = new Date();
    const thisMonth = completedOrders.filter((order) => {
      const d = new Date(order.doneAt || order.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    return rankByQuantitySold(thisMonth);
  }, [completedOrders]);

  // Flash Sale candidates: still in stock, no buyer interest at all (this is
  // about whether it's ever been ordered, not whether that order finished -
  // one still in progress means it isn't sitting idle), not already
  // discounted, and old enough that it isn't just a normal slow week.
  const staleStock = useMemo(() => {
    const everOrdered = new Set(orders.filter((o) => o.status !== "cancelled").map(orderProductId));
    const cutoff = new Date().getTime() - STALE_PRODUCT_DAYS * 24 * 60 * 60 * 1000;
    return products
      .filter(
        (p) =>
          p.stock > 0 &&
          !p.salePrice &&
          !everOrdered.has(p._id) &&
          new Date(p.createdAt).getTime() <= cutoff
      )
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(0, 6);
  }, [products, orders]);

  const todaysSales = useMemo(
    () =>
      completedOrders
        .filter((o) => isToday(o.doneAt || o.createdAt))
        .reduce((sum, o) => sum + o.total, 0),
    [completedOrders]
  );

  const notifications = useMemo(() => deriveNotifications(products, orders), [products, orders]);

  return (
    <FarmerLayout>
      <FarmerTopBar>
        <h1 className="text-xl font-semibold text-gray-900">Hello, {user?.name}!</h1>
      </FarmerTopBar>

      <div className="px-8 pt-6">
        <VerificationBanner />
      </div>

      <div className="grid grid-cols-3 gap-6 p-8 pt-6">
        <div className="col-span-2 space-y-6">
          <DemandChart orders={orders} loading={loading} />

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-6">
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <CardHeader>Today&apos;s Sales</CardHeader>
              <div className="p-4">
                <span className="text-2xl font-bold text-gray-900">₱{todaysSales}</span>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <CardHeader>Profit</CardHeader>
              <div className="p-4">
                <span className="text-lg font-bold text-gray-400">N/A</span>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <CardHeader>Stock</CardHeader>
              <div className="p-4 text-sm text-gray-700">
                <p className="text-lg font-bold text-gray-900">{totalStockKg} kg</p>
                <p>{products.length} products</p>
                {lowStock.length > 0 && (
                  <p className="text-amber-600">{lowStock.length} product(s) low in stock</p>
                )}
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
                    <p className="mb-2 text-sm font-semibold text-gray-800">{note.title}</p>
                    <p className="text-xs text-gray-600">{note.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Top Crops Demand</p>
            <p className="mt-1 font-bold text-amber-600">Best Sellers</p>
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
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Top Purchase this Month</p>
            <p className="mt-1 font-bold text-amber-600">This Month</p>
            <div className="mt-3 flex items-start justify-between gap-2">
              {loading ? (
                <p className="text-sm text-gray-400">Loading...</p>
              ) : topProductsThisMonth.length === 0 ? (
                <p className="text-sm text-gray-400">No orders yet this month</p>
              ) : (
                <ol className="list-decimal space-y-1 pl-4 text-sm text-gray-700">
                  {topProductsThisMonth.map((p) => (
                    <li key={p.title}>
                      {p.title} <span className="text-gray-400">({p.qty}kg sold)</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Recommended Flash Sales</p>
            <p className="mt-1 font-bold text-amber-600">Old Stock</p>
            <div className="mt-3 flex items-start justify-between gap-2">
              {loading ? (
                <p className="text-sm text-gray-400">Loading...</p>
              ) : staleStock.length === 0 ? (
                <p className="text-sm text-gray-400">Nothing sitting idle - nice!</p>
              ) : (
                <ul className="w-full space-y-1.5 text-sm text-gray-700">
                  {staleStock.map((p) => (
                    <li key={p._id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/farmer/products/${p._id}/edit`)}
                        className="flex w-full items-center justify-between gap-2 text-left hover:text-[#2f8f66] hover:underline"
                      >
                        <span className="truncate">{p.title}</span>
                        <span className="shrink-0 text-xs text-gray-400">{p.stock}kg left</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </FarmerLayout>
  );
}
