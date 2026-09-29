import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, ArchiveRestore, Search, Store, X } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import CancelOrderModal from "../../components/buyer/CancelOrderModal";
import MessageFarmerButton from "../../components/chat/MessageFarmerButton";
import { getBuyerOrders, cancelOrder, archiveOrder, SERVER_URL } from "../../services/api";
import usePreserveScroll from "../../hooks/usePreserveScroll";
import { BUYER_ORDER_STATUS as statusMeta } from "../../utils/orderStatus";
import { amountOf, perUnit, unitOf } from "../../utils/units";

// Pre-Order sits right after New: both are orders the farmer hasn't answered
// yet, so they belong next to each other at the front.
const filters = [
  { key: "", label: "All" },
  { key: "new", label: "New" },
  { key: "preorder", label: "Pre-Order" },
  { key: "processing", label: "Processing" },
  { key: "ready", label: "Ready" },
  { key: "done", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "archived", label: "Archived" },
];

// Where each order stands, in words, beside its status.
const STATUS_NOTE = {
  new: "Waiting for farmer to accept",
  preorder: "Pre-order waiting for the farmer",
  processing: "The farmer is preparing your order",
  ready: "Ready for pick-up",
  done: "Order received by buyer",
  cancelled: "This order was cancelled",
};
const STATUS_TONE = {
  new: "text-blue-700",
  preorder: "text-amber-700",
  processing: "text-indigo-700",
  ready: "text-yellow-700",
  done: "text-[#2f8f66]",
  cancelled: "text-red-600",
};

// A product with no photo gets its first letter on a soft colour of its own.
const LETTER_TILES = [
  "bg-red-50 text-red-700",
  "bg-green-50 text-green-700",
  "bg-amber-50 text-amber-700",
  "bg-pink-50 text-pink-700",
  "bg-sky-50 text-sky-700",
  "bg-lime-50 text-lime-700",
];
const tileFor = (title = "") => LETTER_TILES[[...title].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % LETTER_TILES.length];

