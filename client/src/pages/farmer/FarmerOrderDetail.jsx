import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Check,
  ImageOff,
  MapPin,
  Star,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import { getOrder, updateOrderStatus, SERVER_URL } from "../../services/api";

const categoryLabels = { vegetable: "Vegetables", fruit: "Fruits" };

const steps = [
  { key: "new", label: "New", getDate: (o) => o.createdAt },
  { key: "accepted", label: "Accepted", getDate: (o) => o.acceptedAt },
  { key: "ready", label: "Ready for Pickup", getDate: (o) => o.readyAt },
  { key: "done", label: "Picked Up", getDate: (o) => o.doneAt },
];

function formatDateTime(date) {
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function FarmerOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getOrder(id)
      .then(({ data }) => setOrder(data))
      .catch(() => setError("Could not load this order."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleTransition = async (status) => {
    setActionError("");
    setSubmitting(true);
    try {
      const { data } = await updateOrderStatus(order._id, status);
      setOrder((prev) => ({
        ...prev,
        status: data.status,
        acceptedAt: data.acceptedAt,
        readyAt: data.readyAt,
        doneAt: data.doneAt,
        cancelledAt: data.cancelledAt,
      }));
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not update this order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FarmerLayout>
      <FarmerTopBar>
        <button
          type="button"
          onClick={() => navigate("/farmer/orders")}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </button>
      </FarmerTopBar>

      <div className="p-8">
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && order && order.status === "new" && (
          <div className="mx-auto max-w-xl space-y-4">
            <div className="flex items-start gap-3 rounded-xl bg-[#2f8f66] p-4 text-white">
              <Bell className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">You have received a new order from a customer!</p>
                <p className="text-sm text-white/90">Please review the order details below.</p>
              </div>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-[#2f8f66]">
                {categoryLabels[order.product?.category] || "Product"}
              </span>

              <div className="mt-3 flex items-center gap-4">
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
                <div>
                  <p className="text-lg font-semibold text-gray-900">{order.productTitle}</p>
                  <p className="text-sm text-gray-500">Kilos: {order.quantity}</p>
                  <p className="text-sm text-gray-500">Price: ₱{order.pricePerKilo}/kg</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-sm">
                <div>
                  <p className="font-medium text-gray-900">{order.buyer?.name}</p>
                  <p className="flex items-center gap-1 text-gray-500">
                    <MapPin className="h-3.5 w-3.5" />
                    {order.buyer?.location || order.product?.location || "Location not set"}
                  </p>
                </div>
                <p className="text-xs text-gray-400">{formatDateTime(order.createdAt)}</p>
              </div>

              <div className="mt-4 rounded-lg bg-green-50 px-4 py-3">
                <span className="text-lg font-bold text-[#2f8f66]">₱{order.total}</span>
              </div>

              {actionError && (
                <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                  {actionError}
                </div>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => handleTransition("cancelled")}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md border-2 border-red-600 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" />
                  Decline Order
                </button>
                <button
                  type="button"
                  onClick={() => handleTransition("accepted")}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#2f8f66] py-2.5 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Accept Order
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && order && order.status === "cancelled" && (
          <div className="mx-auto max-w-xl rounded-xl bg-white p-6 text-center shadow-sm">
            <p className="font-semibold text-red-600">This order was declined.</p>
          </div>
        )}

        {!loading && !error && order && !["new", "cancelled"].includes(order.status) && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="border-b border-gray-100 px-6 py-4">
                  <p className="font-semibold text-gray-900">🛒 Order Items</p>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50 text-gray-300">
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
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{order.productTitle}</p>
                      <p className="text-sm text-gray-500">Kilos: {order.quantity}</p>
                      <p className="text-sm text-gray-500">Price: ₱{order.pricePerKilo}</p>
                    </div>
                    <p className="font-semibold text-gray-900">₱{order.total}</p>
                  </div>

                  <div className="mt-6 space-y-2 border-t border-gray-100 pt-4 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>₱{order.total}</span>
                    </div>
                    <div className="flex justify-between rounded-md bg-green-50 px-3 py-2 font-semibold text-[#2f8f66]">
                      <span>Total</span>
                      <span>₱{order.total}</span>
                    </div>
                  </div>
                </div>
              </div>

              {order.status === "done" && order.myRating && (
                <div className="rounded-xl bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-gray-400">Buyer&apos;s Rating</p>
                  <div className="mt-1 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        key={value}
                        className={`h-5 w-5 ${
                          value <= order.myRating.stars ? "fill-amber-400 text-amber-400" : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  {order.myRating.comment && (
                    <p className="mt-2 text-sm text-gray-600">{order.myRating.comment}</p>
                  )}
                </div>
              )}

              {actionError && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{actionError}</div>
              )}

              {order.status === "accepted" && (
                <button
                  type="button"
                  onClick={() => handleTransition("ready")}
                  disabled={submitting}
                  className="w-full rounded-md bg-[#2f8f66] py-3 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60"
                >
                  {submitting ? "Updating..." : "Mark as Ready for Pickup"}
                </button>
              )}
              {order.status === "ready" && (
                <button
                  type="button"
                  onClick={() => handleTransition("done")}
                  disabled={submitting}
                  className="w-full rounded-md bg-[#2f8f66] py-3 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60"
                >
                  {submitting ? "Updating..." : "Mark as Done"}
                </button>
              )}
              {order.status === "done" && (
                <div className="flex items-center justify-center gap-2 rounded-md bg-green-50 py-3 text-sm font-semibold text-[#2f8f66]">
                  <CheckCircle2 className="h-4 w-4" />
                  Order Completed
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="mb-3 text-sm font-semibold text-gray-700">Order Status</p>
                {steps.map((step, i) => {
                  const date = step.getDate(order);
                  const done = Boolean(date);
                  return (
                    <div key={step.key} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                            done ? "bg-[#2f8f66] text-white" : "bg-gray-200 text-gray-400"
                          }`}
                        >
                          {done && <Check className="h-3.5 w-3.5" />}
                        </div>
                        {i < steps.length - 1 && (
                          <div className={`w-0.5 flex-1 ${done ? "bg-[#2f8f66]" : "bg-gray-200"}`} />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className={`text-sm font-medium ${done ? "text-gray-900" : "text-gray-400"}`}>
                          {step.label}
                        </p>
                        {done && <p className="text-xs text-gray-400">{formatDateTime(date)}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase text-gray-400">Pickup Information</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-700">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  {order.product?.location || "Address not set"}
                </p>
                <p className="mt-3 text-xs text-gray-400">
                  Let the buyer know once this order is ready or completed.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </FarmerLayout>
  );
}
