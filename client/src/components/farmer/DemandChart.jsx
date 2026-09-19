import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

// Revenue from completed orders only - a buyer placing one doesn't count
// until the farmer's actually fulfilled it - over a period the farmer picks.
// One series, so no legend - the card title says what is plotted. Individual
// products are deliberately not broken out here: the farmer already has
// per-product leaderboards beside this chart, and naming products made the
// chart's shape change every time the mix changed.
const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
  { key: "custom", label: "Custom" },
];

const PLOT_HEIGHT = 208;
const Y_TICKS = 4;
const MAX_X_LABELS = 7;
const BRAND = "#2f8f66";

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
// Weeks start on Monday, so "This Week" doesn't reset mid-weekend.
const startOfWeek = (d) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));

const fmtDay = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtHour = (d) => d.toLocaleTimeString(undefined, { hour: "numeric" });
const fmtMonth = (d) => d.toLocaleDateString(undefined, { month: "short" });
const toInputDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Axis tops land on 1 / 2 / 2.5 / 5 x 10^n, so the gridline labels stay round.
function niceCeil(value) {
  if (value <= 0) return 10;
  const base = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (value <= step * base) return step * base;
  }
  return 10 * base;
}

// A smooth curve through every point, without ever overshooting past a
// point's real value between it and its neighbors - unlike a plain spline,
// it can't invent a bump or dip the data doesn't have. Standard monotone
// cubic Hermite interpolation (Fritsch-Carlson), converted to the cubic
// bezier segments an SVG path draws.
function smoothPath(points) {
  const n = points.length;
  if (n === 0) return "";
  if (n === 1) return `M ${points[0].x} ${points[0].y}`;

  const dx = [];
  const slopes = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    slopes[i] = dx[i] === 0 ? 0 : dy / dx[i];
  }

  const tangents = new Array(n);
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];
  for (let i = 1; i < n - 1; i += 1) {
    tangents[i] =
      slopes[i - 1] === 0 || slopes[i] === 0 || slopes[i - 1] > 0 !== slopes[i] > 0
        ? 0
        : (slopes[i - 1] + slopes[i]) / 2;
  }

  // Clamp each segment's tangents so the curve can't swing past either
  // endpoint's value - the guarantee that keeps this "monotone".
  for (let i = 0; i < n - 1; i += 1) {
    if (slopes[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = tangents[i] / slopes[i];
    const b = tangents[i + 1] / slopes[i];
    const h = Math.hypot(a, b);
    if (h > 3) {
      const t = 3 / h;
      tangents[i] *= t;
      tangents[i + 1] *= t;
    }
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cp1x = p0.x + dx[i] / 3;
    const cp1y = p0.y + (tangents[i] * dx[i]) / 3;
    const cp2x = p1.x - dx[i] / 3;
    const cp2y = p1.y - (tangents[i + 1] * dx[i]) / 3;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

// Money everywhere else in the app is shown in whole pesos, no centavos.
const formatMoney = (n) => `₱${Math.round(n).toLocaleString()}`;

function buildRange(period, custom, now) {
  if (period === "today") {
    const from = startOfDay(now);
    return {
      from,
      to: addDays(from, 1),
      prevFrom: addDays(from, -1),
      granularity: "hour",
      rangeLabel: now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
      comparedTo: "yesterday",
    };
  }
  if (period === "week") {
    const from = startOfWeek(now);
    return {
      from,
      to: addDays(from, 7),
      prevFrom: addDays(from, -7),
      granularity: "day",
      rangeLabel: `${fmtDay(from)} - ${fmtDay(addDays(from, 6))}`,
      comparedTo: "last week",
    };
  }
  if (period === "year") {
    const from = new Date(now.getFullYear(), 0, 1);
    return {
      from,
      to: new Date(now.getFullYear() + 1, 0, 1),
      prevFrom: new Date(now.getFullYear() - 1, 0, 1),
      granularity: "month",
      rangeLabel: String(now.getFullYear()),
      comparedTo: "last year",
    };
  }
  if (period === "custom") {
    let from = startOfDay(new Date(custom.from));
    let to = startOfDay(new Date(custom.to));
    // A half-typed or reversed range shouldn't blank the chart.
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      from = addDays(startOfDay(now), -29);
      to = startOfDay(now);
    }
    if (from > to) [from, to] = [to, from];
    const end = addDays(to, 1);
    const span = end - from;
    return {
      from,
      to: end,
      prevFrom: new Date(from.getTime() - span),
      granularity: span / 86400000 > 62 ? "month" : "day",
      rangeLabel: `${fmtDay(from)} - ${fmtDay(to)}`,
      comparedTo: "the period before",
    };
  }

  const from = startOfMonth(now);
  return {
    from,
    to: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    prevFrom: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    granularity: "day",
    rangeLabel: from.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    comparedTo: "last month",
  };
}

function buildBuckets(from, to, granularity) {
  const buckets = [];
  if (granularity === "hour") {
    for (let h = 0; h < 24; h += 1) {
      const start = new Date(from.getFullYear(), from.getMonth(), from.getDate(), h);
      buckets.push({ label: fmtHour(start), value: 0 });
    }
    return buckets;
  }
  if (granularity === "day") {
    for (let d = new Date(from); d < to; d = addDays(d, 1)) {
      buckets.push({ label: fmtDay(d), value: 0 });
    }
    return buckets;
  }
  for (let m = new Date(from.getFullYear(), from.getMonth(), 1); m < to; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    buckets.push({ label: fmtMonth(m), value: 0 });
  }
  return buckets;
}

// Which bucket a date falls in, by counting from the range start rather than
// searching - hours within a day, whole days, or whole months.
function bucketIndex(date, from, granularity) {
  if (granularity === "hour") return date.getHours();
  if (granularity === "day") {
    return Math.floor((startOfDay(date) - startOfDay(from)) / 86400000);
  }
  return (date.getFullYear() - from.getFullYear()) * 12 + (date.getMonth() - from.getMonth());
}

export default function DemandChart({ orders, loading }) {
  const [period, setPeriod] = useState("month");
  const [custom, setCustom] = useState(() => {
    const today = new Date();
    return { from: toInputDate(addDays(today, -29)), to: toInputDate(today) };
  });
  const [hovered, setHovered] = useState(null);

  const chart = useMemo(() => {
    const now = new Date();
    const { from, to, prevFrom, granularity, rangeLabel, comparedTo } = buildRange(period, custom, now);
    const buckets = buildBuckets(from, to, granularity);

    let total = 0;
    let previousTotal = 0;
    orders.forEach((order) => {
      // A placed order hasn't moved any produce yet - only count one the
      // farmer actually completed, dated by when that happened rather than
      // whenever the buyer first placed it.
      if (order.status !== "done") return;
      const completed = new Date(order.doneAt || order.createdAt);
      if (completed >= from && completed < to) {
        const i = bucketIndex(completed, from, granularity);
        if (buckets[i]) {
          buckets[i].value += order.total;
          total += order.total;
        }
      } else if (completed >= prevFrom && completed < from) {
        previousTotal += order.total;
      }
    });

    const peak = buckets.reduce((best, b, i) => (b.value > buckets[best]?.value ? i : best), 0);
    const change = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null;

    // Label at most a handful of x positions, always including both ends, so
    // the dates never collide.
    const step = Math.max(1, Math.ceil(buckets.length / MAX_X_LABELS));
    const ticks = buckets
      .map((b, i) => ({ ...b, i }))
      .filter(({ i }) => i % step === 0 || i === buckets.length - 1);

    return {
      buckets,
      total,
      previousTotal,
      change,
      peak,
      ticks,
      rangeLabel,
      comparedTo,
      max: niceCeil(Math.max(...buckets.map((b) => b.value), 0)),
    };
  }, [orders, period, custom]);

  const { buckets, max } = chart;
  const count = buckets.length;
  const xAt = (i) => (count > 1 ? (i / (count - 1)) * 100 : 50);
  const yAt = (value) => 100 - (value / max) * 100;

  const points = buckets.map((b, i) => ({ x: xAt(i), y: yAt(b.value) }));
  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${xAt(count - 1)} 100 L ${xAt(0)} 100 Z`;
  const hasOrders = chart.total > 0;

  const moveHover = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setHovered(Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1)))));
  };

  // Arrow keys walk the same readout the pointer gets.
  const handleKeyDown = (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const current = hovered ?? count - 1;
    if (e.key === "ArrowLeft") setHovered(Math.max(0, current - 1));
    if (e.key === "ArrowRight") setHovered(Math.min(count - 1, current + 1));
    if (e.key === "Home") setHovered(0);
    if (e.key === "End") setHovered(count - 1);
  };

  const active = hovered !== null ? buckets[hovered] : null;

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="rounded-t-xl bg-[#2f8f66] px-4 py-2 text-sm font-semibold text-white">
        Analytical Demands
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pb-2 pt-5">
        <div>
          <p className="text-xs text-gray-500">Revenue · {chart.rangeLabel}</p>
          <p className="mt-0.5 text-3xl font-semibold text-gray-900">
            {loading ? "—" : formatMoney(chart.total)}
          </p>
          {chart.change !== null && !loading && (
            <p
              className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                chart.change >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {chart.change >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {chart.change >= 0 ? "+" : ""}
              {Math.round(chart.change)}% vs {chart.comparedTo}
            </p>
          )}
          {chart.change === null && !loading && (
            <p className="mt-1 text-xs text-gray-400">Nothing sold {chart.comparedTo} to compare with</p>
          )}
        </div>

        <div className="flex flex-wrap gap-1 rounded-full bg-gray-100 p-1">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              aria-pressed={period === key}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                period === key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {period === "custom" && (
        <div className="flex flex-wrap items-center gap-3 px-6 pb-1 pt-2 text-xs text-gray-600">
          <label className="flex items-center gap-2">
            From
            <input
              type="date"
              value={custom.from}
              max={custom.to}
              onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
            />
          </label>
          <label className="flex items-center gap-2">
            To
            <input
              type="date"
              value={custom.to}
              min={custom.from}
              onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
            />
          </label>
        </div>
      )}

      <div className="px-6 pb-6 pt-3">
        <div className="flex">
          {/* Gridline values, in their own gutter so the plot stays full width */}
          <div
            className="relative w-10 shrink-0 text-right text-[10px] tabular-nums text-gray-400"
            style={{ height: PLOT_HEIGHT }}
          >
            {Array.from({ length: Y_TICKS + 1 }, (_, i) => (
              <span
                key={i}
                className="absolute right-2 -translate-y-1/2"
                style={{ top: `${(i / Y_TICKS) * 100}%` }}
              >
                {formatMoney((max * (Y_TICKS - i)) / Y_TICKS)}
              </span>
            ))}
          </div>

          <div
            role="img"
            tabIndex={0}
            aria-label={`Revenue, ${chart.rangeLabel}. Total ${formatMoney(chart.total)}.`}
            onMouseMove={moveHover}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(count - 1)}
            onBlur={() => setHovered(null)}
            onKeyDown={handleKeyDown}
            className="relative flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f8f66]"
            style={{ height: PLOT_HEIGHT }}
          >
            {Array.from({ length: Y_TICKS + 1 }, (_, i) => (
              <div
                key={i}
                className="absolute inset-x-0 border-t border-gray-100"
                style={{ top: `${(i / Y_TICKS) * 100}%` }}
              />
            ))}

            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="demand-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BRAND} stopOpacity="0.16" />
                  <stop offset="100%" stopColor={BRAND} stopOpacity="0" />
                </linearGradient>
              </defs>
              {hasOrders && (
                <>
                  <path d={areaPath} fill="url(#demand-fill)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke={BRAND}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              )}
            </svg>

            {!hasOrders && !loading && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                Nothing completed in this period yet
              </p>
            )}

            {/* The busiest point is labelled outright, so the headline number
                isn't the only value readable without hovering. */}
            {hasOrders && hovered === null && (
              <span
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded bg-white/90 px-1.5 text-[10px] font-semibold tabular-nums text-gray-700"
                style={{ left: `${xAt(chart.peak)}%`, top: `calc(${yAt(buckets[chart.peak].value)}% - 8px)` }}
              >
                {formatMoney(buckets[chart.peak].value)}
              </span>
            )}

            {hasOrders && active && (
              <>
                <div
                  className="pointer-events-none absolute top-0 h-full w-px bg-gray-300"
                  style={{ left: `${xAt(hovered)}%` }}
                />
                <span
                  className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                  style={{
                    left: `${xAt(hovered)}%`,
                    top: `${yAt(active.value)}%`,
                    backgroundColor: BRAND,
                  }}
                />
                <div
                  className="pointer-events-none absolute z-10 -translate-y-full rounded-lg bg-white px-2.5 py-1.5 shadow-lg ring-1 ring-gray-100"
                  style={{
                    left: `${xAt(hovered)}%`,
                    top: `calc(${yAt(active.value)}% - 14px)`,
                    transform: `translate(${hovered < count * 0.15 ? "0" : hovered > count * 0.85 ? "-100%" : "-50%"}, -100%)`,
                  }}
                >
                  <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-gray-900">
                    {formatMoney(active.value)}
                  </p>
                  <p className="whitespace-nowrap text-[10px] text-gray-500">{active.label}</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="relative ml-10 mt-2 h-4">
          {chart.ticks.map(({ i, label }) => (
            <span
              key={i}
              className="absolute whitespace-nowrap text-[10px] text-gray-400"
              style={{
                left: `${xAt(i)}%`,
                transform: `translateX(${i === 0 ? "0" : i === count - 1 ? "-100%" : "-50%"})`,
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* The same numbers without hovering, for screen readers. A <table>
            won't actually shrink to sr-only's 1px box on its own - CSS never
            compresses a table below its rows' natural height - so the sr-only
            wrapper has to be a plain div; without it, this ends up rendered at
            full size and inflates the page's scrollable height. */}
        <div className="sr-only">
          <table>
            <caption>Revenue, {chart.rangeLabel}</caption>
            <thead>
              <tr>
                <th scope="col">Period</th>
                <th scope="col">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b, i) => (
                <tr key={i}>
                  <th scope="row">{b.label}</th>
                  <td>{formatMoney(b.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
