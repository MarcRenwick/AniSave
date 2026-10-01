import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { AlertCircle, ArrowLeft, Check, ChevronRight, ImageOff, Package, Plus } from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import ProfitTable from "../../components/farmer/ProfitTable";
import { getMyProfit, SERVER_URL } from "../../services/api";
import { money } from "../../utils/profit";
import { amountOf } from "../../utils/units";
import { CountUp, SproutLoader } from "../../components/motion";
import { EASE } from "../../theme/harvest";

// Warm paper, a hairline, a soft shadow - the dashboard's card.
const CARD = "harvest-card";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
// "12 kg", or "3 trays" for eggs.
const kilos = (n, unit = "kg") => amountOf(n.toLocaleString(), unit);
// Kilos and trays together, each counted on its own: "40 kg and 3 trays".
const kilosAndTrays = (kg, trays = 0) =>
  [kg > 0 || !trays ? kilos(kg) : null, trays > 0 ? kilos(trays, "tray") : null].filter(Boolean).join(" and ");

function Thumb({ row, size = "h-11 w-11" }) {
  return (
    <div className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-lg bg-green-50 text-gray-300 ring-1 ring-gray-100`}>
      {row.image ? (
        <img src={`${SERVER_URL}${row.image}`} alt="" className="h-full w-full object-cover" />
      ) : (
        <ImageOff className="h-4 w-4" />
      )}
    </div>
  );
}

// "99 kg in stock · 1 kg sold · ₱1,000 expense (₱10/kg)"
const facts = (row, withCost = true) =>
  [
    row.stock > 0 ? `${kilos(row.stock, row.unit)} in stock` : "Out of stock",
    row.actual.soldKg > 0 && `${kilos(row.actual.soldKg, row.unit)} sold`,
    withCost &&
      row.costPerUnit !== null &&
      `${money(row.totalExpense)} expense (${money(row.costPerUnit)}/${row.unit === "tray" ? "tray" : "kg"})`,
  ]
    .filter(Boolean)
    .join(" · ");

// One side of a total: Income − Expense = Profit, each in its own tile -
// across from a small tablet up, and one under the other on a phone, where
// three tiles side by side would cut the amounts short. An amount is never
// cut: a very long one wraps instead.
function Equation({ income, expense, result, resultLabel, resultClass }) {
  const tile = (label, value, sign, look = "bg-gray-50 text-gray-900") => (
    <div className={`flex min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2.5 sm:block ${look}`}>
      <p className="text-xs opacity-75 sm:text-[11px]">
        {sign && <span className="mr-1 sm:hidden" aria-hidden="true">{sign}</span>}
        {label}
      </p>
      <CountUp
        value={value}
        format={money}
        on="mount"
        className="block min-w-0 break-words text-right font-display text-xl font-semibold tabular-nums sm:text-left"
      />
    </div>
  );
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.15fr)] sm:items-center" data-testid="equation">
      {tile("Income", income)}
      <span className="text-gray-400 max-sm:hidden" aria-hidden="true">−</span>
      {tile("Expense", expense, "−")}
      <span className="text-gray-400 max-sm:hidden" aria-hidden="true">=</span>
      <div
        className={`flex min-w-0 items-center justify-between gap-3 rounded-lg px-3 py-2.5 sm:block ${resultClass}`}
        data-testid="equation-result"
      >
        <p className="text-xs opacity-80 sm:text-[11px]">
          <span className="mr-1 sm:hidden" aria-hidden="true">=</span>
          {resultLabel}
        </p>
        <CountUp
          value={result}
          format={money}
          on="mount"
          className="block min-w-0 break-words text-right font-display text-2xl font-semibold tabular-nums sm:text-left"
        />
      </div>
    </div>
  );
}

// Where each peso of income went: a bar the width of the income, filling with
// the expense and then the profit (or, for a loss, the expense running past
// the end). It fills from the left as the page arrives.
function SplitBar({ income, expense, profit, profitColor }) {
  if (!(income > 0)) return null;
  const loss = profit < 0;
  const expenseShare = Math.min(expense / income, 1);
  const profitShare = loss ? 0 : Math.max(profit, 0) / income;
  const pct = (n) => `${Math.round(n * 100)}%`;
  return (
    <div className="mt-4" data-testid="split-bar">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-sand">
        <motion.span
          className={`h-full ${loss ? "bg-tomato-600" : "bg-clay-400"}`}
          style={{ width: pct(expenseShare), originX: 0 }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.25, ease: EASE }}
        />
        <motion.span
          className="h-full"
          style={{ width: pct(profitShare), originX: 0, background: profitColor }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.95, ease: EASE }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-medium text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${loss ? "bg-tomato-600" : "bg-clay-400"}`} />
          Expense {pct(expense / income)} of income
        </span>
        {!loss && (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: profitColor }} />
            Kept {pct(profitShare)}
          </span>
        )}
      </div>
    </div>
  );
}

