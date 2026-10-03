import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ChevronRight, ImageOff } from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import { EmptyState, SproutLoader, Stagger, StaggerItem } from "../../components/motion";
import { getFarmerOrders, SERVER_URL } from "../../services/api";
import { formatDateTime } from "../../utils/orderStatus";
import usePreserveScroll from "../../hooks/usePreserveScroll";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import { amountOf, unitOf } from "../../utils/units";
import { SPRING } from "../../theme/harvest";

// Pre-Order sits right after New: both are orders still waiting on the
// farmer's answer, so they belong next to each other at the front. Each has
// its colour - the stripe down an order's edge says which list it is in.
const tabs = [
  { key: "new", label: "New", stripe: "bg-gold-500" },
  { key: "preorder", label: "Pre-Order", stripe: "bg-clay-500" },
  { key: "processing", label: "Processing", stripe: "bg-forest-400" },
  { key: "ready", label: "Ready", stripe: "bg-forest-600" },
  { key: "done", label: "Completed", stripe: "bg-forest-800" },
  { key: "cancelled", label: "Cancelled", stripe: "bg-tomato-600" },
];

export default function FarmerOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("new");
  usePreserveScroll(tab);

  useEffect(() => {
    getFarmerOrders()
      .then(({ data }) => setOrders(data))
      .catch(() => setError("Could not load your orders. Is the server running?"))
      .finally(() => setLoading(false));
  }, []);

  // A buyer ordering, pre-ordering or cancelling shows here without a refresh.
  useLiveRefresh(["order:changed"], () =>
    getFarmerOrders().then(({ data }) => {
      setOrders(data);
      setError("");
    })
  );

  const countFor = (key) => orders.filter((o) => o.status === key).length;
  const visible = orders.filter((o) => o.status === tab);
  const stripe = tabs.find((t) => t.key === tab).stripe;

  return (
    <FarmerLayout>
      <FarmerTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500">Manage and track your customer orders</p>
      </FarmerTopBar>

      <div className="p-4 sm:p-8">
        <div className="harvest-card p-3 sm:p-4" data-testid="orders-board">
          {/* The lists, with the chosen one's green sliding across to the next. */}
          <div role="tablist" aria-label="Orders" className="flex flex-wrap gap-1.5 rounded-2xl bg-sand/70 p-1.5">
            {tabs.map(({ key, label }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(key)}
                  className={`relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors duration-200 ${
                    active ? "text-white" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {active && (
                    <motion.span layoutId="orders-tab-pill" className="absolute inset-0 rounded-xl bg-forest-700 shadow-sm" transition={SPRING} />
                  )}
                  <span className="relative">{label}</span>
                  <span
                    className={`relative min-w-6 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums ${
                      active ? "bg-white/20 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"
                    }`}
                  >
                    {countFor(key)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 px-1 sm:px-2">
            {loading && <SproutLoader label="Loading your orders..." />}
            {error && <p className="py-6 text-center text-sm text-tomato-700">{error}</p>}

            {!loading && !error && visible.length === 0 && (
              <EmptyState art="basket" title="No orders here yet.">
                Orders in this list will show up here as buyers place them.
              </EmptyState>
            )}

            {!loading && !error && visible.length > 0 && (
              <Stagger key={tab} on="mount" className="space-y-2.5 py-2" stagger={0.05}>
                {visible.map((order) => (
                  <StaggerItem key={order._id} y={14}>
                    <button
                      type="button"
                      onClick={() => navigate(`/farmer/orders/${order._id}`)}
                      className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl bg-white p-3 pl-4 text-left shadow-soft ring-1 ring-black/5 transition-[box-shadow] duration-300 hover:shadow-lift"
                      data-testid="order-row"
                    >
                      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${stripe}`} />
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 text-gray-300 ring-1 ring-black/5">
                        {order.product?.image ? (
                          <img
                            src={`${SERVER_URL}${order.product.image}`}
                            alt={order.productTitle}
                            className="h-full w-full object-cover transition-transform duration-500 ease-harvest group-hover:scale-110"
                          />
                        ) : (
                          <ImageOff className="h-6 w-6" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-gray-900">{order.buyer?.name || "Unknown buyer"}</p>
                        <p className="text-xs text-gray-500">{formatDateTime(order.createdAt)}</p>
                        <p className="truncate text-sm text-gray-600">
                          {amountOf(order.quantity, unitOf(order))} {order.productTitle}
                        </p>
                      </div>
                      <p className="shrink-0 text-right text-xs text-gray-500">
                        Total{" "}
                        <span className="block font-display text-lg font-semibold tabular-nums text-gray-900">₱{order.total}</span>
                      </p>
                      <ChevronRight className="h-5 w-5 shrink-0 text-gray-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-forest-600" />
                    </button>
                  </StaggerItem>
                ))}
              </Stagger>
            )}

            {!loading && !error && visible.length > 0 && (
              <p className="pb-2 pt-1 text-center text-xs text-gray-400">No more products</p>
            )}
          </div>
        </div>
      </div>
    </FarmerLayout>
  );
}
