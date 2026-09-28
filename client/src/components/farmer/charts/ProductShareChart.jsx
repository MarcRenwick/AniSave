import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { COLORS, METRICS } from "./analytics";
import { EmptyState, TooltipBox, ViewHeading } from "./ChartParts";

const SLICE_COLORS = [COLORS.darkGreen, COLORS.lightGreen, COLORS.orange, COLORS.blue, COLORS.purple];
const OTHER_COLOR = "#B8C2BC";
const TOP = 5;
const kilos = METRICS[1];

const percent = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

// Which products the kilos sold came from: the five biggest, and the rest
// together as "Other".
export default function ProductShareChart({ data, range }) {
  const share = useMemo(() => {
    const sold = data.products.filter((p) => p.kg > 0).sort((a, b) => b.kg - a.kg);
    const total = sold.reduce((sum, p) => sum + p.kg, 0);
    const slices = sold.slice(0, TOP).map((p, i) => ({ name: p.title, kg: p.kg, color: SLICE_COLORS[i] }));
    const rest = sold.slice(TOP);
    if (rest.length) {
      slices.push({ name: `Other (${rest.length})`, kg: rest.reduce((sum, p) => sum + p.kg, 0), color: OTHER_COLOR });
    }
    return { slices, total, count: sold.length };
  }, [data]);

  const subtitle = `Share of kg sold by product · ${range.rangeLabel}`;

  if (share.total === 0) {
    return (
      <div className="space-y-4">
        <ViewHeading subtitle={subtitle} />
        <EmptyState title="No sales in this period yet">
          Once orders are completed, this shows which products your kilos sold came from.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ViewHeading subtitle={subtitle} />
      <div className="grid items-center gap-6 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)]" data-testid="product-share">
        <div className="relative mx-auto h-[220px] w-full max-w-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={share.slices}
                dataKey="kg"
                nameKey="name"
                innerRadius="62%"
                outerRadius="96%"
                paddingAngle={share.slices.length > 1 ? 1.5 : 0}
                startAngle={90}
                endAngle={-270}
                stroke="none"
                isAnimationActive={false}
              >
                {share.slices.map((s, i) => (
                  <Cell key={i} fill={s.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const s = payload[0].payload;
                  return <TooltipBox title={s.name} lines={[["Sold", kilos.format(s.kg), s.color], ["Share", `${percent(s.kg, share.total)}%`]]} />;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="text-2xl font-bold tabular-nums text-gray-900" data-testid="share-total">
              {kilos.format(share.total)}
            </p>
            <p className="text-[11px]" style={{ color: COLORS.muted }}>
              {share.count > TOP ? `top ${TOP} + other` : `${share.count} product${share.count === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        <ul className="space-y-2.5" data-testid="share-legend">
          {share.slices.map((s, i) => (
            <li key={i} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-gray-800">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="truncate">{s.name}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-gray-900">{percent(s.kg, share.total)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
