import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  useActiveTooltipLabel,
} from "recharts";
import { COLORS, buildBuckets, fmtDay, fmtHour, ordersBetween, pickTicks } from "./analytics";
import { EmptyState, Key, OrdersPanel, TooltipBox, ViewHeading } from "./ChartParts";

const EVERY = { hour: "Hourly", day: "Daily", month: "Monthly" };
const BEST = { hour: "Best hour", day: "Best day", month: "Best month" };
const HEIGHT = 260;

// Tells the card which point the chart's own keyboard navigation is on, so
// Enter can open it the way a tap does.
function ActiveBar({ onChange }) {
  const label = useActiveTooltipLabel();
  useEffect(() => onChange(label === undefined || label === null ? null : Number(label)), [label, onChange]);
  return null;
}

function Stat({ label, value, detail, testId }) {
  return (
    <div className="min-w-0 rounded-xl bg-[#f6f1e6] px-3 py-2.5" data-testid={testId}>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: COLORS.muted }}>
        {label}
      </p>
      <p className="truncate text-base font-bold tabular-nums text-gray-900">{value}</p>
      {detail && (
        <p className="truncate text-[11px]" style={{ color: COLORS.muted }} title={detail}>
          {detail}
        </p>
      )}
    </div>
  );
}

// Revenue (or kilos) over the period as one line - the running total, so it
// climbs with every sale - with each day's own figure in its readout. Tapping
// a point on the line lists that day's orders.
export default function RevenueChart({ data, range, period, metric, orders, phone }) {
  const [selected, setSelected] = useState(null);
  const active = useRef(null);
  const onActive = useCallback((i) => {
    active.current = i;
  }, []);
  const { granularity } = range;
  const { current: rows, days, products } = data;

  const chart = useMemo(() => {
    const buckets = buildBuckets(range, period, rows, new Date());
    // Each bar's own figure, and everything up to and including it.
    const points = [];
    for (const b of buckets) {
      const value = b[metric.field];
      const before = points.length ? points[points.length - 1].sum : 0;
      points.push({ ...b, value, sum: before + value, running: b.upcoming ? null : before + value });
    }
    const total = points.length ? points[points.length - 1].sum : 0;
    const current = points.findIndex((b) => b.isCurrent);
    const peak = points.reduce((best, b, i) => (b.value > points[best].value ? i : best), 0);
    const firstUpcoming = points.findIndex((b) => b.upcoming);
    const saleDays = days.filter((d) => d[metric.field] > 0).length;
    const top = [...products].sort((a, b) => b[metric.field] - a[metric.field])[0];
    return { points, total, current, peak, firstUpcoming, saleDays, top };
  }, [rows, days, products, range, period, metric]);

  const { points, total, current, peak } = chart;
  const open = selected !== null ? points[selected] : null;
  const toggle = (i) => setSelected((s) => (s === i ? null : i));
  const unit = granularity;

  const bestLabel = (b) =>
    granularity === "hour" ? fmtHour(b.start) : granularity === "day" ? fmtDay(b.start) : b.full;

  const subtitle = `${EVERY[granularity]} ${metric.noun} · ${range.rangeLabel}`;

  if (total === 0) {
    return (
      <div className="space-y-4">
        <ViewHeading subtitle={subtitle} />
        <EmptyState title="Nothing completed in this period yet">
          Completed orders show up here as bars, one per {unit}, with the running total over them.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ViewHeading subtitle={subtitle} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="revenue-stats">
        <Stat label={metric.total} value={metric.format(total)} testId="chart-total" />
        <Stat label={BEST[granularity]} value={metric.format(points[peak].value)} detail={bestLabel(points[peak])} testId="stat-best" />
        <Stat
          label="Avg per sale day"
          value={metric.format(chart.saleDays ? total / chart.saleDays : 0)}
          detail={`${chart.saleDays} sale day${chart.saleDays === 1 ? "" : "s"}`}
          testId="stat-average"
        />
        <Stat
          label="Top product"
          value={chart.top ? chart.top.title : "—"}
          detail={chart.top ? metric.format(chart.top[metric.field]) : ""}
          testId="stat-top-product"
        />
      </div>

      <div
        className="rounded-xl focus-within:outline-none"
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && active.current !== null) {
            e.preventDefault();
            toggle(active.current);
          }
        }}
        data-testid="revenue-chart"
      >
        <ResponsiveContainer width="100%" height={HEIGHT}>
          <ComposedChart
            data={points}
            margin={{ top: 16, right: 8, bottom: 0, left: 0 }}
            className="cursor-pointer"
            onClick={(state) => {
              const i = state?.activeTooltipIndex;
              if (i !== undefined && i !== null && points[Number(i)] && !points[Number(i)].upcoming) toggle(Number(i));
            }}
          >
            <CartesianGrid vertical={false} stroke={COLORS.grid} />
            {chart.firstUpcoming > 0 && (
              <ReferenceArea
                x1={chart.firstUpcoming}
                x2={points.length - 1}
                fill="#f6f1e6"
                fillOpacity={1}
                ifOverflow="extendDomain"
                // Named on the chart only where the shaded stretch is wide enough
                // to hold the word; the legend says what the shading is either way.
                label={
                  !phone && points.length - chart.firstUpcoming >= 5
                    ? { value: "Upcoming", position: "insideBottom", fill: "#786f5d", fontSize: 11 }
                    : undefined
                }
              />
            )}
            <XAxis
              dataKey="i"
              type="category"
              ticks={pickTicks(points.length, current, peak, phone)}
              tickFormatter={(i) => points[i]?.label ?? ""}
              tick={{ fontSize: 11, fill: COLORS.muted }}
              axisLine={{ stroke: "#d4c9b3" }}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tickFormatter={metric.compact}
              tick={{ fontSize: 11, fill: COLORS.muted }}
              axisLine={false}
              tickLine={false}
              width={52}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: "#C9D3CD", strokeDasharray: "3 3" }}
              content={({ active: shown, payload }) => {
                if (!shown || !payload?.length) return null;
                const b = payload[0].payload;
                return (
                  <TooltipBox
                    title={b.full}
                    lines={[
                      ...(b.running !== null ? [["Running total", metric.format(b.running), COLORS.orange]] : []),
                      [`This ${unit}`, metric.format(b.value)],
                      ["Orders", String(b.orders)],
                    ]}
                  />
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="running"
              name="Running total"
              stroke={COLORS.orange}
              strokeWidth={2.5}
              // Only two points are marked: now (hollow, dashed), and the one
              // tapped open.
              dot={({ cx, cy, index }) =>
                cy == null ? null : index === current ? (
                  <circle key={index} cx={cx} cy={cy} r={5} fill="#fff" stroke={COLORS.orange} strokeWidth={2} strokeDasharray="2 2" data-testid="point-current" />
                ) : index === selected ? (
                  <circle key={index} cx={cx} cy={cy} r={5} fill={COLORS.orange} stroke="#fff" strokeWidth={2} data-testid="point-selected" />
                ) : (
                  <g key={index} />
                )
              }
              activeDot={{ r: 5, fill: COLORS.orange, stroke: "#fff", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            <ActiveBar onChange={onActive} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: COLORS.muted }} data-testid="chart-legend">
        <Key swatch={<span className="h-0.5 w-4 rounded" style={{ background: COLORS.orange }} />}>
          {metric.legend}, running total
        </Key>
        {current !== -1 && granularity !== "month" && (
          <Key swatch={<span className="h-2.5 w-2.5 rounded-full border-2 border-dashed bg-white" style={{ borderColor: COLORS.orange }} />}>
            {granularity === "hour" ? "Now" : "Today"}
          </Key>
        )}
        {chart.firstUpcoming > 0 && <Key swatch={<span className="h-2.5 w-2.5 rounded-sm bg-[#ece5d6]" />}>Upcoming</Key>}
        <span>Tip: tap the line to see that {unit}&apos;s orders</span>
      </div>

      {open && (
        <OrdersPanel
          title={open.full}
          orders={ordersBetween(orders, open.start, open.end)}
          summary={metric.format(open.value)}
          emptyText={`No orders were completed in this ${unit}.`}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
