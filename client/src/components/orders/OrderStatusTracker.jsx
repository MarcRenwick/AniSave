import { motion, useReducedMotion } from "motion/react";
import { Check, Clock } from "lucide-react";
import { doneCountFor, stepDate, formatDateTime } from "../../utils/orderStatus";
import { EASE } from "../../theme/harvest";

// Where an order is, as a row of steps. As the page opens the green runs
// along the line from step to step, each finished step pops in with its
// tick, and the step the order is waiting on breathes.
export default function OrderStatusTracker({ steps, order }) {
  const doneCount = doneCountFor(order.status);
  const reduced = useReducedMotion();
  // Each segment of line fills after the one before it.
  const at = (i) => (reduced ? 0 : 0.15 + i * 0.28);

  return (
    <div className="rounded-[1.5rem] bg-paper p-5 shadow-soft ring-1 ring-gray-200" data-testid="status-tracker">
      <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-clay-500">
        <Clock className="h-4 w-4" />
        Order Status
      </p>

      <div className="flex items-start">
        {steps.map((label, i) => {
          const isDone = i < doneCount;
          const isCurrent = i === doneCount;
          const beforeGreen = i > 0 && i - 1 < doneCount;
          const afterGreen = i < steps.length - 1 && i < doneCount;
          const date = isDone ? stepDate(order, i) : null;

          return (
            <div key={label} className="flex flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                <div className={`relative h-1 flex-1 overflow-hidden rounded-full ${i === 0 ? "invisible" : "bg-gray-200"}`}>
                  {beforeGreen && (
                    <motion.span
                      className="absolute inset-0 origin-left rounded-full bg-brand"
                      initial={reduced ? false : { scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.3, delay: at(i - 1) + 0.14, ease: EASE }}
                      data-testid="tracker-fill"
                    />
                  )}
                </div>
                <motion.div
                  className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isDone
                      ? "bg-brand text-white shadow-[0_6px_14px_-6px_rgb(31_81_48/0.8)]"
                      : isCurrent
                        ? "border-2 border-brand bg-paper"
                        : "bg-gray-200"
                  }`}
                  initial={reduced || !(isDone || isCurrent) ? false : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 20, delay: at(i) }}
                  data-step={isDone ? "done" : isCurrent ? "current" : "todo"}
                >
                  {isDone && <Check className="h-4 w-4" strokeWidth={3} />}
                  {isCurrent && (
                    <>
                      <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                      <span aria-hidden="true" className="absolute -inset-1.5 rounded-full ring-2 ring-brand/35 animate-pulse-soft" />
                    </>
                  )}
                </motion.div>
                <div className={`relative h-1 flex-1 overflow-hidden rounded-full ${i === steps.length - 1 ? "invisible" : "bg-gray-200"}`}>
                  {afterGreen && (
                    <motion.span
                      className="absolute inset-0 origin-left rounded-full bg-brand"
                      initial={reduced ? false : { scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.3, delay: at(i), ease: EASE }}
                      data-testid="tracker-fill"
                    />
                  )}
                </div>
              </div>

              <p
                className={`mt-2 px-1 text-[11px] leading-tight ${
                  isCurrent ? "font-semibold text-gray-900" : isDone ? "text-gray-700" : "text-gray-400"
                }`}
              >
                {label}
              </p>
              {date && (
                <p className="text-[10px] leading-tight text-gray-500">
                  {formatDateTime(date)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
