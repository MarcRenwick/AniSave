import { Check, Clock } from "lucide-react";
import { doneCountFor, stepDate, formatDateTime } from "../../utils/orderStatus";

export default function OrderStatusTracker({ steps, order }) {
  const doneCount = doneCountFor(order.status);

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="mb-5 flex items-center gap-2 text-sm font-semibold text-[#2f8f66]">
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
                <div
                  className={`h-0.5 flex-1 ${
                    i === 0 ? "invisible" : beforeGreen ? "bg-[#2f8f66]" : "bg-gray-200"
                  }`}
                />
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    isDone
                      ? "bg-[#2f8f66] text-white"
                      : isCurrent
                        ? "border-2 border-[#2f8f66] bg-white"
                        : "bg-gray-200"
                  }`}
                >
                  {isDone && <Check className="h-4 w-4" />}
                </div>
                <div
                  className={`h-0.5 flex-1 ${
                    i === steps.length - 1 ? "invisible" : afterGreen ? "bg-[#2f8f66]" : "bg-gray-200"
                  }`}
                />
              </div>

              <p
                className={`mt-2 px-1 text-[10px] leading-tight ${
                  isDone || isCurrent ? "text-gray-700" : "text-gray-400"
                }`}
              >
                {label}
              </p>
              {date && (
                <p className="text-[9px] leading-tight text-gray-400">
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
