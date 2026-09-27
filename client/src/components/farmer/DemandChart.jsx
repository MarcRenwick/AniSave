import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, TrendingDown, TrendingUp, X } from "lucide-react";
import useMediaQuery, { PHONE } from "../../hooks/useMediaQuery";

// Completed orders only - a buyer placing one doesn't count until the farmer
// has actually fulfilled it - over a period the farmer picks. One series, so
// the legend only names it. Individual products are deliberately not broken
// out here, since the farmer already has per-product leaderboards beside this
// chart, and naming products made the chart's shape change every time the mix
// changed.
//
// The same orders can be read two ways: what they were worth, and how much
// produce actually left the farm. A farmer selling a cheap crop in bulk and
// one selling an expensive crop by the kilo are looking for different bars.
//
// Bars rather than a line: a line drawn from one day to the next suggests
// sales in between that never happened. Each bar is one day (or hour, or
// month), and tapping it lists the orders behind it.
const METRICS = [
  {
    key: "revenue",
    label: "Revenue (₱)",
    noun: "revenue",
    legend: "Revenue",
    valueOf: (order) => order.total,
    format: (n) => `₱${Math.round(n).toLocaleString()}`,
  },
  {
    key: "quantity",
    label: "Quantity sold (kg)",
    noun: "kilos sold",
    legend: "Kilos sold",
    valueOf: (order) => order.quantity,
    format: (n) => `${Math.round(n).toLocaleString()} kg`,
  },
];

const PERIODS = [
  { key: "today", label: "Today", total: "total today" },
  { key: "week", label: "This week", total: "total this week" },
  { key: "month", label: "This month", total: "total this month" },
  { key: "year", label: "This year", total: "total this year" },
  { key: "custom", label: "Custom", icon: CalendarDays, total: "total in this range" },
];

// "Daily revenue", "Hourly kilos sold"...
const EVERY = { hour: "Hourly", day: "Daily", month: "Monthly" };

const PLOT_HEIGHT = 208;
const Y_TICKS = 4;
const MAX_X_LABELS = 7;
const MAX_X_LABELS_PHONE = 4;
// The orders listed under a tapped bar before the rest are left to the Orders page.
const MAX_LISTED = 5;

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
// Weeks start on Monday, so "This week" doesn't reset mid-weekend.
const startOfWeek = (d) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));

const fmtDay = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const fmtHour = (d) => d.toLocaleTimeString(undefined, { hour: "numeric" });
const fmtMonth = (d) => d.toLocaleDateString(undefined, { month: "short" });
const toInputDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// The top gridline sits a little ABOVE the busiest bar, never on it, so the
// bar's label has room above it. The axis is Y_TICKS equal steps, each
// 1 / 1.2 / 1.5 / 2 / 2.5 / 3 / 4 / 5 / 6 / 8 x 10^n, so every gridline label
// stays a round number.
const AXIS_HEADROOM = 1.15;
function axisTop(peak) {
  if (peak <= 0) return 10;
  const needed = Math.max((peak * AXIS_HEADROOM) / Y_TICKS, 1);
  const base = 10 ** Math.floor(Math.log10(needed));
  for (const step of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (needed <= step * base) return step * base * Y_TICKS;
  }
  return 10 * base * Y_TICKS;
}

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

// Each bar: what its axis label says (short, and "Today" or "Now" for the one
// happening right now), what its readout says (in full), and the orders in it.
function buildBuckets(from, to, granularity, period) {
  const buckets = [];
  if (granularity === "hour") {
    for (let h = 0; h < 24; h += 1) {
      const start = new Date(from.getFullYear(), from.getMonth(), from.getDate(), h);
      const end = new Date(from.getFullYear(), from.getMonth(), from.getDate(), h + 1);
      buckets.push({ start, end, label: fmtHour(start), full: `${fmtHour(start)} - ${fmtHour(end)}` });
    }
  } else if (granularity === "day") {
    for (let d = new Date(from); d < to; d = addDays(d, 1)) {
      const label =
        period === "month"
          ? String(d.getDate())
          : period === "week"
            ? d.toLocaleDateString(undefined, { weekday: "short" })
            : fmtDay(d);
      buckets.push({
        start: d,
        end: addDays(d, 1),
        label,
        full: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      });
    }
  } else {
    for (let m = new Date(from.getFullYear(), from.getMonth(), 1); m < to; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      buckets.push({
        start: m,
        end: new Date(m.getFullYear(), m.getMonth() + 1, 1),
        label: fmtMonth(m),
        full: m.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      });
    }
  }
  return buckets.map((b) => ({ ...b, value: 0, orders: [] }));
}

