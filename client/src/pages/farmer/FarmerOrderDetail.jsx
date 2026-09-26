import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, ImageOff, MapPin, Phone, Star, Undo2, XCircle } from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import OrderTimeline from "../../components/orders/OrderTimeline";
import { getOrder, updateOrderStatus, undoOrderStatus, SERVER_URL } from "../../services/api";
import {
  BUYER_ORDER_STATUS,
  FARMER_STEPS,
  FARMER_STATUS_TITLE,
  formatDateTime,
  orderNumber,
  previousStatusOf,
} from "../../utils/orderStatus";

// The farmer's side of an order, inside the farmer portal: who the customer
// is, what they ordered, and - beside it - how far along it is and the next
// thing to do. The buyer's page (pages/buyer/OrderDetail.jsx) is laid out
// differently on purpose, so the two are never mistaken for each other.
export default function FarmerOrderDetail() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const busy = submitting || undoing;

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
      setOrder((prev) => ({ ...prev, ...data }));
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not update this order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Puts an accidental Accept, Prepare or Ready back one step - on the server
  // too, so the buyer sees the order where it really is.
  const handleUndo = async () => {
    setActionError("");
    setUndoing(true);
    try {
      const { data } = await undoOrderStatus(order._id);
      // The stage that was undone loses its timestamp, and a merge would keep
      // the old one, so the order that comes back is taken whole.
      setOrder((prev) => ({ ...data, myRating: prev.myRating }));
    } catch (err) {
      setActionError(err.response?.data?.message || "Could not undo that. Please try again.");
    } finally {
      setUndoing(false);
    }
  };

  const undoTo = order ? previousStatusOf(order) : null;
  const buyerName = order?.buyer?.name || "Unknown buyer";
  const status = order ? BUYER_ORDER_STATUS[order.status] : null;
  const StatusIcon = status?.icon;

  return (
    <FarmerLayout>
      <FarmerTopBar>
        <Link
          to="/farmer/orders"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#2f8f66] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Orders
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">{order ? `Order from ${buyerName}` : "Order"}</h1>
        {order && (
          <p className="text-sm text-gray-500">
            Order {orderNumber(order)} · Placed {formatDateTime(order.createdAt)}
          </p>
        )}
      </FarmerTopBar>

      <div className="p-4 sm:p-8">
        {loading && <p className="text-sm text-gray-600">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && order && (
          <div className="grid items-start gap-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-3">
              <section className="rounded-2xl bg-white p-5 shadow-sm" data-testid="order-customer">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-gray-900">Customer</h2>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">Buyer</span>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-lg font-semibold text-[#2f8f66]">
                    {buyerName.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">{buyerName}</p>
                    <p className="text-sm text-gray-500">Picks this order up at your farm</p>
                  </div>
                </div>
                <dl className="mt-4 grid gap-3 border-t border-gray-100 pt-4 text-sm sm:grid-cols-2">
                  <div className="flex items-start gap-2.5">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    <div>
                      <dt className="text-xs text-gray-500">Phone</dt>
                      <dd className="font-medium text-gray-900">{order.buyer?.phone || "Not given"}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                    <div>
                      <dt className="text-xs text-gray-500">Location</dt>
                      <dd className="font-medium text-gray-900">{order.buyer?.location || "Address not set"}</dd>
                    </div>
                  </div>
                </dl>
              </section>

              <section className="rounded-2xl bg-white p-5 shadow-sm" data-testid="order-items">
                <h2 className="font-semibold text-gray-900">Order items</h2>
                <div className="mt-4 flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 text-gray-300">
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
                    <p className="truncate font-semibold text-gray-900">{order.productTitle}</p>
                    <p className="text-sm text-gray-500">
                      Quantity: {order.quantity}
                      {order.pricePerKilo ? ` · ₱${order.pricePerKilo} per kg` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                  <span className="text-sm text-gray-500">Order total</span>
                  <span className="text-lg font-bold text-gray-900">₱{order.total}</span>
                </div>
              </section>

              {order.status === "done" && order.myRating && (
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                  <h2 className="font-semibold text-gray-900">Buyer&apos;s rating</h2>
                  <div className="mt-2 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        key={value}
                        className={`h-5 w-5 ${
                          value <= order.myRating.stars ? "fill-amber-400 text-amber-400" : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  {order.myRating.comment && <p className="mt-2 text-sm text-gray-600">{order.myRating.comment}</p>}
                </section>
              )}
            </div>

            <section className="rounded-2xl bg-white p-5 shadow-sm lg:col-span-2" data-testid="order-progress">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-gray-900">Order progress</h2>
                {status && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}
                    data-testid="order-status"
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {FARMER_STATUS_TITLE[order.status]}
                  </span>
                )}
              </div>

              <div className="mt-5">
                {order.status === "cancelled" ? (
                  <p className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    <XCircle className="h-4 w-4 shrink-0" />
                    This order was cancelled. There&apos;s nothing left to do on it.
                  </p>
                ) : (
                  <OrderTimeline steps={FARMER_STEPS} order={order} />
                )}
              </div>

              {actionError && (
                <div className="mt-5 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{actionError}</div>
              )}

              <div className="mt-5 space-y-3 border-t border-gray-100 pt-5 empty:hidden">
                {(order.status === "new" || order.status === "preorder") && (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleTransition("cancelled")}
                      disabled={busy}
                      className="flex-1 rounded-md border-2 border-red-600 py-3 text-sm font-semibold text-red-600 transition duration-150 hover:bg-red-50 active:scale-[0.98] disabled:opacity-60"
                    >
                      Decline Order
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTransition("processing")}
                      disabled={busy}
                      className="flex-1 rounded-md bg-[#2f8f66] py-3 text-sm font-semibold text-white transition duration-150 hover:bg-[#267a56] active:scale-[0.98] disabled:opacity-60"
                    >
                      Accept Order
                    </button>
                  </div>
                )}

                {order.status === "processing" && (
                  <button
                    type="button"
                    onClick={() => handleTransition("ready")}
                    disabled={busy}
                    className="w-full rounded-md bg-[#2f8f66] py-3 text-sm font-semibold text-white transition duration-150 hover:bg-[#267a56] active:scale-[0.98] disabled:opacity-60"
                  >
                    {submitting ? "Updating..." : "Mark as ready to pick up"}
                  </button>
                )}

                {order.status === "ready" && (
                  <button
                    type="button"
                    onClick={() => handleTransition("done")}
                    disabled={busy}
                    className="w-full rounded-md bg-[#2f8f66] py-3 text-sm font-semibold text-white transition duration-150 hover:bg-[#267a56] active:scale-[0.98] disabled:opacity-60"
                  >
                    {submitting ? "Updating..." : "Mark as done order"}
                  </button>
                )}

                {order.status === "done" && (
                  <div className="flex items-center justify-center gap-2 rounded-md border-2 border-gray-300 bg-white py-3 text-sm font-semibold text-gray-500">
                    <Check className="h-4 w-4" />
                    Done order
                  </div>
                )}

                {/* The way back from a mis-tap: one step, to where the order
                    was a moment ago. It stays available until the order moves on. */}
                {undoTo && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-600 transition duration-150 hover:bg-gray-50 active:scale-[0.98] disabled:opacity-60"
                  >
                    <Undo2 className="h-4 w-4" />
                    {undoing ? "Undoing..." : `Undo - back to ${FARMER_STATUS_TITLE[undoTo]}`}
                  </button>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </FarmerLayout>
  );
}
