import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  COLORS,
  WEEKDAYS,
  WEEKDAYS_LONG,
  addDays,
  bestWeekday,
  keyOf,
  ordersBetween,
  peso,
  plural,
  startOfDay,
  startOfMonth,
  weekdayIndex,
} from "./analytics";
import { Badge, EmptyState, OrdersPanel, ViewHeading } from "./ChartParts";

// Five shades, from nothing sold to the period's best day.
const LEVELS = ["#f3eee3", "#CFEBDA", "#8FCBA5", "#58a061", "#1f5130"];
const levelOf = (value, max) => (value <= 0 || max <= 0 ? 0 : Math.min(4, Math.ceil((value / max) * 4)));
const MIN_SALE_DAYS = 3;

// A month at a time, each day shaded by what it brought in. Tapping a day
// lists its orders.
export default function SalesCalendar({ data, range, orders }) {
  const now = new Date();
  const today = startOfDay(now);

  // Every month the period touches; the one shown first is the latest that
  // has begun.
  const months = useMemo(() => {
    const list = [];
    for (let m = startOfMonth(range.from); m < range.to; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) list.push(m);
    return list;
  }, [range]);
  const latest = Math.max(0, months.reduce((last, m, i) => (m <= now ? i : last), 0));
  const [shown, setShown] = useState(latest);
  const [selected, setSelected] = useState(null);
  const month = months[Math.min(shown, months.length - 1)];

  const byKey = useMemo(() => new Map(data.days.map((d) => [d.key, d])), [data]);
  const max = Math.max(...data.days.map((d) => d.revenue), 0);
  const saleDays = data.days.filter((d) => d.revenue > 0).length;
  const { best } = bestWeekday(data.days, range, now);

  const monthName = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const subtitle = `Each day shaded by revenue · ${monthName}`;

  if (saleDays < MIN_SALE_DAYS) {
    return (
      <div className="space-y-4">
        <ViewHeading subtitle={subtitle} />
        <EmptyState title="Not enough sales yet — check back after a few more orders">
          The calendar needs at least {MIN_SALE_DAYS} days with completed sales in this period
          {saleDays > 0 ? ` (there ${saleDays === 1 ? "is" : "are"} ${saleDays} so far)` : ""}.
        </EmptyState>
      </div>
    );
  }

  const first = month;
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < weekdayIndex(first); i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(first.getFullYear(), first.getMonth(), d));
  const open = selected ? new Date(selected) : null;

  return (
    <div className="space-y-4">
      <ViewHeading subtitle={subtitle} badge={<Badge tone="green">Best: {WEEKDAYS_LONG[best]}</Badge>} />

      {months.length > 1 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setShown((s) => Math.max(0, s - 1));
              setSelected(null);
            }}
            disabled={shown === 0}
            aria-label="Previous month"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7dfcf] text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold text-gray-900" data-testid="calendar-month">
            {monthName}
          </p>
          <button
            type="button"
            onClick={() => {
              setShown((s) => Math.min(months.length - 1, s + 1));
              setSelected(null);
            }}
            disabled={shown >= months.length - 1}
            aria-label="Next month"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7dfcf] text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <div data-testid="sales-calendar">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {WEEKDAYS.map((w) => (
            <p key={w} className="text-center text-[11px] font-semibold" style={{ color: COLORS.muted }}>
              {w}
            </p>
          ))}
          {cells.map((day, i) => {
            if (!day) return <span key={`blank-${i}`} />;
            const key = keyOf(day, "day");
            const row = byKey.get(key);
            const revenue = row?.revenue || 0;
            const inPeriod = day >= range.from && day < range.to;
            const future = day > today;
            const isToday = day.getTime() === today.getTime();
            const level = levelOf(revenue, max);
            const isOpen = selected === day.getTime();
            if (future || !inPeriod) {
              return (
                <span
                  key={key}
                  className={`flex h-10 items-start justify-end rounded-lg p-1.5 text-[11px] sm:h-12 ${
                    future ? "border border-dashed border-[#d4c9b3] bg-white text-gray-400" : "bg-[#f8f4ec] text-gray-300"
                  }`}
                  data-testid={future ? "day-future" : "day-outside"}
                >
                  {day.getDate()}
                </span>
              );
            }
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(isOpen ? null : day.getTime())}
                aria-pressed={isOpen}
                aria-label={`${day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}: ${peso(revenue)}, ${plural(row?.orders || 0, "order")}`}
                title={`${peso(revenue)} · ${plural(row?.orders || 0, "order")}`}
                data-level={level}
                data-testid={isToday ? "day-today" : "day"}
                className={`flex h-10 items-start justify-end rounded-lg p-1.5 text-[11px] font-semibold transition hover:brightness-95 sm:h-12 ${
                  level >= 3 ? "text-white" : "text-gray-700"
                } ${isToday ? "ring-2 ring-[#1f5130] ring-offset-1" : ""} ${isOpen ? "outline-2 outline-offset-2 outline-[#e4572e]" : ""}`}
                style={{ background: LEVELS[level] }}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: COLORS.muted }}>
        <span className="flex items-center gap-1.5" data-testid="calendar-legend">
          Less
          {LEVELS.map((c) => (
            <span key={c} className="h-3 w-3 rounded-sm" style={{ background: c }} />
          ))}
          More
        </span>
        <span>Tip: tap a day to see its orders</span>
      </div>

      {open && (
        <OrdersPanel
          title={open.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          orders={ordersBetween(orders, open, addDays(open, 1))}
          summary={peso(byKey.get(keyOf(open, "day"))?.revenue || 0)}
          emptyText="No orders were completed on this day."
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
