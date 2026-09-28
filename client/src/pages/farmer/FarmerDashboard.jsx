import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  Clock,
  Package,
  PackageX,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import VerificationBanner from "../../components/farmer/VerificationBanner";
import DemandChart from "../../components/farmer/DemandChart";
import { Caption, Figure, StatCard, Warning } from "../../components/farmer/StatCard";
import { useAuth } from "../../context/AuthContext";
import { getMyProducts, getFarmerOrders, getTopSearchedProducts, getMyProfit } from "../../services/api";
import { deriveNotifications, LOW_STOCK_THRESHOLD } from "../../utils/notifications";
import { money } from "../../utils/profit";

// A product nobody has ordered for this long is suggested for a Flash Sale.
const STALE_PRODUCT_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const PROFIT_PAGE = "/farmer/dashboard/profit";

// Every card has one look: white, a hairline border, a dark title - no
// coloured header bars, so green is kept for what can be clicked or chosen.
const CARD = "rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm";

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

function isToday(dateString) {
  const d = new Date(dateString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// A titled list, each line with a bar showing how it compares to the first.
function RankedList({ title, subtitle, items, barClass, loading, empty, testId }) {
  const top = Math.max(...items.map((item) => item.value), 1);
  return (
    <section className={CARD} data-testid={testId}>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <p className="text-xs text-gray-500">{subtitle}</p>
      {loading ? (
        <p className="mt-4 text-sm text-gray-400">Loading...</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400">{empty}</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {items.map((item, i) => (
            <li key={item.key} title={item.hint}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-gray-800">
                  <span className="mr-0.5 font-semibold text-gray-400">{i + 1}</span> {item.name}
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-gray-900">{item.label}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full ${barClass}`} style={{ width: `${(item.value / top) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// How each kind of notification looks in the dashboard's list.
const NOTE_LOOK = {
  order: { icon: ShoppingBag, tone: "bg-green-50 text-[#2f8f66]" },
  "low-stock": { icon: AlertTriangle, tone: "bg-amber-50 text-amber-600" },
  "out-of-stock": { icon: PackageX, tone: "bg-red-50 text-red-600" },
};
const sentenceCase = (text) => text.charAt(0) + text.slice(1).toLowerCase();

export default function FarmerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  // What buyers are searching for and opening - demand, not sales.
  const [topSearched, setTopSearched] = useState([]);
  const [loading, setLoading] = useState(true);
  // Expense, income and profit totals, worked out by the server. Asked for on
  // their own, so the rest of the dashboard still shows if they can't be.
  const [profit, setProfit] = useState(null);
  const [profitFailed, setProfitFailed] = useState(false);

  useEffect(() => {
    Promise.all([getMyProducts(), getFarmerOrders(), getTopSearchedProducts()])
      .then(([productsRes, ordersRes, searchedRes]) => {
        setProducts(productsRes.data);
        setOrders(ordersRes.data);
        setTopSearched(searchedRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    getMyProfit()
      .then(({ data }) => setProfit(data.totals))
      .catch(() => setProfitFailed(true));
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

  // This month's revenue, and last month's to set it against.
  const monthRevenue = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    let current = 0;
    let previous = 0;
    completedOrders.forEach((order) => {
      const d = new Date(order.doneAt || order.createdAt);
      if (d >= thisMonth) current += order.total;
      else if (d >= lastMonth) previous += order.total;
    });
    return { current, change: previous > 0 ? ((current - previous) / previous) * 100 : null };
  }, [completedOrders]);

  // Flash Sale candidates: still in stock, not already discounted, and not
  // ordered by anyone for a week - counted from its last order, or from when
  // it was listed if it has never had one. Any order that wasn't cancelled
  // counts, finished or not: one in progress means it is selling. The longest
  // idle come first.
  const staleStock = useMemo(() => {
    const lastOrderAt = new Map();
    orders
      .filter((o) => o.status !== "cancelled")
      .forEach((o) => {
        const id = orderProductId(o);
        const at = new Date(o.createdAt).getTime();
        if (!(lastOrderAt.get(id) >= at)) lastOrderAt.set(id, at);
      });
    const now = new Date().getTime();
    return products
      .map((p) => {
        const lastOrder = lastOrderAt.get(p._id) ?? null;
        const idleSince = lastOrder ?? new Date(p.createdAt).getTime();
        return { ...p, everOrdered: lastOrder !== null, idleDays: Math.floor((now - idleSince) / DAY_MS) };
      })
      .filter((p) => p.stock > 0 && !p.salePrice && p.idleDays >= STALE_PRODUCT_DAYS)
      .sort((a, b) => b.idleDays - a.idleDays)
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
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <FarmerLayout>
      <FarmerTopBar>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Hello, {user?.name}!</h1>
        <p className="text-sm text-gray-500">Here&apos;s how your farm store is doing · {today}</p>
      </FarmerTopBar>

      <div className="space-y-6 p-4 sm:p-8">
        <VerificationBanner />

        {/* The four figures a farmer checks first, side by side */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Clock} label="Today's sales" testId="stat-today">
            <Figure>{money(todaysSales)}</Figure>
            <Caption>Earned so far today</Caption>
          </StatCard>

          <StatCard icon={CalendarDays} label="Revenue this month" testId="stat-revenue">
            <Figure>{money(monthRevenue.current)}</Figure>
            {monthRevenue.change === null ? (
              <Caption>No sales last month to compare</Caption>
            ) : (
              <Caption tone={monthRevenue.change >= 0 ? "font-medium text-emerald-600" : "font-medium text-red-600"}>
                <span className="inline-flex items-center gap-1">
                  {monthRevenue.change >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5" />
                  )}
                  {monthRevenue.change >= 0 ? "+" : ""}
                  {Math.round(monthRevenue.change)}% vs last month
                </span>
              </Caption>
            )}
          </StatCard>

          {/* The profit made so far on completed sales, with the estimate on
              stock beside it; the card opens the Profit page, with every
              product's figures. */}
          <StatCard
            icon={TrendingUp}
            label="Profit"
            link={{ to: PROFIT_PAGE, label: "Details" }}
            onClick={() => navigate(PROFIT_PAGE)}
            testId="profit-card"
          >
            <Figure tone={profit && profit.actual.profit < 0 ? "text-red-600" : "text-gray-900"}>
              {profit ? money(profit.actual.profit) : profitFailed ? "N/A" : "..."}
            </Figure>
            {profit && (
              <Caption>
                {profit.actual.soldKg > 0 ? `From ${profit.actual.soldKg} kg sold` : "No completed sales yet"}
                {profit.estimated.products > 0 && ` · Est. ${money(profit.estimated.profit)} on stock`}
              </Caption>
            )}
            {profit?.missingExpense > 0 && (
              <Warning to={PROFIT_PAGE} action="Add">
                {plural(profit.missingExpense, "product")} need{profit.missingExpense === 1 ? "s" : ""} an expense
              </Warning>
            )}
          </StatCard>

          <StatCard icon={Package} label="Stock" link={{ to: "/farmer/products", label: "Manage" }} testId="stat-stock">
            <Figure>{totalStockKg.toLocaleString()} kg</Figure>
            <Caption>Across {plural(products.length, "product")}</Caption>
            {lowStock.length > 0 && (
              <Warning to="/farmer/products" action="View">
                {plural(lowStock.length, "product")} low in stock
              </Warning>
            )}
          </StatCard>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-6 lg:col-span-2">
            <DemandChart orders={orders} loading={loading} />

            {/* Notifications preview - real, derived from your products and
                orders - each with the one thing to do about it. */}
            <section className={CARD} data-testid="recent-notifications">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-gray-900">Recent notifications</h2>
                <Link
                  to="/farmer/notifications"
                  className="text-xs font-semibold text-[#2f8f66] underline underline-offset-2 hover:text-[#1f5c42]"
                >
                  See all →
                </Link>
              </div>
              {notifications.length === 0 ? (
                <p className="mt-4 text-sm text-gray-400">You&apos;re all caught up!</p>
              ) : (
                <ul className="mt-2 divide-y divide-gray-100">
                  {notifications.slice(0, 3).map((note) => {
                    const look = NOTE_LOOK[note.kind] || NOTE_LOOK.order;
                    return (
                      <li key={note.id} className="flex items-center gap-3 py-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${look.tone}`}>
                          <look.icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900">{sentenceCase(note.title)}</p>
                          <p className="text-xs text-gray-600">
                            {note.emphasis ? (
                              <>
                                {note.lead} <span className="font-semibold text-gray-800">{note.emphasis}</span>
                              </>
                            ) : (
                              note.description
                            )}
                          </p>
                        </div>
                        {note.to && (
                          <Link
                            to={note.to}
                            className="shrink-0 rounded-md border border-[#2f8f66] px-3 py-2 text-xs font-semibold text-[#2f8f66] transition hover:bg-green-50"
                          >
                            {note.action}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <div className="min-w-0 space-y-6">
            {/* Demand as buyers show it - what they look for and open - rather
                than what has already been sold. The sales leaderboard below is
                the other half of the picture. */}
            <RankedList
              testId="top-searched"
              title="What buyers look for"
              subtitle="Top searched products · searches/views"
              loading={loading}
              empty="No searches yet"
              barClass="bg-[#2f8f66]"
              items={topSearched.map((crop) => ({
                key: crop.title,
                name: crop.title,
                value: crop.count,
                label: crop.count.toLocaleString(),
                hint: `${crop.searches} search${crop.searches === 1 ? "" : "es"}, ${plural(crop.views, "view")}`,
              }))}
            />

            <RankedList
              testId="best-sellers"
              title="Best sellers this month"
              subtitle="Top purchases · kg sold"
              loading={loading}
              empty="No orders yet this month"
              barClass="bg-orange-500"
              items={topProductsThisMonth.map((p) => ({
                key: p.title,
                name: p.title,
                value: p.qty,
                label: `${p.qty.toLocaleString()} kg`,
              }))}
            />

            <section className={CARD} data-testid="flash-sale">
              <h2 className="text-base font-semibold text-gray-900">Flash sale suggestions</h2>
              <p className="text-xs text-gray-500">Products with no orders for a week or more</p>
              {loading ? (
                <p className="mt-4 text-sm text-gray-400">Loading...</p>
              ) : staleStock.length === 0 ? (
                <div className="mt-4 flex items-start gap-3 rounded-lg bg-green-50 p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2f8f66] text-white">
                    <Check className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Nothing sitting idle — nice!</p>
                    <p className="text-xs text-gray-600">A product with no orders for a week will show up here.</p>
                  </div>
                </div>
              ) : (
                <ul className="mt-3 divide-y divide-gray-100">
                  {staleStock.map((p) => (
                    <li key={p._id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0 text-sm">
                        <p className="truncate font-medium text-gray-800">{p.title}</p>
                        <p className="text-xs text-gray-500">
                          {p.stock} kg left · {p.everOrdered ? `no orders in ${p.idleDays} days` : `no orders yet (listed ${p.idleDays} days ago)`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/farmer/products/${p._id}/edit`)}
                        className="shrink-0 rounded-md border border-[#2f8f66] px-3 py-1.5 text-xs font-semibold text-[#2f8f66] transition hover:bg-green-50"
                      >
                        Discount
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </FarmerLayout>
  );
}
