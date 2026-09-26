import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ImageOff, Trash2 } from "lucide-react";
import { SERVER_URL } from "../../services/api";

const peso = (amount) => `₱ ${Number(amount || 0).toLocaleString()}`;

// Asked before a cart row goes: the item itself, so there's no doubt which
// one, and two plain answers. "No, keep it" has the focus - Enter pressed by
// habit keeps the item rather than losing it.
export default function RemoveCartItemModal({ item, onClose, onConfirm }) {
  useEffect(() => {
    const closeOnEscape = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-30 overflow-y-auto bg-black/40 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-item-title"
          data-testid="remove-item-dialog"
          className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 ring-8 ring-red-50/50">
            <Trash2 className="h-6 w-6" />
          </span>
          <p id="remove-item-title" className="mt-4 text-lg font-semibold text-gray-900">
            Remove this item?
          </p>
          <p className="mt-1 text-sm text-gray-500">It will be taken out of your cart. You can add it again anytime.</p>

          <div className="mt-5 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-left">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-gray-300 ring-1 ring-gray-200">
              {item.image ? (
                <img src={`${SERVER_URL}${item.image}`} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageOff className="h-5 w-5" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold text-gray-900">{item.title}</span>
              <span className="block text-sm text-gray-500">
                {item.quantity} kg · {peso(item.price * item.quantity)}
              </span>
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              autoFocus
              className="rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              No, keep it
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Yes, remove
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
