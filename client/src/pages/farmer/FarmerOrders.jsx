import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Package, Clock, CheckCircle2, ChevronRight, ImageOff } from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import { getFarmerOrders, SERVER_URL } from "../../services/api";

const columnMeta = {
  new: {
    label: "New",
    description: "Orders waiting for your decision",
    icon: FileText,
    accent: "bg-blue-100 text-blue-700",
    badge: "bg-blue-500",
  },
  accepted: {
    label: "Accepted",
    description: "Orders you're preparing",
    icon: Package,
    accent: "bg-indigo-100 text-indigo-700",
    badge: "bg-indigo-500",
  },
  ready: {
    label: "Ready",
    description: "Prepared and ready for pickup",
    icon: Clock,
    accent: "bg-yellow-100 text-yellow-700",
    badge: "bg-yellow-500",
  },
  done: {
    label: "Done",
    description: "Successfully completed orders",
    icon: CheckCircle2,
    accent: "bg-green-100 text-green-700",
    badge: "bg-green-500",
  },
};

export default function FarmerOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getFarmerOrders()
      .then(({ data }) => setOrders(data))
      .catch(() => setError("Could not load your orders. Is the server running?"))
      .finally(() => setLoading(false));
  }, []);

  const byStatus = {
    new: orders.filter((o) => o.status === "new"),
    accepted: orders.filter((o) => o.status === "accepted"),
    ready: orders.filter((o) => o.status === "ready"),
    done: orders.filter((o) => o.status === "done"),
  };

  return (
    <FarmerLayout>
      <FarmerTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500">Manage and track your customer orders</p>
      </FarmerTopBar>

      <div className="p-8">
        {loading && <p className="text-sm text-gray-500">Loading your orders...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <>
            <div className="grid grid-cols-4 gap-6">
              {Object.entries(columnMeta).map(([key, { label, description, icon: Icon, accent }]) => (
                <div key={key} className={`flex items-center justify-between rounded-xl p-5 ${accent}`}>
                  <div>
                    <div className="flex items-center gap-2 font-semibold">
                      <Icon className="h-5 w-5" />
                      {label}
                    </div>
                    <p className="mt-1 text-xs">{description}</p>
                    <p className="mt-3 text-2xl font-bold">{byStatus[key].length} orders</p>
                  </div>
                  <ChevronRight className="h-5 w-5 opacity-60" />
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-4 gap-6">
              {Object.entries(columnMeta).map(([key, { label, badge }]) => (
                <div key={key} className="overflow-hidden rounded-xl bg-white shadow-sm">
                  <div className={`flex items-center justify-between px-4 py-2 text-sm font-semibold text-white ${badge}`}>
                    <span>{label}</span>
                    <span>{byStatus[key].length} orders</span>
                  </div>
                  <div className="space-y-3 p-4">
                    {byStatus[key].length === 0 && (
                      <p className="py-4 text-center text-sm text-gray-400">No orders here yet</p>
                    )}
                    {byStatus[key].map((order) => (
                      <button
                        key={order._id}
                        type="button"
                        onClick={() => navigate(`/farmer/orders/${order._id}`)}
                        className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left transition hover:border-[#2f8f66] hover:shadow-sm"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-50 text-gray-300">
                          {order.product?.image ? (
                            <img
                              src={`${SERVER_URL}${order.product.image}`}
                              alt={order.productTitle}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageOff className="h-5 w-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">{order.buyer?.name}</p>
                          <p className="truncate text-xs text-gray-500">
                            {order.quantity}kg {order.productTitle}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(order.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-gray-900">₱{order.total}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </FarmerLayout>
  );
}
