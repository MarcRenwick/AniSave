import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2 } from "lucide-react";
import { EASE } from "../../theme/harvest";

// The pieces Log in, Sign up and Forgot password share, in the harvest look:
// cream fields that glow green on focus (theme/harvest.css), a forest-green
// button that shows it's working, and messages that slide in - an error with
// a small shake.

export const authInput =
  "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-[15px] text-gray-900 placeholder:text-gray-400 hover:border-gray-400 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15";

// Sign up's longer form, a little slimmer so a whole step fits a laptop screen.
export const authInputCompact = authInput.replace("py-3 text-[15px]", "py-2.5 text-sm");

// The label takes the green of the field below it while that field has focus.
export const authLabel =
  "block text-sm font-semibold text-gray-700 transition-colors duration-200 group-focus-within:text-brand";

export const authLink = "font-semibold text-brand underline-offset-4 hover:underline focus-visible:underline";

export function AuthAlert({ tone = "error", children }) {
  const reduced = useReducedMotion();
  const error = tone === "error";
  return (
    <AnimatePresence initial={false}>
      {children && (
        <motion.div
          key={String(children)}
          role={error ? "alert" : "status"}
          initial={{ opacity: 0, y: -6 }}
          animate={error && !reduced ? { opacity: 1, y: 0, x: [0, -7, 7, -4, 4, 0] } : { opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.45, ease: EASE }}
          className={`mt-5 flex gap-2.5 rounded-xl px-3.5 py-2.5 text-sm leading-snug ring-1 ${
            error ? "bg-tomato-50 text-tomato-700 ring-tomato-100" : "bg-forest-50 text-forest-800 ring-forest-100"
          }`}
          data-testid={error ? "auth-error" : "auth-notice"}
        >
          <span aria-hidden="true" className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${error ? "bg-tomato-600" : "bg-forest-600"}`} />
          <span>{children}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SubmitButton({ busy, busyLabel, compact = false, className = "", children }) {
  return (
    <button
      type="submit"
      disabled={busy}
      aria-busy={busy || undefined}
      className={`relative flex w-full items-center justify-center gap-2 rounded-xl bg-brand ${compact ? "py-2.5 text-sm" : "py-3 text-[15px]"} font-semibold text-white shadow-[0_10px_24px_-12px_rgb(31_81_48/0.8)] transition-[background-color,box-shadow] duration-200 hover:bg-brand-hover hover:shadow-[0_14px_28px_-12px_rgb(31_81_48/0.9)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30 disabled:opacity-70 ${className}`}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {busy ? busyLabel : children}
    </button>
  );
}
