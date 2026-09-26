import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Archive,
  ArchiveRestore,
  CalendarClock,
  CheckCircle2,
  Hourglass,
  ImageOff,
  MapPin,
  PackageCheck,
  PackageOpen,
  Star,
  Store,
  XCircle,
} from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import BuyerTopBar from "../../components/buyer/BuyerTopBar";
import CancelOrderModal from "../../components/buyer/CancelOrderModal";
import RateProductModal from "../../components/buyer/RateProductModal";
import OrderStatusTracker from "../../components/orders/OrderStatusTracker";
import MessageFarmerButton from "../../components/chat/MessageFarmerButton";
import { getOrder, cancelOrder, archiveOrder, SERVER_URL } from "../../services/api";
import { BUYER_STEPS, formatDateTime, orderNumber } from "../../utils/orderStatus";

// What the banner at the top says for each status, in the buyer's words.
const BANNERS = {
  new: {
    icon: Hourglass,
    tone: "bg-gradient-to-r from-[#2f8f66] to-[#46a97d] text-white",
    title: "Waiting for the farmer",
    text: (farm) => `${farm} will accept your order soon. You can still cancel it until then.`,
  },
  preorder: {
    icon: CalendarClock,
    tone: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
    title: "Pre-order placed",
    text: (farm) => `This is a pre-order. ${farm} accepts it once the produce is available.`,
  },
  processing: {
    icon: PackageOpen,
    tone: "bg-gradient-to-r from-[#2f8f66] to-[#46a97d] text-white",
    title: "Your order is being prepared",
    text: (farm) => `${farm} accepted your order and is getting it ready.`,
  },
  ready: {
    icon: PackageCheck,
    tone: "bg-gradient-to-r from-emerald-600 to-[#2f8f66] text-white",
    title: "Ready for pickup!",
    text: (farm) => `Head to ${farm} to collect your order.`,
  },
  done: {
    icon: CheckCircle2,
    tone: "bg-green-50 text-[#1f5c42] ring-1 ring-green-200",
    title: "Order completed",
    text: () => "You picked this order up. Thanks for buying local!",
  },
  cancelled: {
    icon: XCircle,
    tone: "bg-red-50 text-red-800 ring-1 ring-red-200",
    title: "Order cancelled",
    text: () => "This order was cancelled.",
  },
};

// The buyer's side of an order, inside the marketplace: a banner saying where
// it stands, its journey from order to pickup, and where to collect it. The
// farmer's page (pages/farmer/FarmerOrderDetail.jsx) is laid out differently
// on purpose, so the two are never mistaken for each other.
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

  const canCancel = order && (order.status === "new" || order.status === "preorder");
  const farmName = order?.farmer?.farmName || order?.farmer?.name || "The farmer";
  const banner = order ? BANNERS[order.status] : null;
  const BannerIcon = banner?.icon;

  return (
    <BuyerLayout>
      <BuyerTopBar>
        <Link
          to="/buyer/orders"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#2f8f66] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          My Orders
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">My Order</h1>
        {order && (
          <p className="text-sm text-gray-500">
            Order {orderNumber(order)} · Placed {formatDateTime(order.createdAt)}
          </p>
        )}
      </BuyerTopBar>

      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-8">
        {loading && <p className="text-sm text-gray-600">Loading...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && order && (
          <>
            {banner && (
              <div className={`flex items-center gap-4 rounded-2xl p-5 shadow-sm ${banner.tone}`} data-testid="order-banner">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
                  <BannerIcon className="h-6 w-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{banner.title}</p>
                  <p className="text-sm opacity-90">{banner.text(farmName)}</p>
                </div>
              </div>
            )}

            {order.status !== "cancelled" && <OrderStatusTracker steps={BUYER_STEPS} order={order} />}

            <section className="rounded-2xl bg-white p-5 shadow-sm" data-testid="order-pickup">
              <h2 className="font-semibold text-gray-900">Pick up from</h2>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 text-[#2f8f66]">
                  <Store className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">{farmName}</p>
                  <p className="flex items-center gap-1.5 text-sm text-gray-500">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {order.farmer?.location || "Address not set"}
                  </p>
                  {order.farmer?.phone && <p className="text-sm text-gray-500">Phone: {order.farmer.phone}</p>}
                </div>
                {order.farmer?._id && (
                  <Link
                    to={`/buyer/farmers/${order.farmer._id}`}
                    className="shrink-0 rounded-md border border-[#2f8f66] px-3 py-1.5 text-xs font-semibold text-[#2f8f66] transition hover:bg-green-50"
                  >
                    View Shop
                  </Link>
                )}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm" data-testid="order-item">
              <h2 className="font-semibold text-gray-900">Your item</h2>
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
                <span className="text-sm text-gray-500">Total to pay at pickup</span>
                <span className="text-lg font-bold text-gray-900">₱{order.total}</span>
              </div>
            </section>

            {order.status === "done" && order.myRating && (
              <section className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-gray-900">Your rating</h2>
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
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-600 transition duration-150 hover:bg-gray-50 active:scale-[0.98] disabled:opacity-60"
                >
                  {order.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
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
        <RateProductModal order={order} onClose={() => setShowRate(false)} onSubmitted={handleRatingSubmitted} />
      )}
    </BuyerLayout>
  );
}
