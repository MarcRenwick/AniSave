import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Package } from "lucide-react";
import { SERVER_URL } from "../../services/api";
import { doneCountFor, orderNumber } from "../../utils/orderStatus";
import { amountOf } from "../../utils/units";

// The steps an order goes through, as the card lists them, and the moment
// each one happened (from what the card was sent with).
const STEPS = [
  { label: "Order Placed", at: "placedAt" },
  { label: "Order Accepted", at: "acceptedAt" },
  { label: "Preparing", at: "acceptedAt" },
  { label: "Ready for Pickup", at: "readyAt" },
  { label: "Picked Up", at: "doneAt" },
  { label: "Order Done", at: "doneAt" },
];

// What the card's header says the order is doing now - to the buyer, and
// to the farmer who sent it.
const HEADLINE = {
  buyer: {
    processing: "Your order is being prepared",
    ready: "Your order is ready for pickup",
    done: "Your order is done",
  },
  farmer: {
    processing: "Order accepted - preparing",
    ready: "Order ready for pickup",
    done: "Order picked up and done",
  },
};

const when = (date) =>
  new Date(date).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// The card the app sends in a conversation when the farmer moves an order on:
// the product, how much and for how much, the order's number, and every step
// from top to bottom with the one it has just reached highlighted. It shows
// the order as it was when the card was sent - the newest card is where it is
// now.
export default function OrderUpdateCard({ order, isBuyer }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const doneCount = doneCountFor(order.status);
  const current = doneCount - 1;

  return (
    <div
      className="w-72 max-w-full overflow-hidden rounded-2xl bg-white text-left text-gray-900 shadow-sm ring-1 ring-gray-200"
      data-testid="order-update-card"
      data-status={order.status}
    >
      <div className="flex items-center gap-2 bg-brand px-4 py-2.5 text-white">
        <Package className="h-4 w-4 shrink-0" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{HEADLINE[isBuyer ? "buyer" : "farmer"][order.status] || "Order update"}</p>
      </div>

      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 text-gray-300 ring-1 ring-gray-200">
          {order.image && !photoFailed ? (
            <img
              src={`${SERVER_URL}${order.image}`}
              alt={order.productTitle}
              onError={() => setPhotoFailed(true)}
              className="h-full w-full object-cover"
              data-testid="order-card-photo"
            />
          ) : (
            <Package className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold" data-testid="order-card-product">
            {order.productTitle}
          </p>
          <p className="text-xs text-gray-500" data-testid="order-card-amount">
            {amountOf(order.quantity, order.unit)} · <span className="font-semibold text-gray-800">₱{Number(order.total).toLocaleString()}</span>
          </p>
          <p className="text-[11px] text-gray-400" data-testid="order-card-number">
            Order {orderNumber(order)}
          </p>
        </div>
      </div>

      <ol className="px-4 py-3" data-testid="order-card-timeline">
        {STEPS.map((step, i) => {
          const done = i < doneCount;
          const isCurrent = i === current;
          return (
            <li key={step.label} className="relative flex gap-3 pb-3 last:pb-0" data-current={isCurrent || undefined}>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[9px] top-5 bottom-0 w-0.5 ${i < current ? "bg-brand" : "bg-gray-200"}`}
                />
              )}
              <span
                className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  isCurrent
                    ? "bg-brand text-white ring-4 ring-green-100"
                    : done
                      ? "bg-brand text-white"
                      : "border-2 border-gray-200 bg-white"
                }`}
              >
                {done && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <div
                className={`-mt-0.5 min-w-0 flex-1 ${isCurrent ? "rounded-lg bg-green-50 px-2 py-1 -mx-1" : ""}`}
              >
                <p
                  className={`text-sm leading-5 ${
                    isCurrent ? "font-semibold text-brand" : done ? "text-gray-800" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>
                {done && order[step.at] && (
                  <p className={`text-[11px] ${isCurrent ? "font-medium text-brand" : "text-gray-400"}`}>
                    {when(order[step.at])}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <Link
        to={isBuyer ? `/buyer/orders/${order._id}` : `/farmer/orders/${order._id}`}
        className="flex items-center justify-between border-t border-gray-100 px-4 py-2.5 text-xs font-semibold text-brand transition hover:bg-green-50"
      >
        View order
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
