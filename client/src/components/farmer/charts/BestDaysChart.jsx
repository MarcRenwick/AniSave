import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COLORS, WEEKDAYS, WEEKDAYS_LONG, bestWeekday, peso } from "./analytics";
import { Badge, EmptyState, TooltipBox, ViewHeading } from "./ChartParts";

const HEIGHT = 250;
const MIN_SALE_DAYS = 3;

// The weekday on which buyers spend the most, on average - and so which day's
// harvest should be ready for it.
export default function BestDaysChart({ data, range }) {
  const chart = useMemo(() => {
    const { averages, best } = bestWeekday(data.days, range, new Date());
    return {
      best,
      points: WEEKDAYS.map((day, w) => ({ day, w, average: Math.round(averages[w] * 100) / 100 })),
      saleDays: data.days.filter((d) => d.revenue > 0).length,
    };
  }, [data, range]);

  const subtitle = `Average revenue by day of week · ${range.rangeLabel}`;

  if (chart.saleDays < MIN_SALE_DAYS) {
    return (
      <div className="space-y-4">
        <ViewHeading subtitle={subtitle} />
        <EmptyState title="Not enough sales yet — check back after a few more orders">
          Best days needs at least {MIN_SALE_DAYS} days with completed sales in this period. A longer period, like This
          month or This year, gives it more to go on.
        </EmptyState>
      </div>
    );
  }

  const best = chart.best;
  const dayBefore = (best + 6) % 7;
  const badge = (
    <Badge tone="green" title={`Buyers spend the most on ${WEEKDAYS_LONG[best]}, so harvest the day before`}>
      Harvest {WEEKDAYS[dayBefore]} for {WEEKDAYS[best]}
    </Badge>
  );

  return (
    <div className="space-y-4">
      <ViewHeading subtitle={subtitle} badge={badge} />
      <div data-testid="best-days-chart">
        <ResponsiveContainer width="100%" height={HEIGHT}>
          <BarChart data={chart.points} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={COLORS.grid} />
            <XAxis
              dataKey="day"
              axisLine={{ stroke: "#d4c9b3" }}
              tickLine={false}
              tick={({ x, y, payload }) => (
                <text
                  x={x}
                  y={y + 12}
                  textAnchor="middle"
                  fontSize={12}
                  fontWeight={payload.index === best ? 700 : 400}
                  fill={payload.index === best ? "#1a1d16" : COLORS.muted}
                >
                  {payload.value}
                </text>
              )}
            />
            <YAxis hide domain={[0, "dataMax"]} />
            <Tooltip
              cursor={{ fill: "rgba(31, 122, 77, 0.06)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload;
                return <TooltipBox title={WEEKDAYS_LONG[p.w]} lines={[["Average revenue", peso(p.average), p.w === best ? COLORS.darkGreen : COLORS.paleGreen]]} />;
              }}
            />
            <Bar dataKey="average" radius={[6, 6, 0, 0]} maxBarSize={56} isAnimationActive={false}>
              {chart.points.map((p) => (
                <Cell key={p.w} fill={p.w === best ? COLORS.darkGreen : COLORS.paleGreen} />
              ))}
              <LabelList
                dataKey="average"
                position="top"
                // Matched by value: Recharts numbers only the bars it draws, and
                // a weekday with no sales draws none.
                content={({ x, y, width, value }) =>
                  value === chart.points[best].average && value > 0 ? (
                    <text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize={12} fontWeight={700} fill="#1a1d16" data-testid="best-day-value">
                      {peso(value)}
                    </text>
                  ) : null
                }
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
