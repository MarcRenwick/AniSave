import { ImageOff } from "lucide-react";
import Modal from "../Modal";
import { SERVER_URL } from "../../services/api";

export default function CartCheckoutModal({ items, total, onClose, onConfirm, confirming, error }) {
  return (
    <Modal title="Confirm Checkout" onClose={onClose} maxWidth="max-w-md">
      <p className="text-sm text-gray-600">Review your order before checking out.</p>

      <div className="mt-3 max-h-64 space-y-3 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.productId}
            className="flex items-center gap-3 rounded-lg border border-gray-100 p-2"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-50 text-gray-300">
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
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
              <p className="text-xs text-gray-500">
                {item.quantity}kg × ₱{item.price}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-gray-900">
              ₱{item.price * item.quantity}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-md bg-gray-50 px-4 py-3">
        <span className="text-sm text-gray-600">
          Total ({items.length} item{items.length === 1 ? "" : "s"})
        </span>
        <span className="text-lg font-bold text-gray-900">₱{total}</span>
      </div>

      {error && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={confirming}
          className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming}
          className="flex-1 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {confirming ? "Placing Orders..." : "Checkout"}
        </button>
      </div>
    </Modal>
  );
}
