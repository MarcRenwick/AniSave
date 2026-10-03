import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import {
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
import CancelOrderModal from "../../components/buyer/CancelOrderModal";
import RateProductModal from "../../components/buyer/RateProductModal";
import OrderStatusTracker from "../../components/orders/OrderStatusTracker";
import MessageFarmerButton from "../../components/chat/MessageFarmerButton";
import { getOrder, cancelOrder, archiveOrder, SERVER_URL } from "../../services/api";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import { BlockSkeleton } from "../../components/buyer/BuyerVisuals";
import { categoryPhoto } from "../../utils/categoryPhotos";
import { EASE } from "../../theme/harvest";
import { BUYER_STEPS } from "../../utils/orderStatus";
import { amountOf, unitOf, unitWord } from "../../utils/units";

// What the banner at the top says for each status, in the buyer's words.
const BANNERS = {
  new: {
    icon: Hourglass,
    tone: "bg-[linear-gradient(110deg,#173d24,#2e7d32)] text-cream",
    title: "Waiting for the farmer",
    text: (farm) => `${farm} will accept your order soon. You can still cancel it until then.`,
  },
  preorder: {
    icon: CalendarClock,
    tone: "bg-gold-50 text-soil-700 ring-1 ring-gold-200",
    title: "Pre-order placed",
    text: (farm) => `This is a pre-order. ${farm} accepts it once the produce is available.`,
  },
  processing: {
    icon: PackageOpen,
    tone: "bg-[linear-gradient(110deg,#173d24,#2e7d32)] text-cream",
    title: "Your order is being prepared",
    text: (farm) => `${farm} accepted your order and is getting it ready.`,
  },
  ready: {
    icon: PackageCheck,
    tone: "bg-[linear-gradient(110deg,#e8a33d,#f4cd6a)] text-night",
    title: "Ready for pickup!",
    text: (farm) => `Head to ${farm} to collect your order.`,
  },
  done: {
    icon: CheckCircle2,
    tone: "bg-forest-50 text-forest-800 ring-1 ring-forest-200",
    title: "Order completed",
    text: () => "You picked this order up. Thanks for buying local!",
  },
  cancelled: {
    icon: XCircle,
    tone: "bg-tomato-50 text-tomato-700 ring-1 ring-tomato-100",
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

  // The tracker moves the moment the farmer moves the order on.
  useLiveRefresh(["order:changed"], () => getOrder(id).then(({ data }) => setOrder(data)), {
    when: (change) => change.orderId === id,
  });

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
      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-8">
        {loading && (
          <div className="space-y-4">
            <BlockSkeleton className="h-24" />
            <BlockSkeleton className="h-28" />
            <BlockSkeleton className="h-40" />
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && order && (
          <>
            {banner && (
              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.55, ease: EASE }}
                className={`flex items-center gap-4 rounded-[1.5rem] p-5 shadow-soft ${banner.tone}`}
                data-testid="order-banner"
              >
                <motion.span
                  initial={{ scale: 0.6, rotate: -12 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 16, delay: 0.15 }}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30"
                >
                  <BannerIcon className="h-6 w-6" />
                </motion.span>
                <div className="min-w-0">
                  <p className="font-display text-xl font-semibold">{banner.title}</p>
                  <p className="text-sm opacity-90">{banner.text(farmName)}</p>
                </div>
              </motion.div>
            )}

            {order.status !== "cancelled" && <OrderStatusTracker steps={BUYER_STEPS} order={order} />}

            <section className="rounded-[1.5rem] bg-paper p-5 shadow-soft ring-1 ring-gray-200" data-testid="order-pickup">
              <h2 className="font-display text-lg font-semibold text-gray-900">Pick up from</h2>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-forest-50 text-brand ring-1 ring-forest-100">
                  <Store className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">{farmName}</p>
                  <p className="flex items-center gap-1.5 text-sm text-gray-500">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-clay-500" />
                    {order.farmer?.location || "Address not set"}
                  </p>
                  {order.farmer?.phone && <p className="text-sm text-gray-500">Phone: {order.farmer.phone}</p>}
                </div>
                {order.farmer?._id && (
                  <Link
                    to={`/buyer/farmers/${order.farmer._id}`}
                    className="shrink-0 rounded-full border border-brand px-3.5 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-forest-50"
                  >
                    View Shop
                  </Link>
                )}
              </div>
            </section>

            <section className="rounded-[1.5rem] bg-paper p-5 shadow-soft ring-1 ring-gray-200" data-testid="order-item">
              <h2 className="font-display text-lg font-semibold text-gray-900">Your item</h2>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-sand text-gray-400">
                  {order.product?.image ? (
                    <img
                      src={`${SERVER_URL}${order.product.image}`}
                      alt={order.productTitle}
                      className="h-full w-full object-cover"
                    />
                  ) : order.product?.category ? (
                    <img src={categoryPhoto(order.product.category).small} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg font-semibold text-gray-900">{order.productTitle}</p>
                  <p className="text-sm text-gray-500">
                    Quantity: {amountOf(order.quantity, unitOf(order))}
                    {order.pricePerKilo ? ` · ₱${order.pricePerKilo} per ${unitWord(unitOf(order))}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                <span className="text-sm text-gray-500">Total to pay at pickup</span>
                <span className="font-display text-2xl font-semibold text-forest-700">₱{order.total}</span>
              </div>
            </section>

            {order.status === "done" && order.myRating && (
              <section className="rounded-[1.5rem] bg-paper p-5 shadow-soft ring-1 ring-gray-200">
                <h2 className="font-display text-lg font-semibold text-gray-900">Your rating</h2>
                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      className={`h-5 w-5 ${
                        value <= order.myRating.stars ? "fill-gold-400 text-gold-500" : "text-gray-300"
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
                  <div role="alert" className="rounded-xl bg-tomato-50 px-4 py-3 text-sm text-tomato-700 ring-1 ring-tomato-100">{archiveError}</div>
                )}
                <div className="flex gap-3">
                  {order.product?._id && (
                    <button
                      type="button"
                      onClick={() => navigate(`/buyer/products/${order.product._id}`)}
                      className="flex-1 rounded-full border-2 border-brand bg-paper py-3 text-sm font-semibold text-brand transition-colors duration-150 hover:bg-forest-50 active:scale-[0.98]"
                    >
                      Buy Again
                    </button>
                  )}
                  {!order.myRating && (
                    <button
                      type="button"
                      onClick={() => setShowRate(true)}
                      className="flex-1 rounded-full border-2 border-brand bg-paper py-3 text-sm font-semibold text-brand transition-colors duration-150 hover:bg-forest-50 active:scale-[0.98]"
                    >
                      To Rate
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleArchiveToggle}
                  disabled={archiving}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-paper py-2.5 text-sm font-semibold text-gray-600 transition-colors duration-150 hover:border-brand hover:text-brand active:scale-[0.98] disabled:opacity-60"
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
                      className="flex-1 rounded-full bg-tomato-600 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-tomato-700 active:scale-[0.98]"
                    >
                      Cancel Order
                    </button>
                  )}
                  {order.farmer?._id && (
                    <div className="flex flex-1 flex-col">
                      <MessageFarmerButton
                        farmerId={order.farmer._id}
                        label="Message Now"
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgb(31_81_48/0.8)] transition-colors duration-150 hover:bg-brand-hover active:scale-[0.98] disabled:opacity-60"
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
