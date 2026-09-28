import { CalendarDays } from "lucide-react";

// What the Analytical Demands views share: the colours, the periods a farmer
// can pick, how a period is cut into bars, and how figures are written.

export const COLORS = {
  green: "#1F7A4D",
  darkGreen: "#17603F",
  lightGreen: "#3FA46E",
  paleGreen: "#A8D8BC",
  orange: "#E8742C",
  blue: "#2D63AA",
  purple: "#6446B8",
  amber: "#B7700C",
  red: "#C8453B",
  muted: "#53635A",
  border: "#E1E7E2",
  grid: "#EEF1EF",
};

export const FONT = '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';

// The same completed orders read as what they were worth, or as how much
// produce left the farm.
export const METRICS = [
  {
    key: "revenue",
    label: "Revenue (₱)",
    noun: "revenue",
    legend: "Revenue",
    total: "Total revenue",
    field: "revenue",
    format: (n) => peso(n),
    compact: (n) => `₱${compactNumber(n)}`,
  },
  {
    key: "quantity",
    label: "Quantity sold (kg)",
    noun: "kilos sold",
    legend: "Kilos sold",
    total: "Total sold",
    field: "kg",
    format: (n) => `${(Math.round(n * 100) / 100).toLocaleString()} kg`,
    compact: (n) => `${compactNumber(n)} kg`,
  },
];

export const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Custom", icon: CalendarDays },
];

// "₱1,234" - whole pesos with thousands separators, for figures in a chart.
export const peso = (n) => `${n < 0 ? "-" : ""}₱${Math.round(Math.abs(n)).toLocaleString()}`;
// "1.2k" for an axis, where there is no room for "1,200".
export function compactNumber(n) {
  const abs = Math.abs(n);
  if (abs >= 1000000) return `${+(n / 1000000).toFixed(1)}M`;
  if (abs >= 1000) return `${+(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

export const DAY_MS = 86400000;
export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
// Weeks start on Monday, so "This week" doesn't reset mid-weekend.
export const startOfWeek = (d) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
// Monday first: 0 = Monday ... 6 = Sunday.
export const weekdayIndex = (d) => (d.getDay() + 6) % 7;
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const WEEKDAYS_LONG = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"];

export const fmtDay = (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const fmtHour = (d) => d.toLocaleTimeString(undefined, { hour: "numeric" });
export const fmtMonth = (d) => d.toLocaleDateString(undefined, { month: "short" });
const pad = (n) => String(n).padStart(2, "0");
export const toInputDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// How the server writes a bucket down (in the time zone it was sent), so a row
// it returns can be matched to a bar here.
export function keyOf(date, granularity) {
  const day = toInputDate(date);
  if (granularity === "hour") return `${day}T${pad(date.getHours())}`;
  if (granularity === "month") return day.slice(0, 7);
  return day;
}
// "2026-09-03" back into a local date.
export const dateOfKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d || 1);
};

export const timeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Manila";
  } catch {
    return "Asia/Manila";
  }
};

// The period picked, as a range, the range before it (to compare with), how
// finely it is cut into bars, and how it is described.
export function buildRange(period, custom, now) {
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
      comparedTo: String(now.getFullYear() - 1),
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
    const days = Math.round((end - from) / DAY_MS);
    return {
      from,
      to: end,
      prevFrom: addDays(from, -days),
      granularity: days > 62 ? "month" : "day",
      rangeLabel: `${fmtDay(from)} - ${fmtDay(to)}`,
      comparedTo: "the period before",
    };
  }

  const from = startOfMonth(now);
  const prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    from,
    to: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    prevFrom,
    granularity: "day",
    rangeLabel: from.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    comparedTo: prevFrom.toLocaleDateString(undefined, { month: "short" }),
  };
}

// Each bar: what its axis label says (short, and "Today" or "Now" for the one
// happening right now), what its readout says (in full), and its figures from
// the server's rows.
export function buildBuckets({ from, to, granularity }, period, rows, now) {
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
        period === "month" ? String(d.getDate()) : period === "week" ? d.toLocaleDateString(undefined, { weekday: "short" }) : fmtDay(d);
      buckets.push({
        start: d,
        end: addDays(d, 1),
        label,
        full: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      });
    }
  } else {
    for (let m = startOfMonth(from); m < to; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      buckets.push({
        start: m,
        end: new Date(m.getFullYear(), m.getMonth() + 1, 1),
        label: fmtMonth(m),
        full: m.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      });
    }
  }

  const byKey = new Map((rows || []).map((row) => [row.key, row]));
  return buckets.map((b, i) => {
    const row = byKey.get(keyOf(b.start, granularity));
    const isCurrent = now >= b.start && now < b.end;
    return {
      ...b,
      i,
      label: isCurrent && granularity !== "month" ? (granularity === "hour" ? "Now" : "Today") : b.label,
      revenue: row?.revenue || 0,
      kg: row?.kg || 0,
      orders: row?.orders || 0,
      isCurrent,
      upcoming: b.start > now,
    };
  });
}

// Which bars to label along the bottom, never so close together that they
// collide: the one happening now first, then the last, then the busiest, then
// an even spread. A phone's narrow chart gets fewer.
export function pickTicks(count, current, peak, phone) {
  const step = Math.max(1, Math.ceil(count / (phone ? 4 : 7)));
  const minGap = step === 1 ? 1 : phone ? step : Math.max(2, Math.floor(step / 2));
  const wanted = [current, count - 1, peak];
  for (let i = 0; i < count; i += step) wanted.push(i);
  const ticks = [];
  wanted.forEach((i) => {
    if (i >= 0 && i < count && !ticks.includes(i) && ticks.every((t) => Math.abs(t - i) >= minGap)) ticks.push(i);
  });
  return ticks.sort((a, b) => a - b);
}

// The completed orders behind one bar or one calendar day - dated, like every
// sales figure here, by when the farmer completed them.
export function ordersBetween(orders, start, end) {
  return orders
    .filter((o) => o.status === "done")
    .filter((o) => {
      const at = new Date(o.doneAt || o.createdAt);
      return at >= start && at < end;
    })
    .sort((a, b) => new Date(b.doneAt || b.createdAt) - new Date(a.doneAt || a.createdAt));
}

// The days of the period that have happened (today included) - what an
// average per weekday is taken over.
export function elapsedDays(from, to, now) {
  const days = [];
  const last = Math.min(to.getTime(), addDays(startOfDay(now), 1).getTime());
  for (let d = new Date(from); d.getTime() < last; d = addDays(d, 1)) days.push(d);
  return days;
}

// The weekday that brings in the most on average, over the days of the period
// that have happened - so a weekday that came round more often doesn't win
// just for that.
export function bestWeekday(days, range, now) {
  const totals = Array(7).fill(0);
  const counts = Array(7).fill(0);
  const byKey = new Map(days.map((d) => [d.key, d.revenue]));
  elapsedDays(range.from, range.to, now).forEach((d) => {
    const w = weekdayIndex(d);
    counts[w] += 1;
    totals[w] += byKey.get(keyOf(d, "day")) || 0;
  });
  const averages = totals.map((t, w) => (counts[w] ? t / counts[w] : 0));
  const best = averages.reduce((b, v, w) => (v > averages[b] ? w : b), 0);
  return { averages, best };
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
