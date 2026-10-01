import { useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { ImageOff, Loader2, MapPin } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { createOrder, SERVER_URL } from "../../services/api";
import useScrollReveal from "../../hooks/useScrollReveal";
import useHarvestTheme from "../../theme/useHarvestTheme";
import { PhotoBand } from "../../components/buyer/BuyerVisuals";
import { AuthAlert } from "../../components/auth/AuthParts";
import { BUYER_PHOTOS } from "../../utils/buyerPhotos";
import { EASE } from "../../theme/harvest";

function groupByFarmer(items) {
  const groups = new Map();
  items.forEach((item) => {
    const key = item.farmerId || item.farmerName || "unknown";
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        farmerName: item.farmerName || "Unknown Farmer",
        location: item.location || "Address not set",
        items: [],
      });
    }
    groups.get(key).items.push(item);
  });
  return [...groups.values()];
}

export default function Checkout() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { removeItems } = useCart();

  const items = routerLocation.state?.items || [];
  const fromCart = Boolean(routerLocation.state?.fromCart);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const rootRef = useRef(null);
  useScrollReveal(rootRef);
  useHarvestTheme();

  if (items.length === 0) {
    return (
      <div className="buyer-field harvest-grain min-h-screen bg-cream">
        <PhotoBand photo={BUYER_PHOTOS.marketPrices} eyebrow="Almost yours" title="Checkout" onBack={() => navigate(-1)} testId="checkout-header" />
        <div className="mx-auto max-w-2xl p-8 text-center">
          <p className="text-base text-gray-600">There&apos;s nothing to check out.</p>
          <Link to="/buyer/home" className="mt-3 inline-block text-base font-medium text-brand underline">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const groups = groupByFarmer(items);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const isPreOrder = items.some((i) => i.preorder);

  const handlePlaceOrder = async () => {
    setError("");
    setSubmitting(true);
    const placedIds = [];
    const createdOrders = [];
    try {
      for (const item of items) {
        const { data: order } = await createOrder(item.productId, item.quantity);
        placedIds.push(item.productId);
        createdOrders.push(order);
      }
      if (fromCart) removeItems(placedIds);

      if (createdOrders.length === 1) {
        navigate(`/buyer/orders/${createdOrders[0]._id}`, { replace: true });
      } else {
        navigate("/buyer/orders", { replace: true });
      }
    } catch (err) {
      if (fromCart && placedIds.length > 0) removeItems(placedIds);
      setError(err.response?.data?.message || "Could not place the order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div ref={rootRef} className="buyer-field harvest-grain min-h-screen bg-cream">
      <PhotoBand
        photo={isPreOrder ? BUYER_PHOTOS.riceHarvest : BUYER_PHOTOS.marketPrices}
        eyebrow={isPreOrder ? "Reserve the next harvest" : "Almost yours"}
        title={isPreOrder ? "Pre-Order" : "Checkout"}
        onBack={() => navigate(-1)}
        testId="checkout-header"
      />

      <div className="mx-auto max-w-2xl space-y-5 p-5 sm:p-8">
        {isPreOrder && (
          <div className="rounded-2xl bg-gold-50 px-5 py-4 text-sm leading-relaxed text-soil-700 ring-1 ring-gold-100">
            This is a pre-order listing. Placing it sends the order to the farmer, who accepts
            it once the produce is available - you&apos;ll see it move along as they do.
          </div>
        )}

        {groups.map((group, g) => (
          <motion.div
            key={group.key}
            className="space-y-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 * g, ease: EASE }}
          >
            <div className="flex items-start gap-3 rounded-[1.5rem] border-2 border-dashed border-soil-300 bg-paper p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest-50 text-brand ring-1 ring-forest-100">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-clay-500">Pickup Address</p>
                <p className="mt-1 text-base font-medium text-gray-900">{group.location}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] bg-paper shadow-soft ring-1 ring-gray-200">
              <div className="border-b border-gray-200 px-5 py-4">
                <p className="font-display text-lg font-semibold text-gray-900">{group.farmerName}</p>
              </div>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 pt-4 text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
                <span>Product</span>
                <span>Price/Kilo</span>
                <span>Qty</span>
                <span>Subtotal</span>
              </div>
              {group.items.map((item) => (
                <div
                  key={item.productId}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-t border-gray-200 px-5 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sand text-gray-400">
                      {item.image ? (
                        <img
                          src={`${SERVER_URL}${item.image}`}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageOff className="h-6 w-6" />
                      )}
                    </div>
                    <span className="truncate text-base text-gray-900">{item.title}</span>
                  </div>
                  <span className="text-base text-gray-600">
                    {item.originalPrice > item.price && (
                      <span className="mr-1.5 text-gray-400 line-through">₱{item.originalPrice}</span>
                    )}
                    ₱{item.price}
                  </span>
                  <span className="text-base text-gray-600">{item.quantity}</span>
                  <span className="text-base font-bold text-forest-700">
                    ₱{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        <div className="flex items-center justify-between rounded-[1.5rem] bg-paper px-5 py-4 shadow-soft ring-1 ring-gray-200">
          <span className="text-base font-medium text-gray-700">Payment Method</span>
          <span className="text-base font-semibold text-gray-900">Cash on Pick-up</span>
        </div>

        <div className="flex items-center justify-between rounded-[1.5rem] bg-[linear-gradient(110deg,#0f2418,#1f5130)] px-5 py-4 text-cream shadow-lift">
          <span className="text-base font-medium text-cream/85">Total Payment:</span>
          <span className="font-display text-3xl font-semibold text-gold-300" data-testid="checkout-total">₱{total}</span>
        </div>

        <AuthAlert>{error}</AuthAlert>

        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={submitting}
          aria-busy={submitting || undefined}
          className={`flex w-full items-center justify-center gap-2 rounded-full py-4 text-base font-semibold shadow-[0_14px_30px_-14px_rgb(31_81_48/0.9)] transition-colors focus-visible:outline-none focus-visible:ring-4 disabled:opacity-70 ${
            isPreOrder
              ? "bg-gold-400 text-night hover:bg-gold-300 focus-visible:ring-gold-300/50"
              : "bg-brand text-white hover:bg-brand-hover focus-visible:ring-brand/30"
          }`}
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {submitting ? "Placing Order..." : isPreOrder ? "Place Pre-Order" : "Place Order"}
        </button>
      </div>
    </div>
  );
}
