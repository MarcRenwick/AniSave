import { useState } from "react";
import Modal from "../Modal";

export default function AddToCartModal({ product, onClose, onConfirm }) {
  const [quantity, setQuantity] = useState(1);

  const adjust = (delta) => setQuantity((q) => Math.min(product.stock, Math.max(1, q + delta)));

  return (
    <Modal title="Add to Cart" onClose={onClose}>
      <p className="text-sm text-gray-600">
        How many kilos of <span className="font-medium">{product.title}</span> would you like to add?
      </p>

      <div className="mt-4 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => adjust(-1)}
          className="h-10 w-10 rounded-md border border-gray-300 text-lg font-semibold text-gray-600 hover:bg-gray-50"
        >
          −
        </button>
        <span className="w-12 text-center text-xl font-semibold text-gray-900">{quantity}</span>
        <button
          type="button"
          onClick={() => adjust(1)}
          className="h-10 w-10 rounded-md border border-gray-300 text-lg font-semibold text-gray-600 hover:bg-gray-50"
        >
          +
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-gray-400">{product.stock} kilos available</p>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onConfirm(quantity)}
          className="flex-1 rounded-md bg-[#2f8f66] py-2 text-sm font-semibold text-white hover:bg-[#267a56]"
        >
          Add to Cart
        </button>
      </div>
    </Modal>
  );
}