// Which bucket a date falls in, by counting from the range start rather than
// searching - hours within a day, whole days, or whole months.
function bucketIndex(date, from, granularity) {
  if (granularity === "hour") return date.getHours();
  if (granularity === "day") {
    return Math.round((startOfDay(date) - startOfDay(from)) / 86400000);
  }
  return (date.getFullYear() - from.getFullYear()) * 12 + (date.getMonth() - from.getMonth());
}

// A segmented control: the chosen option filled in AniSave green, so which one
// is on is never in doubt.
function Segmented({ label, options, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <div role="group" aria-label={label} className="inline-flex flex-wrap gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5">
        {options.map(({ key, label: text, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={value === key}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              value === key ? "bg-[#2f8f66] text-white shadow-sm" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DemandChart({ orders, loading }) {
  const [metricKey, setMetricKey] = useState("revenue");
  const metric = METRICS.find((m) => m.key === metricKey) || METRICS[0];
  const [period, setPeriod] = useState("month");
  const [custom, setCustom] = useState(() => {
    const today = new Date();
    return { from: toInputDate(addDays(today, -29)), to: toInputDate(today) };
  });
  // The bar under the pointer (or keyboard focus), and the bar tapped open.
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);
  const barRefs = useRef([]);
  const phone = useMediaQuery(PHONE);

  const chart = useMemo(() => {
    const now = new Date();
    const range = buildRange(period, custom, now);
    const { from, to, prevFrom, granularity } = range;
    const buckets = buildBuckets(from, to, granularity, period);

    let total = 0;
    let previousTotal = 0;
    orders.forEach((order) => {
      // A placed order hasn't moved any produce yet - only count one the
      // farmer actually completed, dated by when that happened rather than
      // whenever the buyer first placed it.
      if (order.status !== "done") return;
      const completed = new Date(order.doneAt || order.createdAt);
      if (completed >= from && completed < to) {
        const bucket = buckets[bucketIndex(completed, from, granularity)];
        if (bucket) {
          bucket.value += metric.valueOf(order);
          bucket.orders.push(order);
          total += metric.valueOf(order);
        }
      } else if (completed >= prevFrom && completed < from) {
        previousTotal += metric.valueOf(order);
      }
    });
    buckets.forEach((b) => b.orders.sort((x, y) => new Date(y.doneAt || y.createdAt) - new Date(x.doneAt || x.createdAt)));

    const count = buckets.length;
    const current = buckets.findIndex((b) => now >= b.start && now < b.end);
    if (current !== -1 && granularity !== "month") buckets[current].label = granularity === "hour" ? "Now" : "Today";
    const peak = buckets.reduce((best, b, i) => (b.value > buckets[best].value ? i : best), 0);
    const hasOrders = total > 0;

    // Label a handful of bars, never so close together that they collide:
    // the one happening now first, then the last, then the busiest, then an
    // even spread. A phone's narrow chart gets fewer.
    const step = Math.max(1, Math.ceil(count / (phone ? MAX_X_LABELS_PHONE : MAX_X_LABELS)));
    const minGap = step === 1 ? 1 : phone ? step : Math.max(2, Math.floor(step / 2));
    const wanted = [current, count - 1, hasOrders ? peak : -1];
    for (let i = 0; i < count; i += step) wanted.push(i);
    const ticks = [];
    wanted.forEach((i) => {
      if (i >= 0 && !ticks.includes(i) && ticks.every((t) => Math.abs(t - i) >= minGap)) ticks.push(i);
    });

    return {
      ...range,
      buckets,
      total,
      change: previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null,
      current,
      peak,
      hasOrders,
      ticks,
      max: axisTop(Math.max(...buckets.map((b) => b.value), 0)),
    };
  }, [orders, period, custom, metric, phone]);

  const { buckets, max, granularity } = chart;
  const count = buckets.length;
  const heightOf = (value) => (value > 0 ? (value / max) * 100 : 0);
  const centerOf = (i) => ((i + 0.5) / count) * 100;
  // A readout near either edge opens inwards, so it never hangs off the card.
  const shiftOf = (i) => (i < count * 0.15 ? "0%" : i > count * 0.85 ? "-100%" : "-50%");
  const periodInfo = PERIODS.find((p) => p.key === period);
  const open = selected !== null ? buckets[selected] : null;
  const focusable = selected ?? (chart.current !== -1 ? chart.current : count - 1);

  // A new period or range is a different set of bars.
  const choosePeriod = (key) => {
    setPeriod(key);
    setSelected(null);
    setHovered(null);
  };
  const changeCustom = (patch) => {
    setCustom((c) => ({ ...c, ...patch }));
    setSelected(null);
  };

  // Arrow keys walk the bars; Enter or Space opens one, as a tap does.
  const handleKeyDown = (e, i) => {
    const next = { ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: count - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const target = Math.min(count - 1, Math.max(0, next));
    barRefs.current[target]?.focus();
  };

  return (
    <section className="rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm sm:p-6" data-testid="demand-chart">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Analytical Demands</h2>
          <p className="text-sm font-medium text-[#2f8f66]" data-testid="chart-subtitle">
            {EVERY[granularity]} {metric.noun} · {chart.rangeLabel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-tight text-gray-900" data-testid="chart-total">
            {loading ? "—" : metric.format(chart.total)}
          </p>
          <p className="text-xs text-gray-500">{periodInfo.total}</p>
          {chart.change !== null && !loading && (
            <p
              className={`mt-0.5 flex items-center justify-end gap-1 text-xs font-medium ${
                chart.change >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {chart.change >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {chart.change >= 0 ? "+" : ""}
              {Math.round(chart.change)}% vs {chart.comparedTo}
            </p>
          )}
        </div>
      </div>

      {/* What is plotted, then over what - one bar, labelled, so the two
          groups can't be mistaken for each other. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl bg-gray-50 p-3" data-testid="chart-filters">
        <Segmented label="Show" options={METRICS} value={metricKey} onChange={setMetricKey} />
        <span className="hidden h-6 w-px bg-gray-200 sm:block" aria-hidden="true" />
        <Segmented label="Period" options={PERIODS} value={period} onChange={choosePeriod} />
        {period === "custom" && (
          <div className="flex w-full flex-wrap items-center gap-3 text-xs text-gray-600">
            <label className="flex items-center gap-2">
              From
              <input
                type="date"
                value={custom.from}
                max={custom.to}
                onChange={(e) => changeCustom({ from: e.target.value })}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
              />
            </label>
            <label className="flex items-center gap-2">
              To
              <input
                type="date"
                value={custom.to}
                min={custom.from}
                onChange={(e) => changeCustom({ to: e.target.value })}
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
              />
            </label>
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="flex">
          {/* Gridline values, in their own gutter so the bars keep the width */}
          <div className="relative w-12 shrink-0 text-right text-[10px] tabular-nums text-gray-400" style={{ height: PLOT_HEIGHT }}>
            {Array.from({ length: Y_TICKS + 1 }, (_, i) => (
              <span key={i} className="absolute right-2 -translate-y-1/2" style={{ top: `${(i / Y_TICKS) * 100}%` }}>
                {metric.format((max * (Y_TICKS - i)) / Y_TICKS)}
              </span>
            ))}
          </div>

          <div className="relative flex-1" style={{ height: PLOT_HEIGHT }}>
            {Array.from({ length: Y_TICKS + 1 }, (_, i) => (
              <div
                key={i}
                className={`absolute inset-x-0 border-t ${i === Y_TICKS ? "border-gray-300" : "border-gray-100"}`}
                style={{ top: `${(i / Y_TICKS) * 100}%` }}
              />
            ))}

            {!chart.hasOrders && !loading && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                Nothing completed in this period yet
              </p>
            )}

            <div
              role="group"
              aria-label={`${metric.legend} per ${granularity}, ${chart.rangeLabel}. Total ${metric.format(chart.total)}.`}
              className="absolute inset-0 flex items-end"
              onMouseLeave={() => setHovered(null)}
            >
              {buckets.map((b, i) => {
                const height = heightOf(b.value);
                const isCurrent = i === chart.current;
                const isOpen = i === selected;
                // The busiest bar and the one happening now carry their value,
                // so the headline isn't the only number readable at a glance.
                const labelled = b.value > 0 && hovered !== i && (i === chart.peak || isCurrent);
                return (
                  <button
                    key={i}
                    ref={(el) => {
                      barRefs.current[i] = el;
                    }}
                    type="button"
                    data-index={i}
                    tabIndex={i === focusable ? 0 : -1}
                    aria-pressed={isOpen}
                    aria-label={`${b.full}: ${metric.format(b.value)}, ${b.orders.length} order${b.orders.length === 1 ? "" : "s"}`}
                    onClick={() => setSelected(isOpen ? null : i)}
                    onMouseEnter={() => setHovered(i)}
                    onFocus={() => setHovered(i)}
                    onBlur={() => setHovered(null)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    className="group relative flex h-full min-w-0 flex-1 items-end justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2f8f66]"
                  >
                    <span
                      className={`block w-[70%] max-w-10 rounded-t-[3px] transition-colors ${
                        isOpen
                          ? "bg-[#1f5c42]"
                          : isCurrent
                            ? "bg-[#2f8f66]/30 ring-2 ring-inset ring-[#2f8f66]"
                            : "bg-[#2f8f66] group-hover:bg-[#267a56]"
                      }`}
                      style={{ height: height > 0 ? `max(${height}%, 3px)` : 0 }}
                    />
                    {labelled && (
                      <span
                        className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold tabular-nums text-gray-700"
                        style={{ bottom: `calc(${height}% + 4px)` }}
                      >
                        {metric.format(b.value)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {hovered !== null && buckets[hovered] && (
              <div
                className="pointer-events-none absolute z-10 rounded-lg bg-white px-2.5 py-1.5 shadow-lg ring-1 ring-gray-100"
                style={{
                  left: `${centerOf(hovered)}%`,
                  bottom: `min(calc(${heightOf(buckets[hovered].value)}% + 8px), calc(100% - 48px))`,
                  transform: `translateX(${shiftOf(hovered)})`,
                }}
                data-testid="chart-readout"
              >
                <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-gray-900">
                  {metric.format(buckets[hovered].value)}
                </p>
                <p className="whitespace-nowrap text-[10px] text-gray-500">
                  {buckets[hovered].full} · {buckets[hovered].orders.length} order
                  {buckets[hovered].orders.length === 1 ? "" : "s"}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="relative ml-12 mt-2 h-4" data-testid="chart-axis">
          {chart.ticks.map((i) => (
            <span
              key={i}
              className={`absolute -translate-x-1/2 whitespace-nowrap text-[10px] ${
                i === chart.current ? "font-semibold text-gray-800" : "text-gray-400"
              }`}
              style={{ left: `${centerOf(i)}%` }}
            >
              {buckets[i].label}
            </span>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#2f8f66]" aria-hidden="true" />
            {metric.legend} per {granularity}
          </span>
          <span>Tip: tap a bar to see that {granularity}&apos;s orders</span>
        </div>

        {open && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4" data-testid="chart-orders">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{open.full}</p>
                <p className="text-xs text-gray-500">
                  {open.orders.length} completed order{open.orders.length === 1 ? "" : "s"} ·{" "}
                  {metric.format(open.value)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {open.orders.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No orders were completed in this {granularity}.</p>
            ) : (
              <ul className="mt-2 divide-y divide-gray-200">
                {open.orders.slice(0, MAX_LISTED).map((order) => (
                  <li key={order._id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0 text-sm">
                      <p className="truncate font-medium text-gray-900">{order.buyer?.name || "A buyer"}</p>
                      <p className="truncate text-xs text-gray-500">
                        {order.quantity} kg of {order.productTitle} · ₱{Number(order.total).toLocaleString()}
                      </p>
                    </div>
                    <Link
                      to={`/farmer/orders/${order._id}`}
                      className="shrink-0 rounded-md border border-[#2f8f66] bg-white px-3 py-1.5 text-xs font-semibold text-[#2f8f66] transition hover:bg-green-50"
                    >
                      View order
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {open.orders.length > MAX_LISTED && (
              <Link to="/farmer/orders" className="mt-2 inline-block text-xs font-semibold text-[#2f8f66] hover:underline">
                +{open.orders.length - MAX_LISTED} more in Orders
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
