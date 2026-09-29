import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

export default function Toast({ message, onClose, duration = 6000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed left-1/2 top-4 z-50 w-full max-w-sm -translate-x-1/2 px-4">
      {/* White with a green edge, so it stands out over the green header it
          slides down across rather than blending into it. */}
      <div
        role="status"
        className="flex items-center gap-3 rounded-xl border-l-4 border-[#2f8f66] bg-white px-4 py-3 text-sm font-medium text-gray-900 shadow-xl ring-1 ring-black/10"
        data-testid="toast"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-50 text-[#2f8f66]">
          <CheckCircle2 className="h-4 w-4" />
        </span>
        <span className="flex-1">{message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
