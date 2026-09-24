import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Archive, ArchiveRestore, ImageOff, MapPin, Star, User as UserIcon } from "lucide-react";
import CancelOrderModal from "../../components/buyer/CancelOrderModal";
import RateProductModal from "../../components/buyer/RateProductModal";
import OrderStatusTracker from "../../components/orders/OrderStatusTracker";
import MessageFarmerButton from "../../components/chat/MessageFarmerButton";
import { getOrder, cancelOrder, archiveOrder, SERVER_URL } from "../../services/api";
import useScrollReveal from "../../hooks/useScrollReveal";
import { BUYER_STEPS, BUYER_STATUS_TITLE } from "../../utils/orderStatus";

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
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const rootRef = useRef(null);
  useScrollReveal(rootRef);

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
      setOrder((prev) => ({ ...prev, ...data }));
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

  const handleArchiveToggle = async () => {
    setArchiveError("");
    setArchiving(true);
    try {
      const { data } = await archiveOrder(order._id, !order.archived);
      setOrder((prev) => ({ ...prev, ...data }));
    } catch (err) {
      setArchiveError(err.response?.data?.message || "Could not update this order. Please try again.");
    } finally {
      setArchiving(false);
    }
  };

  const title = order ? BUYER_STATUS_TITLE[order.status] : "Order";
  const canCancel = order && (order.status === "new" || order.status === "preorder");

  return (
    <div ref={rootRef} className="min-h-screen bg-[#eaf6ec]">
      <div className="flex items-center gap-3 bg-[#2f8f66] px-4 py-4 text-white">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back">
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
                <p className="font-semibold text-red-600">This order was cancelled.</p>
              </div>
            ) : (
              <OrderStatusTracker steps={BUYER_STEPS} order={order} />
            )}

            {order.status === "preorder" && (
              <div className="rounded-xl bg-amber-50 px-5 py-4 text-sm text-amber-800">
                This is a pre-order. The farmer accepts it once the produce is available.
              </div>
            )}

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#2f8f66]">Pickup Information</p>

              <div className="mt-3 flex items-start gap-2.5 text-sm">
                <UserIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div>
                  <p className="font-semibold text-gray-900">
                    {order.farmer?.farmName || order.farmer?.name || "Unknown farmer"}
                    {order.farmer?.phone && (
                      <span className="font-normal text-gray-600"> ({order.farmer.phone})</span>
                    )}
                  </p>
                  <p className="flex items-center gap-1.5 text-gray-500">
                    <MapPin className="h-3.5 w-3.5" />
                    {order.farmer?.location || "Address not set"}
                  </p>
                </div>
              </div>

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
                <p className="text-xs font-semibold uppercase text-gray-400">Your Rating</p>
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

            {order.status === "done" ? (
              <>
                {archiveError && (
                  <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{archiveError}</div>
                )}
                <div className="flex gap-3">
                  {order.product?._id && (
                    <button
                      type="button"
                      onClick={() => navigate(`/buyer/products/${order.product._id}`)}
                      className="flex-1 rounded-md border-2 border-[#2f8f66] bg-white py-3 text-sm font-semibold text-[#2f8f66] transition duration-150 hover:bg-green-50 active:scale-[0.98]"
                    >
                      Buy Again
                    </button>
                  )}
                  {!order.myRating && (
                    <button
                      type="button"
                      onClick={() => setShowRate(true)}
                      className="flex-1 rounded-md border-2 border-[#2f8f66] bg-white py-3 text-sm font-semibold text-[#2f8f66] transition duration-150 hover:bg-green-50 active:scale-[0.98]"
                    >
                      To Rate
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleArchiveToggle}
                  disabled={archiving}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 py-2.5 text-sm font-semibold text-gray-600 transition duration-150 hover:bg-gray-50 active:scale-[0.98] disabled:opacity-60"
                >
                  {order.archived ? (
                    <ArchiveRestore className="h-4 w-4" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                  {archiving ? "Updating..." : order.archived ? "Unarchive Order" : "Archive Order"}
                </button>
              </>
            ) : (
              order.status !== "cancelled" && (
                <div className="flex gap-3">
                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => setShowCancel(true)}
                      className="flex-1 rounded-md bg-red-600 py-3 text-sm font-semibold text-white transition duration-150 hover:bg-red-700 active:scale-[0.98]"
                    >
                      Cancel Order
                    </button>
                  )}
                  {order.farmer?._id && (
                    <div className="flex flex-1 flex-col">
                      <MessageFarmerButton
                        farmerId={order.farmer._id}
                        label="Message Now"
                        className="flex w-full items-center justify-center gap-2 rounded-md bg-[#2f8f66] py-3 text-sm font-semibold text-white transition duration-150 hover:bg-[#267a56] active:scale-[0.98] disabled:opacity-60"
                      />
                    </div>
                  )}
                </div>
              )
            )}

            <Link
              to="/buyer/home"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 py-2.5 text-sm font-semibold text-gray-600 transition duration-150 hover:bg-gray-50 active:scale-[0.98]"
            >
              Back to Home
            </Link>
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
