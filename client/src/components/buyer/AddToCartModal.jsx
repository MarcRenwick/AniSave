import { useState } from "react";
import Modal from "../Modal";
import QuantityInput from "./QuantityInput";

export default function AddToCartModal({ product, onClose, onConfirm }) {
  const [quantity, setQuantity] = useState(1);

  return (
    <Modal title="Add to Cart" onClose={onClose}>
      <p className="text-sm text-gray-600">
        How many kilos of <span className="font-medium">{product.title}</span> would you like to add?
      </p>

      <QuantityInput value={quantity} onChange={setQuantity} max={product.stock} />
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
