import { useState } from "react";
import Modal from "../Modal";
import QuantityInput from "./QuantityInput";

export default function AddToCartModal({ product, onClose, onConfirm }) {
  const [quantity, setQuantity] = useState(1);
  // Off while the quantity box holds nothing or a 0, so asking for 0 kilos
  // can't quietly add one.
  const [quantityValid, setQuantityValid] = useState(true);

  return (
    <Modal title="Add to Cart" onClose={onClose}>
      <p className="text-sm text-gray-600">
        How many kilos of <span className="font-medium">{product.title}</span> would you like to add?
      </p>

      <QuantityInput
        value={quantity}
        onChange={setQuantity}
        max={product.stock}
        onValidChange={setQuantityValid}
      />
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
          disabled={!quantityValid}
          className="flex-1 rounded-md bg-[#2f8f66] py-2 text-sm font-semibold text-white hover:bg-[#267a56] disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Add to Cart
        </button>
      </div>
    </Modal>
  );
}
