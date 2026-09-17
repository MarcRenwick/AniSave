import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ImageOff } from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import { getFarmerOrders, SERVER_URL } from "../../services/api";
import { formatDateTime } from "../../utils/orderStatus";
import usePreserveScroll from "../../hooks/usePreserveScroll";

const tabs = [
  { key: "new", label: "New" },
  { key: "processing", label: "Processing" },
  { key: "ready", label: "Ready" },
  { key: "done", label: "Completed" },
  { key: "preorder", label: "Pre-Order" },
  { key: "cancelled", label: "Cancelled" },
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

  const countFor = (key) => orders.filter((o) => o.status === key).length;
  const visible = orders.filter((o) => o.status === tab);

  return (
    <FarmerLayout>
      <FarmerTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500">Manage and track your customer orders</p>
      </FarmerTopBar>

      <div className="p-8">
        <div className="overflow-hidden rounded-2xl bg-[#2f8f66] p-5">
          <div className="flex flex-wrap gap-2">
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition duration-150 active:scale-95 ${
                  tab === key ? "bg-white text-[#1f5c42]" : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                {label}({countFor(key)})
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {loading && <p className="text-sm text-white/80">Loading your orders...</p>}
            {error && <p className="text-sm text-red-100">{error}</p>}

            {!loading && !error && visible.length === 0 && (
              <p className="py-8 text-center text-sm text-white/80">No orders here yet.</p>
            )}

            {!loading &&
              !error &&
              visible.map((order) => (
                <button
                  key={order._id}
                  type="button"
                  onClick={() => navigate(`/farmer/orders/${order._id}`)}
                  className="flex w-full items-center gap-4 rounded-xl bg-white p-3 text-left transition duration-150 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50 text-gray-300">
                    {order.product?.image ? (
                      <img
                        src={`${SERVER_URL}${order.product.image}`}
                        alt={order.productTitle}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageOff className="h-6 w-6" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900">
                      {order.buyer?.name || "Unknown buyer"}
                    </p>
                    <p className="text-xs text-gray-500">{formatDateTime(order.createdAt)}</p>
                    <p className="truncate text-sm text-gray-600">
                      {order.quantity}kg {order.productTitle}
                    </p>
                    <p className="text-sm font-semibold text-gray-900">Total ₱{order.total}</p>
                  </div>
                </button>
              ))}

            {!loading && !error && visible.length > 0 && (
              <p className="pt-2 text-center text-sm text-white/80">No more products</p>
            )}
          </div>
        </div>
      </div>
    </FarmerLayout>
  );
}