// The margin - profit over income - as a ring that fills as the page arrives,
// glowing green for a profit and red for a loss.
function MarginRing({ income, profit, color }) {
  const margin = income > 0 ? profit / income : null;
  const share = margin === null ? 0 : Math.max(0, Math.min(margin, 1));
  const loss = margin !== null && margin < 0;
  return (
    <div className="flex shrink-0 flex-col items-center" data-testid="margin-ring" title="Margin: profit ÷ income">
      <div className="relative h-14 w-14">
        <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" style={{ filter: `drop-shadow(0 4px 10px ${loss ? "rgb(196 66 26 / 0.45)" : `${color}66`})` }}>
          <circle cx="32" cy="32" r="26" fill="none" stroke="#f3ebdc" strokeWidth="7" />
          <motion.circle
            cx="32"
            cy="32"
            r="26"
            fill="none"
            stroke={loss ? "#c4421a" : color}
            strokeWidth="7"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: loss ? 1 : share }}
            transition={{ duration: 1.2, delay: 0.3, ease: EASE }}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center font-display text-[13px] font-semibold ${loss ? "text-tomato-700" : "text-gray-900"}`}>
          {margin === null ? "-" : `${Math.round(margin * 100)}%`}
        </span>
      </div>
      <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-gray-500">margin</span>
    </div>
  );
}

function TotalCard({ kind, icon: Icon, iconClass, title, note, ring, children }) {
  return (
    <section className={`${CARD} p-5`} data-testid={`totals-${kind}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">{note}</p>
        </div>
        {ring}
      </div>
      {children}
    </section>
  );
}

