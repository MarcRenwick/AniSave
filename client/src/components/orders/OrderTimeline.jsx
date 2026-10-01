import { motion } from "motion/react";
import { Check } from "lucide-react";
import { doneCountFor, stepDate, formatDateTime } from "../../utils/orderStatus";
import { EASE } from "../../theme/harvest";

// An order's steps from top to bottom, for the farmer's side - what has been
// done and when, and which step their next action completes. (The buyer's
// page shows the same journey across the page: OrderStatusTracker.) As it
// appears the line grows down through the finished steps, each one ticking
// in as the line reaches it, and the next step glows softly.
export default function OrderTimeline({ steps, order }) {
  const doneCount = doneCountFor(order.status);
  const at = (i) => 0.1 + i * 0.12;

  return (
    <ol data-testid="order-timeline">
      {steps.map((label, i) => {
        const done = i < doneCount;
        const current = i === doneCount;
        const date = done ? stepDate(order, i) : null;
        return (
          <li key={label} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && (
              <>
                <span aria-hidden="true" className="absolute bottom-0 left-[13px] top-7 w-0.5 bg-gray-200" />
                {i < doneCount - 1 && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute bottom-0 left-[13px] top-7 w-0.5 bg-forest-600"
                    style={{ originY: 0 }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.35, delay: at(i) + 0.08, ease: EASE }}
                  />
                )}
              </>
            )}
            <motion.span
              className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                done ? "bg-forest-600 text-white" : current ? "border-2 border-forest-600 bg-white" : "bg-gray-200"
              }`}
              initial={done ? { scale: 0.4, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: at(i), ease: EASE }}
            >
              {done && <Check className="h-4 w-4" />}
              {current && (
                <span aria-hidden="true" className="absolute -inset-1.5 rounded-full bg-forest-600/20 animate-pulse-soft" />
              )}
            </motion.span>
            <div className="min-w-0 pt-0.5">
              <p
                className={`text-sm ${
                  done ? "font-medium text-gray-900" : current ? "font-semibold text-brand" : "text-gray-400"
                }`}
              >
                {label}
              </p>
              {date && <p className="text-xs text-gray-500">{formatDateTime(date)}</p>}
              {current && <p className="text-xs text-brand">Next step</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
