import Modal from "../Modal";

export default function CancelOrderModal({ order, onClose, onConfirm, cancelling, error }) {
  return (
    <Modal title="Cancel Order?" onClose={onClose}>
      <p className="text-sm text-gray-600">
        Are you sure you want to cancel your order of{" "}
        <span className="font-medium">
          {order.quantity}kg {order.productTitle}
        </span>{" "}
        (₱{order.total})? Your wallet will be refunded the full amount.
      </p>

      {error && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={cancelling}
          className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          No, Keep Order
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={cancelling}
          className="flex-1 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {cancelling ? "Cancelling..." : "Yes, Cancel Order"}
        </button>
      </div>
    </Modal>
  );
}
