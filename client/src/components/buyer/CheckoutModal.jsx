import { useState } from "react";
import { ImageOff } from "lucide-react";
import Modal from "../Modal";
import { createOrder, SERVER_URL } from "../../services/api";

export default function CheckoutModal({ product, onClose, onSuccess }) {
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const clamp = (value) => Math.min(product.stock, Math.max(1, value));
  const adjust = (delta) => setQuantity((q) => clamp(q + delta));
  const handleTyped = (e) => {
    const value = Number(e.target.value);
    setQuantity(!e.target.value || Number.isNaN(value) ? 1 : clamp(Math.floor(value)));
  };

  const total = product.price * quantity;

  const handleCheckout = async () => {
    setError("");
    setSubmitting(true);
    try {
      const { data: order } = await createOrder(product._id, quantity);
      onSuccess(order, quantity);
    } catch (err) {
      setError(err.response?.data?.message || "Could not place the order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Checkout" onClose={onClose}>
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50 text-gray-300">
          {product.image ? (
            <img
              src={`${SERVER_URL}${product.image}`}
              alt={product.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageOff className="h-6 w-6" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{product.title}</p>
          <p className="text-sm text-gray-500">₱{product.price} per kilo</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => adjust(-1)}
          className="h-10 w-10 rounded-md border border-gray-300 text-lg font-semibold text-gray-600 hover:bg-gray-50"
        >
          −
        </button>
        <input
          type="number"
          min="1"
          max={product.stock}
          value={quantity}
          onChange={handleTyped}
          className="w-16 rounded-md border border-gray-300 py-1.5 text-center text-xl font-semibold text-gray-900 focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
        />
        <button
          type="button"
          onClick={() => adjust(1)}
          className="h-10 w-10 rounded-md border border-gray-300 text-lg font-semibold text-gray-600 hover:bg-gray-50"
        >
          +
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-gray-400">{product.stock} kilos available</p>

      <div className="mt-4 flex items-center justify-between rounded-md bg-gray-50 px-4 py-3">
        <span className="text-sm text-gray-600">Total</span>
        <span className="text-lg font-bold text-gray-900">₱{total}</span>
      </div>

      {error && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCheckout}
          disabled={submitting}
          className="flex-1 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {submitting ? "Placing Order..." : "Checkout"}
        </button>
      </div>
    </Modal>
  );
}
