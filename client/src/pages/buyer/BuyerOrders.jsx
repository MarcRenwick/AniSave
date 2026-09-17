import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Clock, CheckCircle2, XCircle, PackageOpen, CalendarClock, Archive, ArchiveRestore } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import BuyerTopBar from "../../components/buyer/BuyerTopBar";
import CancelOrderModal from "../../components/buyer/CancelOrderModal";
import { getBuyerOrders, cancelOrder, archiveOrder } from "../../services/api";
import usePreserveScroll from "../../hooks/usePreserveScroll";

const filters = [
  { key: "", label: "All" },
  { key: "new", label: "New" },
  { key: "processing", label: "Processing" },
  { key: "ready", label: "Ready" },
  { key: "done", label: "Completed" },
  { key: "preorder", label: "Pre-Order" },
  { key: "cancelled", label: "Cancelled" },
  { key: "archived", label: "Archived" },
];

const statusMeta = {
  new: { label: "New", icon: FileText, color: "text-blue-700 bg-blue-100" },
  preorder: { label: "Pre-Order", icon: CalendarClock, color: "text-amber-700 bg-amber-100" },
  processing: { label: "Processing", icon: PackageOpen, color: "text-indigo-700 bg-indigo-100" },
  ready: { label: "Ready", icon: Clock, color: "text-yellow-700 bg-yellow-100" },
  done: { label: "Completed", icon: CheckCircle2, color: "text-green-700 bg-green-100" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-red-700 bg-red-100" },
};

export default function BuyerOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
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
  const visibleOrders =
    status === "archived"
      ? orders.filter((o) => o.archived)
      : (status ? orders.filter((o) => o.status === status) : orders).filter((o) => !o.archived);

  const handleConfirmCancel = async () => {
    setCancelError("");
    setCancelling(true);
    try {
      const { data } = await cancelOrder(target._id);
      setOrders((prev) => prev.map((o) => (o._id === data._id ? data : o)));
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
      setOrders((prev) => prev.map((o) => (o._id === data._id ? data : o)));
    } catch (err) {
      setArchiveError(err.response?.data?.message || "Could not update this order. Please try again.");
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <BuyerLayout>
      <BuyerTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">My Orders</h1>
        <p className="text-sm text-gray-500">Track your orders and cancel before the farmer accepts</p>
      </BuyerTopBar>

      <div className="p-8">
        <div className="flex flex-wrap gap-3">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                status === key
                  ? "bg-[#2f8f66] text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && <p className="mt-6 text-sm text-gray-500">Loading your orders...</p>}
        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}
        {archiveError && <p className="mt-6 text-sm text-red-600">{archiveError}</p>}

        {!loading && !error && (
          <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Farmer</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibleOrders.map((o) => {
                  const meta = statusMeta[o.status];
                  const Icon = meta.icon;
                  return (
                    <tr
                      key={o._id}
                      onClick={() => navigate(`/buyer/orders/${o._id}`)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{o.productTitle}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {o.farmer?.farmName || o.farmer?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{o.quantity}kg</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">₱{o.total}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(o.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.color}`}
                        >
                          <Icon className="h-3.5 w-3.5" /> {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(o.status === "new" || o.status === "preorder") && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCancelError("");
                              setTarget(o);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            Cancel
                          </button>
                        )}
                        {o.status === "done" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchiveToggle(o, !o.archived);
                            }}
                            disabled={archivingId === o._id}
                            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                          >
                            {o.archived ? (
                              <ArchiveRestore className="h-3.5 w-3.5" />
                            ) : (
                              <Archive className="h-3.5 w-3.5" />
                            )}
                            {o.archived ? "Unarchive" : "Archive"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {visibleOrders.length === 0 && (
              <p className="p-6 text-center text-sm text-gray-400">
                {status === "archived" ? "No archived orders." : "No orders found."}
              </p>
            )}
          </div>
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
