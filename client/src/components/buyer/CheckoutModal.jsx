import { useState } from "react";
import { ImageOff } from "lucide-react";
import Modal from "../Modal";
import PriceTag from "../products/PriceTag";
import QuantityInput from "./QuantityInput";
import { SERVER_URL } from "../../services/api";
import { effectivePrice } from "../../utils/pricing";

export default function CheckoutModal({ product, preorder = false, onClose, onConfirm }) {
  const [quantity, setQuantity] = useState(1);

  const total = effectivePrice(product) * quantity;

  return (
    <Modal title={preorder ? "Pre-Order" : "Checkout"} onClose={onClose}>
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
          <PriceTag product={product} size="sm" suffix=" per kilo" />
        </div>
      </div>

      {/* A pre-order isn't capped by current stock - the farmer fills it as
          the produce comes in. */}
      <QuantityInput value={quantity} onChange={setQuantity} max={preorder ? undefined : product.stock} />
      <p className="mt-2 text-center text-xs text-gray-400">
        {preorder
          ? "Pre-order - the farmer prepares this once it's available"
          : `${product.stock} kilos available`}
      </p>

      <div className="mt-4 flex items-center justify-between rounded-md bg-gray-50 px-4 py-3">
        <span className="text-sm text-gray-600">Total (Cash on Pick-up)</span>
        <span className="text-lg font-bold text-gray-900">₱{total}</span>
      </div>

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
          className="flex-1 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          {preorder ? "Proceed to Pre-Order" : "Proceed to Checkout"}
        </button>
      </div>
    </Modal>
  );
}
