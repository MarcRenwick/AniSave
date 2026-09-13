import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, ImageOff } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import BuyerTopBar from "../../components/buyer/BuyerTopBar";
import CartCheckoutModal from "../../components/buyer/CartCheckoutModal";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { createOrder, SERVER_URL } from "../../services/api";

export default function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, updateQuantity, removeFromCart, removeItems } = useCart();
  const [selected, setSelected] = useState(() => new Set(items.map((i) => i.productId)));
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const toggleSelected = (productId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) =>
      prev.size === items.length ? new Set() : new Set(items.map((i) => i.productId))
    );
  };

  const handleRemove = (productId) => {
    removeFromCart(productId);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };

  const selectedItems = items.filter((i) => selected.has(i.productId));
  const selectedTotal = selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleCheckout = async () => {
    setError("");
    setCheckingOut(true);
    const placedIds = [];
    try {
      for (const item of selectedItems) {
        await createOrder(item.productId, item.quantity);
        placedIds.push(item.productId);
      }
      removeItems(placedIds);
      setShowCheckoutModal(false);
      navigate("/buyer/marketplace");
    } catch (err) {
      if (placedIds.length > 0) removeItems(placedIds);
      setError(err.response?.data?.message || "Could not complete checkout. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <BuyerLayout>
      <BuyerTopBar>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Marketplace
        </button>
      </BuyerTopBar>

      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>

        {items.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">Your cart is empty.</p>
            <Link
              to="/buyer/marketplace"
              className="mt-4 inline-block rounded-md bg-[#2f8f66] px-5 py-2 text-sm font-semibold text-white hover:bg-[#267a56]"
            >
              Browse the Marketplace
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.size === items.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 accent-[#2f8f66]"
                />
                <span className="text-sm text-gray-600">
                  Select all ({selected.size}/{items.length})
                </span>
              </div>

              {items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-4 border-b border-gray-100 p-4 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(item.productId)}
                    onChange={() => toggleSelected(item.productId)}
                    className="h-4 w-4 shrink-0 accent-[#2f8f66]"
                  />

                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50 text-gray-300">
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

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-500">₱{item.price} per kilo</p>
                    {item.farmerName && <p className="text-xs text-gray-400">{item.farmerName}</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="h-7 w-7 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="h-7 w-7 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>

                  <p className="w-20 shrink-0 text-right font-semibold text-gray-900">
                    ₱{item.price * item.quantity}
                  </p>

                  <button
                    type="button"
                    onClick={() => handleRemove(item.productId)}
                    className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
              <span className="text-sm text-gray-500">
                Total ({selectedItems.length} item{selectedItems.length === 1 ? "" : "s"} selected)
              </span>
              <span className="text-xl font-bold text-gray-900">₱{selectedTotal}</span>
            </div>

            {user?.role === "buyer" ? (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setShowCheckoutModal(true);
                }}
                disabled={selectedItems.length === 0}
                className="w-full rounded-md bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {selectedItems.length === 0
                  ? "Select items to checkout"
                  : `Checkout (${selectedItems.length})`}
              </button>
            ) : (
              <Link
                to="/login"
                className="block w-full rounded-md bg-red-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Log in as a buyer to checkout
              </Link>
            )}
          </div>
        )}
      </div>

      {showCheckoutModal && (
        <CartCheckoutModal
          items={selectedItems}
          total={selectedTotal}
          onClose={() => setShowCheckoutModal(false)}
          onConfirm={handleCheckout}
          confirming={checkingOut}
          error={error}
        />
      )}
    </BuyerLayout>
  );
}
