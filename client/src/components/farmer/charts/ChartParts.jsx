import { Link } from "react-router-dom";
import { BarChart3, X } from "lucide-react";
import { COLORS } from "./analytics";

// Small pieces every Analytical Demands view is built from.

const BADGE_TONES = {
  green: "bg-[#eef6ee] text-[#1f5130]",
  red: "bg-[#FCE9E7] text-[#B0352B]",
  amber: "bg-[#FDF1DF] text-[#8A5409]",
  gray: "bg-[#f3eee3] text-[#62594a]",
};

export function Badge({ tone = "green", title, children }) {
  return (
    <span
      title={title}
      data-testid="view-badge"
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

// What the view shows and over what, with its one-line verdict beside it.
export function ViewHeading({ subtitle, badge }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <p className="text-sm font-medium" style={{ color: COLORS.muted }} data-testid="chart-subtitle">
        {subtitle}
      </p>
      {badge}
    </div>
  );
}

// Grey shapes where the chart will be, while its figures load.
export function ChartSkeleton({ stats = false, height = 240 }) {
  return (
    <div className="animate-pulse" data-testid="chart-skeleton" aria-busy="true" aria-label="Loading the chart">
      {stats && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-[#f3eee3]" />
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 rounded-xl bg-[#f8f4ec] p-4" style={{ height }}>
        {[40, 65, 30, 80, 55, 70, 45, 60, 35, 75].map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-[#ebe3d3]" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

// Said instead of drawing an empty chart.
export function EmptyState({ title, children, height = 240 }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#e7dfcf] bg-[#fcfaf4] px-6 text-center"
      style={{ minHeight: height }}
      data-testid="chart-empty"
    >
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#eef6ee] text-[#2e7d32]">
        <BarChart3 className="h-5 w-5" />
      </span>
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      {children && <p className="mt-1 max-w-sm text-xs" style={{ color: COLORS.muted }}>{children}</p>}
    </div>
  );
}

// The orders behind a tapped bar or calendar day.
const MAX_LISTED = 5;
export function OrdersPanel({ title, orders, summary, emptyText, onClose }) {
  return (
    <div className="mt-4 rounded-xl border border-[#e7dfcf] bg-[#faf6ee] p-4" data-testid="chart-orders">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs" style={{ color: COLORS.muted }}>
            {orders.length} completed order{orders.length === 1 ? "" : "s"}
            {summary ? ` · ${summary}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {orders.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">{emptyText}</p>
      ) : (
        <ul className="mt-2 divide-y divide-gray-200">
          {orders.slice(0, MAX_LISTED).map((order) => (
            <li key={order._id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium text-gray-900">{order.buyer?.name || "A buyer"}</p>
                <p className="truncate text-xs text-gray-500">
                  {order.quantity} kg of {order.productTitle} · ₱{Number(order.total).toLocaleString()}
                </p>
              </div>
              <Link
                to={`/farmer/orders/${order._id}`}
                className="shrink-0 rounded-md border border-[#2e7d32] bg-white px-3 py-1.5 text-xs font-semibold text-[#2e7d32] transition hover:bg-green-50"
              >
                View order
              </Link>
            </li>
          ))}
        </ul>
      )}
      {orders.length > MAX_LISTED && (
        <Link to="/farmer/orders" className="mt-2 inline-block text-xs font-semibold text-[#2e7d32] hover:underline">
          +{orders.length - MAX_LISTED} more in Orders
        </Link>
      )}
    </div>
  );
}

// A small legend entry: a swatch and what it stands for.
export function Key({ swatch, children }) {
  return (
    <span className="flex items-center gap-1.5">
      {swatch}
      {children}
    </span>
  );
}

// A Recharts tooltip in the card's own look.
export function TooltipBox({ title, lines }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-black/5" data-testid="chart-readout">
      <p className="mb-0.5 font-semibold text-gray-900">{title}</p>
      {lines.map(([label, value, color]) => (
        <p key={label} className="flex items-center gap-1.5 whitespace-nowrap" style={{ color: COLORS.muted }}>
          {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
          {label}: <span className="font-semibold tabular-nums text-gray-900">{value}</span>
        </p>
      ))}
    </div>
  );
}
