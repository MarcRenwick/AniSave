import { createContext, useContext } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { AlertCircle } from "lucide-react";
import { CountUp } from "../motion";
import { EASE } from "../../theme/harvest";

// The farmer dashboard's figure cards, in the harvest look. Each of the four
// has its own colour so they can be told apart at a glance - today's sales on
// deep forest green, the month's revenue in harvest gold, profit in tomato,
// stock in soil - and `plain` is a paper card. (The tone names are the cards'
// original colours, kept so nothing that refers to them has to change.)
const TONES = {
  plain: {
    card: "bg-paper ring-1 ring-black/5",
    icon: "bg-forest-50 text-forest-700 ring-1 ring-forest-100",
    label: "text-gray-800",
    link: "text-forest-700 hover:text-forest-800",
  },
  green: {
    card: "harvest-grain-dark bg-[linear-gradient(150deg,#173d24_0%,#1f5130_48%,#2e7d32_100%)] ring-1 ring-forest-900/40",
    icon: "bg-gold-400 text-night",
    label: "text-gold-200",
    link: "text-gold-200 hover:text-gold-100",
    dark: true,
  },
  blue: {
    card: "bg-[linear-gradient(160deg,#fdf6e3_0%,#fbecc2_100%)] ring-1 ring-gold-200",
    icon: "bg-gold-500 text-night",
    label: "text-soil-700",
    link: "text-soil-700 hover:text-night",
  },
  amber: {
    card: "bg-[linear-gradient(160deg,#fdeee8_0%,#fbd8cc_100%)] ring-1 ring-tomato-100",
    icon: "bg-tomato-600 text-white",
    label: "text-tomato-700",
    link: "text-tomato-700 hover:text-night",
  },
  purple: {
    card: "bg-[linear-gradient(160deg,#faf4ea_0%,#f3ebdc_100%)] ring-1 ring-soil-300/60",
    icon: "bg-soil-700 text-cream",
    label: "text-soil-700",
    link: "text-soil-700 hover:text-night",
  },
};

// Whether the card a figure sits in is a dark one, so it can be written light.
const Dark = createContext(false);

// One of the four figures across the top: an icon, what it is, the number, and
// a line saying what the number means. A card with somewhere to go says so in
// its corner, and lifts a little under the pointer.
export function StatCard({ icon: Icon, label, link, onClick, testId, tone = "plain", children }) {
  const look = TONES[tone] || TONES.plain;
  return (
    <Dark.Provider value={Boolean(look.dark)}>
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
        className={`relative isolate flex h-full flex-col overflow-hidden rounded-[1.25rem] p-5 shadow-soft transition-[transform,box-shadow] duration-300 ease-harvest hover:-translate-y-1 hover:shadow-lift ${look.card} ${
          onClick ? "cursor-pointer" : ""
        }`}
      >
        {/* The card's icon again, large and faint in the corner. */}
        <Icon
          aria-hidden="true"
          className={`pointer-events-none absolute -bottom-5 -right-5 -z-10 h-28 w-28 ${look.dark ? "text-cream opacity-[0.07]" : "text-night opacity-[0.05]"}`}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${look.icon}`}>
              <Icon className="h-4 w-4" />
            </span>
            <span className={`truncate text-sm font-bold ${look.label}`}>{label}</span>
          </div>
          {link && (
            <Link to={link.to} className={`shrink-0 text-xs font-bold underline underline-offset-2 ${look.link}`}>
              {link.label} →
            </Link>
          )}
        </div>
        {children}
      </div>
    </Dark.Provider>
  );
}

// The card's number. Given a `value` (and a `format` for it), it counts up to
// it as the card arrives; otherwise it shows its children as they are.
export function Figure({ children, value, format, tone }) {
  const dark = useContext(Dark);
  const color = tone || (dark ? "text-cream" : "text-gray-900");
  return (
    <p className={`mt-4 font-display text-[2rem] font-semibold leading-none tracking-tight tabular-nums ${color}`}>
      {value !== undefined && value !== null ? <CountUp value={value} format={format} on="mount" duration={1.1} /> : children}
    </p>
  );
}

export function Caption({ children, tone }) {
  const dark = useContext(Dark);
  return <p className={`mt-1.5 text-xs ${tone || (dark ? "text-cream/75" : "text-gray-500")}`}>{children}</p>;
}

// A caption with a small figure beside it, such as "2 kg · 1 order".
export function CaptionRow({ children, pill, testId }) {
  const dark = useContext(Dark);
  return (
    <div className="mt-1.5 flex items-start justify-between gap-2">
      <div className="min-w-0">{children}</div>
      {pill && (
        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
            dark ? "bg-cream/10 text-cream ring-cream/20" : "bg-white/80 text-gray-700 ring-black/10"
          }`}
          data-testid={testId}
        >
          {pill}
        </span>
      )}
    </div>
  );
}

// A line through the last few values, for the shape of them rather than the
// numbers - the numbers are the card's own. It draws itself in.
export function Sparkline({ values, color, label, testId }) {
  const max = Math.max(...values, 0);
  const step = values.length > 1 ? 100 / (values.length - 1) : 100;
  const points = values.map((v, i) => `${i * step},${max > 0 ? 26 - (v / max) * 22 : 26}`).join(" ");
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="mt-auto h-8 w-full pt-2" role="img" aria-label={label} data-testid={testId}>
      <motion.polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0, opacity: 0.4 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.25, ease: EASE }}
      />
    </svg>
  );
}

// A bar per value, bottom-aligned; empty ones leave a gap. They grow up from
// the bottom one after another.
export function MiniBars({ values, color, label, testId }) {
  const max = Math.max(...values, 0);
  const width = 100 / Math.max(values.length, 1);
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="mt-auto h-8 w-full pt-2" role="img" aria-label={label} data-testid={testId}>
      {values.map((v, i) =>
        v > 0 ? (
          <motion.rect
            key={i}
            x={i * width + width * 0.15}
            width={width * 0.7}
            y={28 - (v / max) * 26}
            height={(v / max) * 26}
            rx="0.8"
            fill={color}
            style={{ originY: 1 }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.6, delay: 0.2 + i * 0.025, ease: EASE }}
          />
        ) : null
      )}
    </svg>
  );
}

// How the products split between plenty of stock, running low and sold out.
const STOCK_PARTS = [
  { key: "inStock", label: "In stock", color: "#2e7d32" },
  { key: "low", label: "Low", color: "#e8a33d" },
  { key: "out", label: "Out", color: "#c4421a" },
];
export function StockBar({ counts }) {
  const total = STOCK_PARTS.reduce((sum, p) => sum + counts[p.key], 0);
  return (
    <div className="mt-auto pt-3" data-testid="stock-split">
      <motion.div
        className="flex h-2 overflow-hidden rounded-full bg-white/80"
        style={{ originX: 0 }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
      >
        {total > 0 &&
          STOCK_PARTS.map((p) =>
            counts[p.key] > 0 ? (
              <span key={p.key} className="h-full" style={{ width: `${(counts[p.key] / total) * 100}%`, background: p.color }} />
            ) : null
          )}
      </motion.div>
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
      className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold text-soil-700 ring-1 ring-gold-300 transition-colors hover:bg-white"
    >
      <span className="flex items-center gap-1.5">
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-gold-600" />
        {children}
      </span>
      <span className="shrink-0 font-bold">{action} →</span>
    </Link>
  );
}
