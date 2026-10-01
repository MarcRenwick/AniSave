import { useMemo } from "react";
import {
  CartesianGrid,
  LabelList,
  ReferenceArea,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLORS } from "./analytics";
import { Badge, EmptyState, TooltipBox, ViewHeading } from "./ChartParts";
import { amountOf, unitOf } from "../../../utils/units";

const HEIGHT = 320;

// Split at the middle of each axis: plenty of interest against little stock
// wants restocking, little interest against plenty of stock wants a push. The
// lower two are labelled just under the middle line rather than in the bottom
// corners, where products with no stock and no interest gather.
const QUADRANTS = [
  { key: "restock", label: "RESTOCK SOON", tint: "#FCEBEA", dot: COLORS.red, text: "#B0352B", position: "insideTopLeft" },
  { key: "selling", label: "SELLING WELL", tint: "#eef6ee", dot: COLORS.green, text: "#1f5130", position: "insideTopRight" },
  { key: "low", label: "LOW PRIORITY", tint: "#f6f1e6", dot: "#786f5d", text: "#62594a", position: "insideTopLeft" },
  { key: "promote", label: "PROMOTE / DISCOUNT", tint: "#FDF3E4", dot: COLORS.orange, text: "#8A5409", position: "insideTopRight" },
];
const NAMES = { restock: "Restock soon", selling: "Selling well", low: "Low priority", promote: "Promote / discount" };
// Named under the chart as well, since dots close together can hide each
// other's labels.
const LISTED = 3;
const namesOf = (items) =>
  items.length === 0
    ? "none"
    : items.length <= LISTED
      ? items.map((p) => p.title).join(", ")
      : `${items.slice(0, LISTED).map((p) => p.title).join(", ")} +${items.length - LISTED} more`;

// A round number a little above the largest value, for the end of an axis.
function niceTop(value, floor) {
  const v = Math.max(value * 1.1, floor);
  const base = 10 ** Math.floor(Math.log10(v));
  for (const step of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (v <= step * base) return step * base;
  }
  return 10 * base;
}

// Each product placed by its stock on hand (across) and how much buyers have
// looked for it (up).
export default function DemandStockChart({ demand }) {
  const chart = useMemo(() => {
    const items = demand || [];
    const xMax = niceTop(Math.max(...items.map((p) => p.stock), 0), 10);
    const yMax = niceTop(Math.max(...items.map((p) => p.demand), 0), 4);
    const xMid = xMax / 2;
    const yMid = yMax / 2;
    const placed = items.map((p) => {
      const wanted = p.demand >= yMid;
      const stocked = p.stock >= xMid;
      const quadrant = wanted ? (stocked ? "selling" : "restock") : stocked ? "promote" : "low";
      return { ...p, quadrant };
    });
    // Most looked-for first within each group.
    const groups = Object.fromEntries(
      QUADRANTS.map((q) => [q.key, placed.filter((p) => p.quadrant === q.key).sort((a, b) => b.demand - a.demand)])
    );
    return { placed, xMax, yMax, xMid, yMid, groups, anyInterest: items.some((p) => p.demand > 0) };
  }, [demand]);

  const subtitle = "Buyer searches & views against kg on hand, per product · since each was listed";
  const restock = chart.groups.restock?.length || 0;
  const badge = restock > 0 ? <Badge tone="red">{restock} to restock</Badge> : <Badge tone="green">Nothing to restock</Badge>;

  if (!demand?.length) {
    return (
      <div className="space-y-4">
        <ViewHeading subtitle={subtitle} />
        <EmptyState title="No products yet" height={HEIGHT}>
          Add a product and it shows up here, placed by its stock and by how much buyers look for it.
        </EmptyState>
      </div>
    );
  }
  if (!chart.anyInterest) {
    return (
      <div className="space-y-4">
        <ViewHeading subtitle={subtitle} />
        <EmptyState title="No buyer searches or views yet" height={HEIGHT}>
          As buyers search for and open your listings, each product is placed here against its stock.
        </EmptyState>
      </div>
    );
  }

  const { xMax, yMax, xMid, yMid } = chart;
  const areas = {
    restock: { x1: 0, x2: xMid, y1: yMid, y2: yMax },
    selling: { x1: xMid, x2: xMax, y1: yMid, y2: yMax },
    low: { x1: 0, x2: xMid, y1: 0, y2: yMid },
    promote: { x1: xMid, x2: xMax, y1: 0, y2: yMid },
  };

  return (
    <div className="space-y-4">
      <ViewHeading subtitle={subtitle} badge={badge} />
      <div data-testid="demand-stock-chart">
        <ResponsiveContainer width="100%" height={HEIGHT}>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 18, left: 4 }}>
            {QUADRANTS.map((q) => (
              <ReferenceArea
                key={q.key}
                {...areas[q.key]}
                fill={q.tint}
                fillOpacity={1}
                stroke="none"
                label={{ value: q.label, position: q.position, fill: q.text, fontSize: 10, fontWeight: 700 }}
              />
            ))}
            <CartesianGrid stroke="#FFFFFF" strokeOpacity={0.7} />
            <XAxis
              type="number"
              dataKey="stock"
              domain={[0, xMax]}
              tick={{ fontSize: 11, fill: COLORS.muted }}
              tickLine={false}
              axisLine={{ stroke: "#d4c9b3" }}
              label={{ value: `Stock on hand (${chart.placed.some((p) => unitOf(p) === "tray") ? "kg, or trays of eggs" : "kg"}) →`, position: "insideBottom", offset: -12, fill: COLORS.muted, fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="demand"
              domain={[0, yMax]}
              allowDecimals={false}
              tick={{ fontSize: 11, fill: COLORS.muted }}
              tickLine={false}
              axisLine={{ stroke: "#d4c9b3" }}
              width={44}
              label={{ value: "Buyer searches & views →", angle: -90, position: "insideLeft", offset: 12, fill: COLORS.muted, fontSize: 11, style: { textAnchor: "middle" } }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload;
                return (
                  <TooltipBox
                    title={p.title}
                    lines={[
                      ["Stock", amountOf(p.stock.toLocaleString(), unitOf(p))],
                      ["Searches", p.searches.toLocaleString()],
                      ["Views", p.views.toLocaleString()],
                      ["Suggests", NAMES[p.quadrant]],
                    ]}
                  />
                );
              }}
            />
            {QUADRANTS.map((q) => (
              <Scatter
                key={q.key}
                name={NAMES[q.key]}
                data={chart.placed.filter((p) => p.quadrant === q.key)}
                fill={q.dot}
                isAnimationActive={false}
              >
                <LabelList dataKey="title" position="right" offset={8} style={{ fontSize: 11, fontWeight: 600, fill: "#1a1d16" }} />
              </Scatter>
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2" style={{ color: COLORS.muted }} data-testid="quadrant-counts">
        {QUADRANTS.map((q) => (
          <li key={q.key} className="flex min-w-0 items-center gap-1.5" data-count={chart.groups[q.key].length}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: q.dot }} />
            <span className="shrink-0">{NAMES[q.key]}:</span>
            <span className="truncate font-semibold text-gray-800">{namesOf(chart.groups[q.key])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
