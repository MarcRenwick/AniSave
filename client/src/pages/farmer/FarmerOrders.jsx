import { useEffect, useState } from "react";
import { FileText, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import { getFarmerOrders, updateOrderStatus } from "../../services/api";

const columnMeta = {
  new: {
    label: "New",
    description: "Orders waiting to be processed",
    icon: FileText,
    accent: "bg-blue-100 text-blue-700",
    badge: "bg-blue-500",
    nextStatus: "ready",
    actionLabel: "Mark Ready",
  },
  ready: {
    label: "Ready",
    description: "Orders are prepared and ready",
    icon: Clock,
    accent: "bg-yellow-100 text-yellow-700",
    badge: "bg-yellow-500",
    nextStatus: "done",
    actionLabel: "Mark Done",
  },
  done: {
    label: "Done",
    description: "Successfully completed orders",
    icon: CheckCircle2,
    accent: "bg-green-100 text-green-700",
    badge: "bg-green-500",
    nextStatus: null,
    actionLabel: null,
  },
};

export default function FarmerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getFarmerOrders()
      .then(({ data }) => setOrders(data))
      .catch(() => setError("Could not load your orders. Is the server running?"))
      .finally(() => setLoading(false));
  }, []);

  const handleAdvance = async (order) => {
    const nextStatus = columnMeta[order.status].nextStatus;
    if (!nextStatus) return;
    const { data } = await updateOrderStatus(order._id, nextStatus);
    setOrders((prev) => prev.map((o) => (o._id === data._id ? data : o)));
  };

  const byStatus = {
    new: orders.filter((o) => o.status === "new"),
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
            <div className="grid grid-cols-3 gap-6">
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

            <div className="mt-6 grid grid-cols-3 gap-6">
              {Object.entries(columnMeta).map(([key, { label, badge, actionLabel }]) => (
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
                      <div key={order._id} className="rounded-lg border border-gray-200 p-3">
                        <p className="truncate text-sm font-medium text-gray-900">{order.buyer?.name}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}{" "}
                          ·{" "}
                          {new Date(order.createdAt).toLocaleTimeString(undefined, {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="text-sm text-gray-600">
                          {order.quantity}kg {order.productTitle}
                        </p>
                        <p className="text-sm font-semibold text-gray-900">Total: ₱{order.total}</p>
                        {actionLabel && (
                          <button
                            type="button"
                            onClick={() => handleAdvance(order)}
                            className="mt-2 w-full rounded-md bg-[#2f8f66] py-1.5 text-xs font-semibold text-white hover:bg-[#267a56]"
                          >
                            {actionLabel}
                          </button>
                        )}
                      </div>
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
