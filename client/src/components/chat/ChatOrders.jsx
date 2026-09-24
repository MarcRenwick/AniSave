import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Package } from "lucide-react";
import { SERVER_URL, getConversationOrders } from "../../services/api";
import { BUYER_ORDER_STATUS } from "../../utils/orderStatus";

const orderDate = (date) =>
  new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

function OrderRow({ order, caption }) {
  const meta = BUYER_ORDER_STATUS[order.status] || BUYER_ORDER_STATUS.new;
  const Icon = meta.icon;
  return (
    <Link
      to={`/buyer/orders/${order._id}`}
      data-order={order._id}
      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-green-50"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-gray-300 ring-1 ring-gray-200">
        {order.image ? (
          <img src={`${SERVER_URL}${order.image}`} alt="" className="h-full w-full object-cover" />
        ) : (
          <Package className="h-5 w-5" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-gray-900">{order.productTitle}</span>
        <span className="block truncate text-xs text-gray-500">
          {caption && `${caption} · `}
          {order.quantity}kg · ₱{order.total} · {orderDate(order.createdAt)}
        </span>
      </span>
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${meta.color}`}>
        <Icon className="h-3.5 w-3.5" /> {meta.label}
      </span>
    </Link>
  );
}

// Like the order card in a Shopee chat: a buyer sees what they have ordered
// from this farmer without leaving the conversation - the newest order, with
// the rest one press away. Each one opens that order's page.
export default function ChatOrders({ conversationId, reloadKey }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getConversationOrders(conversationId)
      .then(({ data: result }) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [conversationId, reloadKey]);

  if (!data || data.orders.length === 0) return null;
  const [latest, ...older] = data.orders;

  return (
    <div className="border-b border-gray-200 bg-green-50/40 px-3 py-2" data-testid="chat-orders">
      <div className="flex items-center gap-2">
        <OrderRow order={latest} caption={data.total > 1 ? "Your latest order" : "Your order"} />
        {data.total > 1 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-[#2f8f66] hover:bg-green-50"
          >
            {open ? "Hide" : `All orders (${data.total})`}
            <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      {open && (
        <div className="mt-1 max-h-56 space-y-0.5 overflow-y-auto border-t border-gray-200 pt-1">
          {older.map((order) => (
            <OrderRow key={order._id} order={order} />
          ))}
          {data.total > data.orders.length && (
            <Link to="/buyer/orders" className="block px-2 py-2 text-center text-xs font-semibold text-[#2f8f66] hover:underline">
              See all {data.total} in My Orders
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