const orderDate = (o) =>
  new Date(o.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const peso = (amount) => `₱${Number(amount).toLocaleString()}`;
const farmNameOf = (o) => o.farmer?.farmName || o.farmer?.name || "Farm";

function Thumb({ order }) {
  const image = order.product?.image;
  if (image) {
    return (
      <img
        src={`${SERVER_URL}${image}`}
        alt=""
        className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-gray-100"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg text-xl font-bold ${tileFor(order.productTitle)}`}
    >
      {(order.productTitle || "?").charAt(0).toUpperCase()}
    </span>
  );
}

// One order as a card: the farm and ways to reach it on top, the product in
// the middle - which opens the order - and anything the buyer can do with it
// underneath.
function OrderCard({ order, actions }) {
  const farmerId = order.farmer?._id;
  return (
    <li
      data-order={order._id}
      className="overflow-hidden rounded-xl border border-gray-200/70 bg-white shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-100 bg-gray-50/60 px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Store className="h-4 w-4 shrink-0 text-gray-500" />
          <span className="truncate text-sm font-semibold text-gray-900">{farmNameOf(order)}</span>
          {farmerId && (
            <>
              <MessageFarmerButton
                farmerId={farmerId}
                label="Chat"
                className="inline-flex items-center gap-1 rounded-md bg-[#2f8f66] px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60"
              />
              <Link
                to={`/buyer/farmers/${farmerId}`}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <Store className="h-3.5 w-3.5" />
                View Farm
              </Link>
            </>
          )}
        </div>
        <p className="flex items-center gap-2 text-xs" data-testid="order-status">
          <span className="text-gray-500">{STATUS_NOTE[order.status]}</span>
          <span className="h-3 w-px bg-gray-300" aria-hidden="true" />
          <span className={`font-bold uppercase tracking-wide ${STATUS_TONE[order.status]}`}>
            {statusMeta[order.status]?.label}
          </span>
        </p>
      </div>

      <Link
        to={`/buyer/orders/${order._id}`}
        className="flex items-center gap-4 px-4 py-4 transition hover:bg-gray-50"
        aria-label={`Open your order of ${order.productTitle}`}
      >
        <Thumb order={order} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">{order.productTitle}</p>
          <p className="text-xs text-gray-500">Unit price: {peso(order.pricePerKilo)} {perUnit(unitOf(order))}</p>
          <p className="text-xs text-gray-500">x{amountOf(order.quantity, unitOf(order))}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-[#2f8f66]">{peso(order.total)}</p>
          <p className="text-xs text-gray-500">Ordered {orderDate(order)}</p>
        </div>
      </Link>

      {actions && <div className="flex justify-end gap-2 border-t border-gray-100 px-4 py-2.5">{actions}</div>}
    </li>
  );
}

export default function BuyerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [archiveError, setArchiveError] = useState("");
  const [archivingId, setArchivingId] = useState(null);
  usePreserveScroll(status);

  useEffect(() => {
    getBuyerOrders()
      .then(({ data }) => setOrders(data))
      .catch(() => setError("Could not load your orders. Is the server running?"))
      .finally(() => setLoading(false));
  }, []);

  // Archived orders are tucked away everywhere except their own tab, the
  // same way an inbox hides archived mail from every other view.
  const inTab = (key) =>
    key === "archived"
      ? orders.filter((o) => o.archived)
      : (key ? orders.filter((o) => o.status === key) : orders).filter((o) => !o.archived);

  // The search looks at the farm, the product and the order's own id.
  const needle = query.trim().toLowerCase();
  const visibleOrders = inTab(status).filter(
    (o) =>
      !needle ||
      farmNameOf(o).toLowerCase().includes(needle) ||
      (o.productTitle || "").toLowerCase().includes(needle) ||
      o._id.toLowerCase().includes(needle)
  );

  const handleConfirmCancel = async () => {
    setCancelError("");
    setCancelling(true);
    try {
      const { data } = await cancelOrder(target._id);
      setOrders((prev) => prev.map((o) => (o._id === data._id ? { ...o, ...data, product: o.product, farmer: o.farmer } : o)));
      setTarget(null);
    } catch (err) {
      setCancelError(err.response?.data?.message || "Could not cancel this order. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const handleArchiveToggle = async (order, archived) => {
    setArchiveError("");
    setArchivingId(order._id);
    try {
      const { data } = await archiveOrder(order._id, archived);
      setOrders((prev) => prev.map((o) => (o._id === data._id ? { ...o, ...data, product: o.product, farmer: o.farmer } : o)));
    } catch (err) {
      setArchiveError(err.response?.data?.message || "Could not update this order. Please try again.");
    } finally {
      setArchivingId(null);
    }
  };

  // What can be done with an order from the list.
  const actionsFor = (o) => {
    if (o.status === "new" || o.status === "preorder") {
      return (
        <button
          type="button"
          onClick={() => {
            setCancelError("");
            setTarget(o);
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
        >
          Cancel
        </button>
      );
    }
    if (o.status === "done") {
      return (
        <button
          type="button"
          onClick={() => handleArchiveToggle(o, !o.archived)}
          disabled={archivingId === o._id}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {o.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
          {o.archived ? "Unarchive" : "Archive"}
        </button>
      );
    }
    return null;
  };

  return (
    <BuyerLayout>
      <div className="mx-auto max-w-5xl p-4 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <p className="text-sm text-gray-500">Track your orders and cancel before the farmer accepts</p>

        <div className="mt-5 rounded-xl border border-gray-200/70 bg-white shadow-sm">
          <div role="tablist" aria-label="Show orders" className="flex overflow-x-auto border-b border-gray-100">
            {filters.map(({ key, label }) => {
              const count = key ? inTab(key).length : 0;
              const chosen = status === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={chosen}
                  onClick={() => setStatus(key)}
                  className={`min-w-fit flex-1 whitespace-nowrap border-b-2 px-4 py-3 text-sm transition ${
                    chosen
                      ? "border-[#2f8f66] font-semibold text-[#2f8f66]"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {label}
                  {count > 0 && ` (${count})`}
                </button>
              );
            })}
          </div>
          <div className="p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by farm name, order ID or product"
                aria-label="Search your orders"
                className="w-full rounded-lg border border-transparent bg-gray-50 py-2.5 pl-9 pr-9 text-sm focus:border-[#2f8f66] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear the search"
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {loading && <p className="mt-6 text-sm text-gray-500">Loading your orders...</p>}
        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
        {archiveError && <p className="mt-6 text-sm text-red-600">{archiveError}</p>}

        {!loading && !error && (
          <>
            <ul className="mt-4 space-y-4" data-testid="order-cards">
              {visibleOrders.map((o) => (
                <OrderCard key={o._id} order={o} actions={actionsFor(o)} />
              ))}
            </ul>
            {visibleOrders.length === 0 && (
              <p className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
                {needle
                  ? `No orders match "${query.trim()}".`
                  : status === "archived"
                    ? "No archived orders."
                    : "No orders found."}
              </p>
            )}
          </>
        )}
      </div>

      {target && (
        <CancelOrderModal
          order={target}
          onClose={() => setTarget(null)}
          onConfirm={handleConfirmCancel}
          cancelling={cancelling}
          error={cancelError}
        />
      )}
    </BuyerLayout>
  );
}
