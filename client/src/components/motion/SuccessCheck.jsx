import { motion } from "motion/react";
import { EASE } from "../../theme/harvest";

// A tick that draws itself inside a ring - shown when something is saved.
export default function SuccessCheck({ className = "h-5 w-5", color = "#2e7d32" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" data-testid="success-check">
      <motion.circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke={color}
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0.4 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
      />
      <motion.path
        d="M7.5 12.4l3 3 6-6.6"
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.35, ease: EASE }}
      />
    </svg>
  );
}
