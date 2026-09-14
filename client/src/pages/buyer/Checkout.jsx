import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ImageOff } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { createOrder, SERVER_URL } from "../../services/api";

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

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#eaf6ec]">
        <div className="flex items-center gap-3 bg-[#2f8f66] px-4 py-4 text-white">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 pr-6 text-center text-lg font-semibold">Checkout</h1>
        </div>
        <div className="mx-auto max-w-xl p-6 text-center">
          <p className="text-sm text-gray-600">There&apos;s nothing to check out.</p>
          <Link to="/buyer/marketplace" className="mt-3 inline-block text-sm font-medium text-[#2f8f66] underline">
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const groups = groupByFarmer(items);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

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
    <div className="min-h-screen bg-[#eaf6ec]">
      <div className="flex items-center gap-3 bg-[#2f8f66] px-4 py-4 text-white">
        <button type="button" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 pr-6 text-center text-lg font-semibold">Checkout</h1>
      </div>

      <div className="mx-auto max-w-xl space-y-4 p-4 sm:p-6">
        {groups.map((group) => (
          <div key={group.key} className="space-y-3">
            <div className="rounded-xl border-2 border-dashed border-[#2f8f66]/40 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-[#2f8f66]">Pickup Address</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{group.location}</p>
            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">{group.farmerName}</p>
              </div>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-4 pt-3 text-[11px] font-medium uppercase text-gray-400">
                <span>Product</span>
                <span>Price/Kilo</span>
                <span>Qty</span>
                <span>Subtotal</span>
              </div>
              {group.items.map((item) => (
                <div
                  key={item.productId}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-t border-gray-100 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-50 text-gray-300">
                      {item.image ? (
                        <img
                          src={`${SERVER_URL}${item.image}`}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageOff className="h-5 w-5" />
                      )}
                    </div>
                    <span className="truncate text-sm text-gray-900">{item.title}</span>
                  </div>
                  <span className="text-sm text-gray-600">₱{item.price}</span>
                  <span className="text-sm text-gray-600">{item.quantity}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    ₱{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
          <span className="text-sm font-medium text-gray-700">Payment Method</span>
          <span className="text-sm font-semibold text-gray-900">Cash on Pick-up</span>
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-medium text-gray-700">Total Payment:</span>
          <span className="text-xl font-bold text-red-600">₱{total}</span>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
        )}

        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={submitting}
          className="w-full rounded-md bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {submitting ? "Placing Order..." : "Place Order"}
        </button>
      </div>
    </div>
  );
}
