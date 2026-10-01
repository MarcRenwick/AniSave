import { useEffect } from "react";
import { motion } from "motion/react";
import { CheckCircle2, X } from "lucide-react";

export default function Toast({ message, onClose, duration = 6000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-50 w-full max-w-sm -translate-x-1/2 px-4">
      {/* Paper with a green edge, so it stands out over the dark bar it drops
          across; it springs down into place and lifts away when it goes. */}
      <motion.div
        role="status"
        initial={{ opacity: 0, y: -28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.98, transition: { duration: 0.2 } }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="pointer-events-auto flex items-center gap-3 rounded-2xl border-l-4 border-brand bg-paper px-4 py-3 text-sm font-medium text-gray-900 shadow-lift ring-1 ring-black/10"
        data-testid="toast"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-50 text-brand">
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
      </motion.div>
    </div>
  );
}
