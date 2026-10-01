import { motion, useReducedMotion } from "motion/react";

// The harvest look's "loading": a sprout pushing up out of the soil, opening
// two leaves, and starting again - instead of a spinner. `label` says what is
// being loaded; `compact` is the small inline version.
export default function SproutLoader({ label = "Loading...", compact = false, className = "" }) {
  const reduced = useReducedMotion();
  const loop = (times) =>
    reduced ? { duration: 0 } : { duration: 2.2, times, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.15 };
  const grow = reduced ? 1 : [0, 1, 1, 1, 0];
  const leaf = reduced ? 1 : [0, 0, 1, 1, 0];
  const times = [0, 0.32, 0.55, 0.88, 1];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex ${compact ? "items-center gap-2" : "flex-col items-center gap-3 py-12"} text-sm text-gray-500 ${className}`}
      data-testid="sprout-loader"
    >
      <svg viewBox="0 0 48 48" className={compact ? "h-6 w-6" : "h-14 w-14"} aria-hidden="true">
        <ellipse cx="24" cy="41" rx="14" ry="3.2" fill="#c9a68a" opacity="0.55" />
        <path d="M11 40.5h26" stroke="#8a5a3c" strokeWidth="2.2" strokeLinecap="round" />
        <motion.path
          d="M24 40 C24 34 24.5 28 24 21"
          fill="none"
          stroke="#2e7d32"
          strokeWidth="2.6"
          strokeLinecap="round"
          initial={{ pathLength: reduced ? 1 : 0 }}
          animate={{ pathLength: grow }}
          transition={loop(times)}
        />
        <motion.path
          d="M24 27 C18.5 27.5 14.5 24 13.5 18.5 C19.5 18.2 23.2 21.5 24 27 Z"
          fill="#58a061"
          style={{ originX: 1, originY: 1 }}
          initial={{ scale: reduced ? 1 : 0 }}
          animate={{ scale: leaf }}
          transition={loop(times)}
        />
        <motion.path
          d="M24 23.5 C29 23.8 33.2 20.6 34.4 15 C28.6 14.8 24.6 18 24 23.5 Z"
          fill="#2e7d32"
          style={{ originX: 0, originY: 1 }}
          initial={{ scale: reduced ? 1 : 0 }}
          animate={{ scale: leaf }}
          transition={loop([0, 0.4, 0.62, 0.88, 1])}
        />
      </svg>
      <span>{label}</span>
    </div>
  );
}
