import { Check } from "lucide-react";
import { doneCountFor, stepDate, formatDateTime } from "../../utils/orderStatus";

// An order's steps from top to bottom, for the farmer's side - what has been
// done and when, and which step their next action completes. (The buyer's
// page shows the same journey across the page: OrderStatusTracker.)
export default function OrderTimeline({ steps, order }) {
  const doneCount = doneCountFor(order.status);

  return (
    <ol data-testid="order-timeline">
      {steps.map((label, i) => {
        const done = i < doneCount;
        const current = i === doneCount;
        const date = done ? stepDate(order, i) : null;
        return (
          <li key={label} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute left-[13px] top-7 bottom-0 w-0.5 ${i < doneCount - 1 ? "bg-[#2f8f66]" : "bg-gray-200"}`}
              />
            )}
            <span
              className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                done ? "bg-[#2f8f66] text-white" : current ? "border-2 border-[#2f8f66] bg-white" : "bg-gray-200"
              }`}
            >
              {done && <Check className="h-4 w-4" />}
            </span>
            <div className="min-w-0 pt-0.5">
              <p
                className={`text-sm ${
                  done ? "font-medium text-gray-900" : current ? "font-semibold text-[#2f8f66]" : "text-gray-400"
                }`}
              >
                {label}
              </p>
              {date && <p className="text-xs text-gray-500">{formatDateTime(date)}</p>}
              {current && <p className="text-xs text-[#2f8f66]">Next step</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
