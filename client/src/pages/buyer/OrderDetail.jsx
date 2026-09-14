import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Check, ImageOff, Star } from "lucide-react";
import CancelOrderModal from "../../components/buyer/CancelOrderModal";
import RateProductModal from "../../components/buyer/RateProductModal";
import { getOrder, cancelOrder, SERVER_URL } from "../../services/api";

const steps = [
  { key: "new", label: "Order Placed", getDate: (o) => o.createdAt },
  { key: "accepted", label: "Order Accepted", getDate: (o) => o.acceptedAt },
  { key: "ready", label: "Ready for Pickup", getDate: (o) => o.readyAt },
  { key: "done", label: "Completed", getDate: (o) => o.doneAt },
];

const statusTitle = {
  new: "Order Placed",
  accepted: "Accepted",
  ready: "Ready for Pickup",
  done: "Completed",
  cancelled: "Cancelled",
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [showRate, setShowRate] = useState(false);

  useEffect(() => {
    getOrder(id)
      .then(({ data }) => setOrder(data))
      .catch(() => setError("Could not load this order."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleConfirmCancel = async () => {
    setCancelError("");
    setCancelling(true);
    try {
      const { data } = await cancelOrder(order._id);
      setOrder(data);
      setShowCancel(false);
    } catch (err) {
      setCancelError(err.response?.data?.message || "Could not cancel this order. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const handleRatingSubmitted = (rating) => {
    setOrder((prev) => ({ ...prev, myRating: rating }));
    setShowRate(false);
  };

  const title = order ? statusTitle[order.status] : "Order";
  const doneCount = order ? steps.filter((s) => s.getDate(order)).length : 0;

  return (
    <div className="min-h-screen bg-[#eaf6ec]">
      <div className="flex items-center gap-3 bg-[#2f8f66] px-4 py-4 text-white">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 pr-6 text-center text-lg font-semibold">{title}</h1>
      </div>

      <div className="mx-auto max-w-xl space-y-4 p-4 sm:p-6">
        {loading && <p className="text-sm text-gray-600">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && order && (
          <>
            {order.status === "cancelled" ? (
              <div className="rounded-xl bg-white p-6 text-center shadow-sm">
                <p className="font-semibold text-red-600">This order was cancelled.</p>
              </div>
            ) : (
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="mb-4 text-sm font-semibold text-gray-700">Order Status</p>
                <div className="flex items-start">
                  {steps.map((step, i) => {
                    const isDone = i < doneCount;
                    const beforeGreen = i > 0 && i - 1 < doneCount;
                    const afterGreen = i < steps.length - 1 && i < doneCount;
                    const date = step.getDate(order);
                    return (
                      <div key={step.key} className="flex flex-1 flex-col items-center text-center">
                        <div className="flex w-full items-center">
                          <div
                            className={`h-0.5 flex-1 ${i === 0 ? "invisible" : beforeGreen ? "bg-[#2f8f66]" : "bg-gray-200"}`}
                          />
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                              isDone ? "bg-[#2f8f66] text-white" : "bg-gray-200 text-gray-400"
                            }`}
                          >
                            {isDone ? <Check className="h-4 w-4" /> : i + 1}
                          </div>
                          <div
                            className={`h-0.5 flex-1 ${i === steps.length - 1 ? "invisible" : afterGreen ? "bg-[#2f8f66]" : "bg-gray-200"}`}
                          />
                        </div>
                        <p className="mt-2 text-[10px] leading-tight text-gray-500">{step.label}</p>
                        {isDone && date && (
                          <p className="text-[9px] leading-tight text-gray-400">
                            {new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-gray-400">Pickup Information</p>
              <p className="mt-1 font-semibold text-gray-900">
                {order.farmer?.farmName || order.farmer?.name || "Unknown farmer"}
              </p>
              <p className="text-sm text-gray-500">{order.farmer?.location || "Address not set"}</p>

              <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-3">
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
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{order.productTitle}</p>
                  <p className="text-sm text-gray-500">Quantity: {order.quantity}kg</p>
                </div>
                <p className="shrink-0 font-semibold text-gray-900">₱{order.total}</p>
              </div>
            </div>

            {order.status === "done" && (
              <div className="rounded-xl bg-white p-4 shadow-sm">
                {order.myRating ? (
                  <>
                    <p className="text-xs font-semibold uppercase text-gray-400">Your Rating</p>
                    <div className="mt-1 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Star
                          key={value}
                          className={`h-5 w-5 ${
                            value <= order.myRating.stars
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    {order.myRating.comment && (
                      <p className="mt-2 text-sm text-gray-600">{order.myRating.comment}</p>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowRate(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-[#2f8f66] py-2.5 text-sm font-semibold text-[#2f8f66] transition hover:bg-green-50"
                  >
                    <Star className="h-4 w-4" />
                    Rate this Product
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {order.status === "new" && (
                <button
                  type="button"
                  onClick={() => setShowCancel(true)}
                  className="flex-1 rounded-md bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Cancel Order
                </button>
              )}
              {order.farmer?._id && (
                <Link
                  to={`/buyer/farmers/${order.farmer._id}`}
                  className="flex-1 rounded-md bg-[#2f8f66] py-3 text-center text-sm font-semibold text-white transition hover:bg-[#267a56]"
                >
                  View Farmer Profile
                </Link>
              )}
            </div>
          </>
        )}
      </div>

      {showCancel && order && (
        <CancelOrderModal
          order={order}
          onClose={() => setShowCancel(false)}
          onConfirm={handleConfirmCancel}
          cancelling={cancelling}
          error={cancelError}
        />
      )}

      {showRate && order && (
        <RateProductModal
          order={order}
          onClose={() => setShowRate(false)}
          onSubmitted={handleRatingSubmitted}
        />
      )}
    </div>
  );
}
