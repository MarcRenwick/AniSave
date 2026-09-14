import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

export default function Toast({ message, onClose, duration = 6000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed left-1/2 top-4 z-50 w-full max-w-sm -translate-x-1/2 px-4">
      <div className="flex items-center gap-2 rounded-md bg-[#2f8f66] px-4 py-3 text-sm font-medium text-white shadow-lg">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span className="flex-1">{message}</span>
        <button type="button" onClick={onClose} aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
