import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLORS, DAY_MS, METRICS, WEEKDAYS, addDays, dateOfKey, fmtDay, fmtHour, keyOf, startOfDay } from "./analytics";
import { Badge, EmptyState, Key, TooltipBox, ViewHeading } from "./ChartParts";

const HEIGHT = 250;
const revenue = METRICS[0];

// How the two periods are cut into matching points: by hour for a day, by
// weekday for a week, by week of the month for a month, by month for a year,
// and by day, week or month for a custom range depending on its length.
function cutting(range, period) {
  if (period === "today") return { unit: "hour", word: "Hourly", noun: "hour" };
  if (period === "week") return { unit: "day", size: 1, word: "Daily", noun: "day" };
  if (period === "month") return { unit: "monthWeek", word: "Weekly", noun: "week" };
  if (period === "year") return { unit: "month", word: "Monthly", noun: "month" };
  const days = Math.round((range.to - range.from) / DAY_MS);
  if (days <= 31) return { unit: "day", size: 1, word: "Daily", noun: "day" };
  if (days <= 184) return { unit: "day", size: 7, word: "Weekly", noun: "week" };
  return { unit: "day", size: 30, word: "Monthly", noun: "month" };
}

// Which point a day falls in, counted from the start of its own period.
function pointOf(day, start, cut) {
  if (cut.unit === "monthWeek") return Math.floor((day.getDate() - 1) / 7);
  if (cut.unit === "month") return (day.getFullYear() - start.getFullYear()) * 12 + day.getMonth() - start.getMonth();
  return Math.floor(Math.round((startOfDay(day) - start) / DAY_MS) / cut.size);
}

function series(data, range, period, now) {
  const cut = cutting(range, period);
  const { from, to, prevFrom } = range;

  const points = [];
  const at = (k) => {
    while (points.length <= k) points.push({ k: points.length, current: 0, previous: 0, start: null });
    return points[k];
  };

  if (cut.unit === "hour") {
    for (let h = 0; h < 24; h += 1) {
      const start = new Date(from.getFullYear(), from.getMonth(), from.getDate(), h);
      Object.assign(at(h), { start, label: fmtHour(start) });
    }
    const byKey = (rows) => new Map(rows.map((r) => [r.key, r.revenue]));
    const cur = byKey(data.current);
    const prev = byKey(data.previous);
    points.forEach((p) => {
      p.current = cur.get(keyOf(p.start, "hour")) || 0;
      const y = new Date(p.start.getTime() - DAY_MS);
      p.previous = prev.get(keyOf(y, "hour")) || 0;
    });
  } else {
    // Every point the current period has, whether or not anything sold in it.
    for (let d = new Date(from); d < to; d = addDays(d, 1)) {
      const p = at(pointOf(d, from, cut));
      if (!p.start) p.start = d;
    }
    data.days.forEach((row) => {
      const p = at(pointOf(dateOfKey(row.key), from, cut));
      p.current += row.revenue;
    });
    data.previousDays.forEach((row) => {
      const k = pointOf(dateOfKey(row.key), prevFrom, cut);
      if (k >= 0) at(k).previous += row.revenue;
    });
    points.forEach((p) => {
      p.label =
        cut.unit === "monthWeek"
          ? `Week ${p.k + 1}`
          : cut.unit === "month"
            ? p.start?.toLocaleDateString(undefined, { month: "short" }) ?? ""
            : period === "week"
              ? WEEKDAYS[p.k]
              : p.start
                ? fmtDay(p.start)
                : "";
    });
  }

  // Nothing is drawn for this period beyond today - a line running along the
  // bottom through the future would read as sales that fell to nothing.
  points.forEach((p) => {
    if (p.start && p.start > now) p.current = null;
    if (!p.start) p.current = null;
  });

  // The verdict compares like with like: this period so far against the same
  // stretch of the one before, not a whole last month against part of this one.
  let soFar = 0;
  let before = 0;
  if (cut.unit === "hour") {
    points.forEach((p) => {
      if (p.current !== null) {
        soFar += p.current;
        before += p.previous;
      }
    });
  } else {
    const elapsed = Math.round((startOfDay(now) - from) / DAY_MS);
    data.days.forEach((row) => {
      soFar += row.revenue;
    });
    data.previousDays.forEach((row) => {
      if (Math.round((dateOfKey(row.key) - prevFrom) / DAY_MS) <= elapsed) before += row.revenue;
    });
  }
  const previousTotal = data.previousDays.reduce((sum, r) => sum + r.revenue, 0);
  return { points, cut, soFar, before, previousTotal };
}

