import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";

// The farmer dashboard's figure cards. Each of the four has its own colour -
// green for today's sales, blue for the month's revenue, amber for profit,
// purple for stock - so they can be told apart at a glance; `plain` is the
// white card they used to be.
const TONES = {
  plain: {
    card: "rounded-xl border-gray-200/70 bg-white",
    icon: "bg-green-50 text-[#2f8f66] ring-1 ring-green-100",
    label: "text-gray-800",
    link: "text-[#2f8f66] hover:text-[#1f5c42]",
  },
  green: {
    card: "rounded-2xl border-[#CFE6D8] bg-[#EEF7F1]",
    icon: "bg-[#1F7A4D] text-white",
    label: "text-[#17603F]",
    link: "text-[#1F7A4D] hover:text-[#17603F]",
  },
  blue: {
    card: "rounded-2xl border-[#D6E2F3] bg-[#EEF3FB]",
    icon: "bg-[#2D63AA] text-white",
    label: "text-[#234E88]",
    link: "text-[#2D63AA] hover:text-[#234E88]",
  },
  amber: {
    card: "rounded-2xl border-[#F0DFC2] bg-[#FDF5EA]",
    icon: "bg-[#B7700C] text-white",
    label: "text-[#8A5409]",
    link: "text-[#8A5409] hover:text-[#6B4107]",
  },
  purple: {
    card: "rounded-2xl border-[#E0D9F4] bg-[#F4F1FB]",
    icon: "bg-[#6446B8] text-white",
    label: "text-[#4E3791]",
    link: "text-[#6446B8] hover:text-[#4E3791]",
  },
};

// One of the four figures across the top: an icon, what it is, the number, and
// a line saying what the number means. A card with somewhere to go says so in
// its corner.
export function StatCard({ icon: Icon, label, link, onClick, testId, tone = "plain", children }) {
  const look = TONES[tone] || TONES.plain;
  return (
    <div
      data-testid={testId}
      data-tone={tone}
      onClick={
        onClick &&
        ((e) => {
          // A link inside the card goes where it says, without the card
          // navigating a second time.
          if (!e.target.closest("a")) onClick();
        })
      }
      className={`flex flex-col border p-5 shadow-sm ${look.card} ${onClick ? "cursor-pointer transition hover:shadow-md" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${look.icon}`}>
            <Icon className="h-4 w-4" />
          </span>
          <span className={`truncate text-sm font-semibold ${look.label}`}>{label}</span>
        </div>
        {link && (
          <Link to={link.to} className={`shrink-0 text-xs font-semibold underline underline-offset-2 ${look.link}`}>
            {link.label} →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

export const Figure = ({ children, tone = "text-gray-900" }) => (
  <p className={`mt-4 text-3xl font-bold tracking-tight ${tone}`}>{children}</p>
);
export const Caption = ({ children, tone = "text-gray-500" }) => <p className={`mt-1 text-xs ${tone}`}>{children}</p>;

// A caption with a small figure beside it, such as "2 kg · 1 order".
export function CaptionRow({ children, pill, testId }) {
  return (
    <div className="mt-1 flex items-start justify-between gap-2">
      <div className="min-w-0">{children}</div>
      {pill && (
        <span
          className="shrink-0 whitespace-nowrap rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-gray-700 ring-1 ring-black/10"
          data-testid={testId}
        >
          {pill}
        </span>
      )}
    </div>
  );
}

// A line through the last few values, for the shape of them rather than the
// numbers - the numbers are the card's own.
export function Sparkline({ values, color, label, testId }) {
  const max = Math.max(...values, 0);
  const step = values.length > 1 ? 100 / (values.length - 1) : 100;
  const points = values.map((v, i) => `${i * step},${max > 0 ? 26 - (v / max) * 22 : 26}`).join(" ");
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="mt-auto h-7 w-full pt-2" role="img" aria-label={label} data-testid={testId}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// A bar per value, bottom-aligned; empty ones leave a gap.
export function MiniBars({ values, color, label, testId }) {
  const max = Math.max(...values, 0);
  const width = 100 / Math.max(values.length, 1);
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="mt-auto h-7 w-full pt-2" role="img" aria-label={label} data-testid={testId}>
      {values.map((v, i) =>
        v > 0 ? (
          <rect key={i} x={i * width + width * 0.15} width={width * 0.7} y={28 - (v / max) * 26} height={(v / max) * 26} rx="0.8" fill={color} />
        ) : null
      )}
    </svg>
  );
}

// How the products split between plenty of stock, running low and sold out.
const STOCK_PARTS = [
  { key: "inStock", label: "In stock", color: "#6446B8" },
  { key: "low", label: "Low", color: "#B9A8E8" },
  { key: "out", label: "Out", color: "#D9534F" },
];
export function StockBar({ counts }) {
  const total = STOCK_PARTS.reduce((sum, p) => sum + counts[p.key], 0);
  return (
    <div className="mt-auto pt-3" data-testid="stock-split">
      <div className="flex h-2 overflow-hidden rounded-full bg-white/80">
        {total > 0 &&
          STOCK_PARTS.map((p) =>
            counts[p.key] > 0 ? (
              <span key={p.key} className="h-full" style={{ width: `${(counts[p.key] / total) * 100}%`, background: p.color }} />
            ) : null
          )}
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-3 text-[11px] text-gray-600">
        {STOCK_PARTS.map((p) => (
          <li key={p.key} className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
            {p.label} {counts[p.key]}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Something that needs doing, as a box with the way to do it - not just
// orange text that reads like any other line.
export function Warning({ to, action, children }) {
  return (
    <Link
      to={to}
      className="mt-3 flex items-center justify-between gap-2 rounded-lg bg-white/75 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200 transition hover:bg-white"
    >
      <span className="flex items-center gap-1.5">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        {children}
      </span>
      <span className="shrink-0 font-semibold">{action} →</span>
    </Link>
  );
}
