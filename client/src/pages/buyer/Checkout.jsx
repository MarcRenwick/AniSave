import { useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ImageOff } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { createOrder, SERVER_URL } from "../../services/api";
import useScrollReveal from "../../hooks/useScrollReveal";

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
  useScrollReveal(rootRef, { windowScroll: true });

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#eaf6ec]">
        <div className="flex items-center gap-4 bg-[#2f8f66] px-6 py-5 text-white">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-6 w-6" />
          </button>
          <h1 className="flex-1 pr-7 text-center text-xl font-semibold">Checkout</h1>
        </div>
        <div className="mx-auto max-w-2xl p-8 text-center">
          <p className="text-base text-gray-600">There&apos;s nothing to check out.</p>
          <Link to="/buyer/home" className="mt-3 inline-block text-base font-medium text-[#2f8f66] underline">
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
    <div ref={rootRef} className="min-h-screen bg-[#eaf6ec]">
      <div className="flex items-center gap-4 bg-[#2f8f66] px-6 py-5 text-white">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 pr-7 text-center text-xl font-semibold">
          {isPreOrder ? "Pre-Order" : "Checkout"}
        </h1>
      </div>

      <div className="mx-auto max-w-2xl space-y-5 p-5 sm:p-8">
        {isPreOrder && (
          <div className="rounded-xl bg-amber-50 px-5 py-4 text-sm text-amber-800">
            This is a pre-order listing. Placing it sends the order to the farmer, who accepts
            it once the produce is available - you&apos;ll see it move along as they do.
          </div>
        )}

        {groups.map((group) => (
          <div key={group.key} className="space-y-4">
            <div className="rounded-xl border-2 border-dashed border-[#2f8f66]/40 bg-white p-5">
              <p className="text-sm font-semibold uppercase text-[#2f8f66]">Pickup Address</p>
              <p className="mt-1 text-base font-medium text-gray-900">{group.location}</p>
            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4">
                <p className="text-base font-semibold text-gray-900">{group.farmerName}</p>
              </div>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 pt-4 text-xs font-medium uppercase text-gray-400">
                <span>Product</span>
                <span>Price/Kilo</span>
                <span>Qty</span>
                <span>Subtotal</span>
              </div>
              {group.items.map((item) => (
                <div
                  key={item.productId}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-t border-gray-100 px-5 py-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-50 text-gray-300">
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
                  <span className="text-base text-gray-600">₱{item.price}</span>
                  <span className="text-base text-gray-600">{item.quantity}</span>
                  <span className="text-base font-semibold text-gray-900">
                    ₱{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between rounded-xl bg-white px-5 py-4 shadow-sm">
          <span className="text-base font-medium text-gray-700">Payment Method</span>
          <span className="text-base font-semibold text-gray-900">Cash on Pick-up</span>
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="text-base font-medium text-gray-700">Total Payment:</span>
          <span className="text-2xl font-bold text-red-600">₱{total}</span>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-4 py-3 text-base text-red-600">{error}</div>
        )}

        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={submitting}
          className="w-full rounded-md bg-red-600 py-4 text-base font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {submitting ? "Placing Order..." : isPreOrder ? "Place Pre-Order" : "Place Order"}
        </button>
      </div>
    </div>
  );
}