// The farmer's expense, income and profit: the two totals, each product's
// figures, then the products still missing a total expense. Everything is
// worked out by the server from what is stored (server/utils/profit.js).
export default function FarmerProfit() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyProfit()
      .then(({ data: answer }) => setData(answer))
      .catch(() => setError("Could not load your profit figures. Is the server running?"))
      .finally(() => setLoading(false));
  }, []);

  const totals = data?.totals;
  const rows = data?.products || [];
  const needCost = rows.filter((row) => row.costPerUnit === null);
  const municipality = rows.find((row) => row.recommendation.municipality)?.recommendation.municipality;

  return (
    <FarmerLayout>
      <FarmerTopBar>
        <Link
          to="/farmer/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Profit</h1>
        <p className="text-sm text-gray-500">Your expenses, income and profit per product</p>
      </FarmerTopBar>

      <div className="space-y-5 p-4 sm:p-8">
        {loading && <SproutLoader label="Working out your figures..." />}
        {error && <p className="text-sm text-tomato-700">{error}</p>}

        {totals && (
          <>
            <div className="grid gap-5 xl:grid-cols-2">
              <TotalCard
                kind="actual"
                icon={Check}
                iconClass="bg-forest-700 text-white shadow-glow-forest"
                title="Actual sales"
                ring={<MarginRing income={totals.actual.income} profit={totals.actual.profit} color="#2e7d32" />}
                note={
                  totals.actual.orders > 0
                    ? `Completed orders · ${kilosAndTrays(totals.actual.soldKg, totals.actual.soldTrays)} sold in ${plural(totals.actual.orders, "order")}`
                    : "Completed orders · no completed sales yet"
                }
              >
                <Equation
                  income={totals.actual.income}
                  expense={totals.actual.expense}
                  result={totals.actual.profit}
                  resultLabel="Profit"
                  resultClass={
                    totals.actual.profit < 0
                      ? "bg-tomato-600 text-white shadow-glow-tomato"
                      : "bg-[linear-gradient(140deg,#1f5130,#2e7d32)] text-white shadow-glow-forest"
                  }
                />
                <SplitBar
                  income={totals.actual.income}
                  expense={totals.actual.expense}
                  profit={totals.actual.profit}
                  profitColor="#2e7d32"
                />
              </TotalCard>
              <TotalCard
                kind="estimated"
                icon={Package}
                iconClass="bg-blue-700 text-white shadow-[0_14px_32px_-12px_rgb(29_78_216/0.55)]"
                title="Estimated on stock"
                ring={<MarginRing income={totals.estimated.income} profit={totals.estimated.profit} color="#1d4ed8" />}
                note={
                  totals.estimated.ownCount === 0
                    ? `If you sell the ${kilosAndTrays(totals.estimated.quantity, totals.estimated.trays)} left, at ${
                        municipality ? `${municipality}'s` : "your municipality's"
                      } recommended price`
                    : `If you sell the ${kilosAndTrays(totals.estimated.quantity, totals.estimated.trays)} left`
                }
              >
                <Equation
                  income={totals.estimated.income}
                  expense={totals.estimated.expense}
                  result={totals.estimated.profit}
                  resultLabel="Est. profit"
                  resultClass={
                    totals.estimated.profit < 0
                      ? "bg-tomato-50 text-tomato-700 ring-1 ring-tomato-100 shadow-glow-tomato"
                      : "bg-blue-50 text-blue-900 ring-1 ring-blue-100 shadow-[0_14px_36px_-16px_rgb(29_78_216/0.45)]"
                  }
                />
                <SplitBar
                  income={totals.estimated.income}
                  expense={totals.estimated.expense}
                  profit={totals.estimated.profit}
                  profitColor="#1d4ed8"
                />
                {totals.estimated.ownCount > 0 && (
                  <p className="mt-3 text-xs text-gray-500" data-testid="estimate-basis-note">
                    Estimate uses market price for {plural(totals.estimated.marketCount, "product")} and your own selling
                    price for {totals.estimated.ownCount} (no market price recorded in your municipality).
                  </p>
                )}
              </TotalCard>
            </div>

            <ProfitTable rows={rows} />

            {needCost.length > 0 && (
              <section className={`${CARD} p-5`} data-testid="needs-cost">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                    <AlertCircle className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      {plural(needCost.length, "product")} need{needCost.length === 1 ? "s" : ""} a total expense
                    </h2>
                    <p className="text-xs text-gray-500">
                      {needCost.length === 1 ? "It isn't" : "They're not"} counted in the totals above until you add it.
                    </p>
                  </div>
                </div>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {needCost.map((row) => (
                    <li
                      key={row._id}
                      data-product={row._id}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2.5"
                    >
                      <Thumb row={row} size="h-10 w-10" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{row.title}</p>
                        <p className="truncate text-xs text-gray-500">{facts(row, false)}</p>
                      </div>
                      <Link
                        to={`/farmer/products/${row._id}/edit`}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-100 transition hover:bg-amber-100"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add expense
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <details className={`${CARD} group`} data-testid="how-computed">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm font-semibold text-gray-800 [&::-webkit-details-marker]:hidden">
                <ChevronRight className="h-4 w-4 transition group-open:rotate-90" />
                How are these numbers computed?
              </summary>
              <div className="space-y-2 border-t border-gray-100 px-5 py-4 text-xs leading-relaxed text-gray-600">
                <p>
                  <span className="font-semibold text-gray-800">Your cost per kilo</span> is the total expense you
                  entered for a product divided by the kilos you first listed (trays, for eggs) - never by the stock
                  left, so it stays the same as the product sells.
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Actual sales:</span> what buyers paid on completed
                  orders, less your cost per kilo on the kilos sold. An order only comes off your stock when it is
                  completed, so one that isn't yet is still counted in the estimate below, not here.
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Estimated on stock:</span> the kilos still in stock ×
                  the recommended price for your municipality, less your cost per kilo on them - before anything has
                  sold, that is the whole total expense. Where no market price
                  is recorded for a product in your municipality, your own selling price is used instead, and the
                  product says &quot;Yours&quot;. The margin under each profit is that profit ÷ its income; an
                  estimate below 20% shows in orange.
                </p>
                <p>
                  Only products with a total expense are added up - so each profit is exactly its income less its
                  expense. Kilos and trays are counted separately.
                </p>
              </div>
            </details>
          </>
        )}
      </div>
    </FarmerLayout>
  );
}
