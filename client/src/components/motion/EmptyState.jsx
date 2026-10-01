import { motion } from "motion/react";
import { EASE } from "../../theme/harvest";

// Little drawings for "nothing here yet", in the harvest palette, each with a
// gentle sway (theme/harvest.css, animate-sway - still for reduced motion).
function Basket() {
  return (
    <svg viewBox="0 0 96 80" className="h-20 w-24" aria-hidden="true">
      <ellipse cx="48" cy="72" rx="30" ry="4" fill="#c9a68a" opacity="0.4" />
      <g className="origin-bottom animate-sway" style={{ "--sway": "3deg", transformBox: "fill-box" }}>
        <path d="M44 22c-2-8 2-14 9-17-1 8-4 13-9 17z" fill="#58a061" />
        <path d="M46 23c5-6 12-7 18-3-6 4-12 5-18 3z" fill="#2e7d32" />
      </g>
      <path d="M22 34h52l-6 32a6 6 0 0 1-6 5H34a6 6 0 0 1-6-5z" fill="#c0703f" />
      <path d="M22 34h52" stroke="#8a5a3c" strokeWidth="4" strokeLinecap="round" />
      <g stroke="#8a5a3c" strokeOpacity="0.55" strokeWidth="2">
        <path d="M27 45h42M29 55h38M31 64h34" />
        <path d="M38 36v34M48 36v35M58 36v34" />
      </g>
      <path d="M30 34c0-10 8-16 18-16s18 6 18 16" fill="none" stroke="#8a5a3c" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Sprout() {
  return (
    <svg viewBox="0 0 96 80" className="h-20 w-24" aria-hidden="true">
      <ellipse cx="48" cy="73" rx="26" ry="3.5" fill="#c9a68a" opacity="0.4" />
      <path d="M30 48h36l-4 22H34z" fill="#c0703f" />
      <rect x="27" y="42" width="42" height="8" rx="3" fill="#a0522d" />
      <g className="origin-bottom animate-sway" style={{ "--sway": "4deg", transformBox: "fill-box" }}>
        <path d="M48 42c0-8 0-14-1-22" stroke="#2e7d32" strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M47.5 30c-7 0-12-4-13-11 7 0 12 4 13 11z" fill="#58a061" />
        <path d="M47.5 25c6-1 10-6 10-12-6 1-10 5-10 12z" fill="#2e7d32" />
      </g>
    </svg>
  );
}

function Crate() {
  return (
    <svg viewBox="0 0 96 80" className="h-20 w-24" aria-hidden="true">
      <ellipse cx="48" cy="72" rx="32" ry="4" fill="#c9a68a" opacity="0.4" />
      <g className="origin-bottom animate-sway" style={{ "--sway": "2.5deg", transformBox: "fill-box" }}>
        <circle cx="38" cy="30" r="9" fill="#e4572e" />
        <path d="M38 21c1-3 3-4 6-4-1 3-3 4-6 4z" fill="#2e7d32" />
        <circle cx="56" cy="32" r="8" fill="#f2c14e" />
        <path d="M56 24c0-3 2-5 5-5 0 3-2 5-5 5z" fill="#58a061" />
      </g>
      <rect x="18" y="38" width="60" height="30" rx="4" fill="#c0703f" />
      <g stroke="#8a5a3c" strokeOpacity="0.6" strokeWidth="2.5">
        <path d="M18 48h60M18 58h60" />
      </g>
    </svg>
  );
}

const ART = { basket: Basket, sprout: Sprout, crate: Crate };

// "Nothing here yet", said kindly: a small drawing, a line or two, and the one
// thing to do about it if there is one.
export default function EmptyState({ art = "sprout", title, children, action = null, className = "" }) {
  const Art = ART[art] || Sprout;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className={`flex flex-col items-center px-6 py-10 text-center ${className}`}
      data-testid="empty-state"
    >
      <Art />
      {title && <p className="mt-3 font-display text-lg font-semibold text-gray-900">{title}</p>}
      {children && <div className="mt-1 max-w-sm text-sm text-gray-500">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
