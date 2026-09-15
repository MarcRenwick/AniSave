import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, ImageOff, MapPin, Phone, Star, User as UserIcon } from "lucide-react";
import OrderStatusTracker from "../../components/orders/OrderStatusTracker";
import { getOrder, updateOrderStatus, SERVER_URL } from "../../services/api";
import useScrollReveal from "../../hooks/useScrollReveal";
import { FARMER_STEPS, FARMER_STATUS_TITLE } from "../../utils/orderStatus";

export default function FarmerOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const rootRef = useRef(null);
  useScrollReveal(rootRef, { windowScroll: true });

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

  const title = order ? FARMER_STATUS_TITLE[order.status] : "Order";

  return (
    <div ref={rootRef} className="min-h-screen bg-[#eaf6ec]">
      <div className="flex items-center gap-3 bg-[#2f8f66] px-4 py-4 text-white">
        <button type="button" onClick={() => navigate("/farmer/orders")} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 pr-6 text-center text-lg font-semibold">{title}</h1>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
        {loading && <p className="text-sm text-gray-600">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && order && (
          <>
            {order.status === "cancelled" ? (
              <div className="rounded-xl bg-white p-6 text-center shadow-sm">
                <p className="font-semibold text-red-600">This order was declined.</p>
              </div>
            ) : (
              <OrderStatusTracker steps={FARMER_STEPS} order={order} />
            )}

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#2f8f66]">Pickup Information</p>

              <div className="mt-3 flex items-start gap-2.5 text-sm">
                <UserIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div>
                  <p className="font-semibold text-gray-900">
                    {order.buyer?.name || "Unknown buyer"}
                    {order.buyer?.phone && (
                      <span className="font-normal text-gray-600"> ({order.buyer.phone})</span>
                    )}
                  </p>
                  <p className="flex items-center gap-1.5 text-gray-500">
                    <MapPin className="h-3.5 w-3.5" />
                    {order.buyer?.location || "Address not set"}
                  </p>
                </div>
              </div>

              {order.buyer?.phone && (
                <a
                  href={`tel:${order.buyer.phone}`}
                  className="mt-3 inline-flex items-center gap-2 rounded-md border-2 border-[#2f8f66] px-4 py-1.5 text-sm font-semibold text-[#2f8f66] transition duration-150 hover:bg-green-50 active:scale-95"
                >
                  <Phone className="h-4 w-4" />
                  Call Buyer
                </a>
              )}

              <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50 text-gray-300">
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
                  <p className="truncate font-medium text-gray-900">{order.productTitle}</p>
                  <p className="text-sm text-gray-500">Quantity: {order.quantity}</p>
                </div>
                <p className="shrink-0 font-semibold text-gray-900">₱{order.total}</p>
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
              <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{actionError}</div>
            )}

            {(order.status === "new" || order.status === "preorder") && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleTransition("cancelled")}
                  disabled={submitting}
                  className="flex-1 rounded-md border-2 border-red-600 py-3 text-sm font-semibold text-red-600 transition duration-150 hover:bg-red-50 active:scale-[0.98] disabled:opacity-60"
                >
                  Decline Order
                </button>
                <button
                  type="button"
                  onClick={() => handleTransition("processing")}
                  disabled={submitting}
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
                disabled={submitting}
                className="w-full rounded-md bg-[#2f8f66] py-3 text-sm font-semibold text-white transition duration-150 hover:bg-[#267a56] active:scale-[0.98] disabled:opacity-60"
              >
                {submitting ? "Updating..." : "Mark as ready to pick up"}
              </button>
            )}

            {order.status === "ready" && (
              <button
                type="button"
                onClick={() => handleTransition("done")}
                disabled={submitting}
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
          </>
        )}
      </div>
    </div>
  );
}
