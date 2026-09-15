import { X } from "lucide-react";

export default function Modal({ title, onClose, children, maxWidth = "max-w-sm" }) {
  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      {/* min-h-full keeps short modals centred, while a modal taller than the
          screen grows past it and scrolls instead of being cut off. */}
      <div className="flex min-h-full items-center justify-center">
        <div
          className={`w-full ${maxWidth} overflow-hidden rounded-xl bg-white shadow-xl`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between bg-[#2f8f66] px-4 py-3 text-white">
            <p className="font-semibold">{title}</p>
            <button type="button" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