// This period's sales against the last one's, point for point.
export default function TrendChart({ data, range, period }) {
  const trend = useMemo(() => series(data, range, period, new Date()), [data, range, period]);
  const { points, cut, soFar, before } = trend;

  const names = {
    today: ["Today", "yesterday"],
    week: ["This week", "last week"],
    month: [
      range.from.toLocaleDateString(undefined, { month: "long" }),
      range.prevFrom.toLocaleDateString(undefined, { month: "long" }),
    ],
    year: [String(range.from.getFullYear()), String(range.prevFrom.getFullYear())],
    custom: [range.rangeLabel, `${fmtDay(range.prevFrom)} - ${fmtDay(addDays(range.from, -1))}`],
  }[period];
  const subtitle = `${cut.word} revenue · ${names[0]} vs ${names[1]}`;

  const change = before > 0 ? ((soFar - before) / before) * 100 : null;
  const badge =
    change === null ? (
      <Badge tone="gray">No data to compare</Badge>
    ) : (
      <Badge
        tone={change >= 0 ? "green" : "red"}
        title={`Sales so far (${revenue.format(soFar)}) against the same stretch of ${names[1]} (${revenue.format(before)})`}
      >
        {change >= 0 ? "▲" : "▼"} {Math.abs(Math.round(change))}% vs {range.comparedTo}
      </Badge>
    );

  if (soFar === 0 && trend.previousTotal === 0) {
    return (
      <div className="space-y-4">
        <ViewHeading subtitle={subtitle} badge={badge} />
        <EmptyState title="Not enough sales yet — check back after a few more orders">
          Once orders are completed, this compares each {cut.noun} with the same {cut.noun} of {names[1]}.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ViewHeading subtitle={subtitle} badge={badge} />
      <div data-testid="trend-chart">
        <ResponsiveContainer width="100%" height={HEIGHT}>
          <ComposedChart data={points} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.blue} stopOpacity={0.18} />
                <stop offset="100%" stopColor={COLORS.blue} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={COLORS.grid} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: COLORS.muted }}
              axisLine={{ stroke: "#D5DDD8" }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              tickFormatter={revenue.compact}
              tick={{ fontSize: 11, fill: COLORS.muted }}
              axisLine={false}
              tickLine={false}
              width={52}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload;
                return (
                  <TooltipBox
                    title={label}
                    lines={[
                      ...(p.current !== null ? [[names[0], revenue.format(p.current), COLORS.blue]] : []),
                      [names[1][0].toUpperCase() + names[1].slice(1), revenue.format(p.previous), "#9AA59F"],
                    ]}
                  />
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="previous"
              stroke="#9AA59F"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="current"
              stroke={COLORS.blue}
              strokeWidth={2.5}
              fill="url(#trend-fill)"
              dot={{ r: 3.5, fill: "#fff", stroke: COLORS.blue, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: COLORS.muted }}>
        <Key swatch={<span className="h-0.5 w-4 rounded" style={{ background: COLORS.blue }} />}>{names[0]}</Key>
        <Key swatch={<span className="w-4 border-t-2 border-dashed" style={{ borderColor: "#9AA59F" }} />}>
          {names[1][0].toUpperCase() + names[1].slice(1)}
        </Key>
      </div>
    </div>
  );
}
