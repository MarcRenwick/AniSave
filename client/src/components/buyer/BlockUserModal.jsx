import { useEffect } from "react";
import { createPortal } from "react-dom";

// What a buyer sees before a shop is blocked: who it is, what blocking does,
// and two ways out. Plain on purpose - this is a decision, not a form.
export default function BlockUserModal({ name, error, submitting, onClose, onConfirm }) {
  useEffect(() => {
    const closeOnEscape = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-30 overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="block-user-title"
          className="w-full max-w-sm overflow-hidden rounded-xl border border-gray-300 bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-5 text-center">
            <p id="block-user-title" className="text-base font-semibold text-gray-900">
              Block {name}?
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Are you sure you want to block this user? You will no longer see their shop, and you
              won&apos;t be able to comment on or buy their products.
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>

          <div className="grid grid-cols-2 divide-x divide-gray-200 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              autoFocus
              className="py-3 text-sm font-semibold text-[#2f8f66] transition hover:bg-green-50 disabled:opacity-60"
            >
              {submitting ? "Blocking..." : "Block"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
