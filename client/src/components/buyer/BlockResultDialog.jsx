import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

// How long the confirmation stays up on its own. Long enough to read, short
// enough that nobody has to dismiss it.
const AUTO_CLOSE_MS = 1600;

// "User Blocked Successfully" - the note that a block (or an unblock) went
// through. It closes itself, or on a click or Escape.
export default function BlockResultDialog({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, AUTO_CLOSE_MS);
    const closeOnEscape = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-30 overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center">
        <div
          role="status"
          aria-live="polite"
          className="w-full max-w-xs rounded-xl bg-white px-6 py-6 text-center shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white">
            <Check className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm font-medium text-gray-900">{message}</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
