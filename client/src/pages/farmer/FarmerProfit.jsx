import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ImageOff, Info, Receipt, Sprout, TrendingUp, Wallet } from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import Segmented from "../../components/farmer/Segmented";
import { Caption, Figure, StatCard, Warning } from "../../components/farmer/StatCard";
import { getMyProfit, SERVER_URL } from "../../services/api";
import { money, profitTone } from "../../utils/profit";

// The same card as the dashboard's: white, a hairline border, a dark title.
const CARD = "rounded-xl border border-gray-200/70 bg-white p-5 shadow-sm";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const kilos = (kg) => `${kg.toLocaleString()} kg`;

// Which of a product's two sets of figures the list shows.
const VIEWS = [
  { key: "actual", label: "Actual sales" },
  { key: "estimated", label: "Estimated on stock" },
];

// A product's income, expense and profit for the chosen view - or null when
// there is nothing to work them out from yet.
function figuresFor(row, view) {
  if (row.expensePerKg === null) return null;
  if (view === "actual") {
    return row.actual.soldKg === 0 ? null : row.actual;
  }
  return row.estimated.profit === null ? null : row.estimated;
}

// Why a product has no figures for the chosen view.
function whyNone(row, view) {
  if (view === "actual") {
    return `No completed sales yet${row.pendingKg > 0 ? ` · ${kilos(row.pendingKg)} waiting to be picked up` : ""}`;
  }
  return row.recommendation?.reason === "no-municipality"
    ? "Add your municipality in Edit Profile to estimate this"
    : "No recommended price in your municipality";
}

// "10 kg in stock · 4 kg sold · ₱80/kg cost"
const facts = (row) =>
  [
    `${kilos(row.stock)} in stock`,
    row.actual.soldKg > 0 && `${kilos(row.actual.soldKg)} sold`,
    row.expensePerKg !== null && `${money(row.expensePerKg)}/kg cost`,
  ]
    .filter(Boolean)
    .join(" · ");

function Thumb({ row }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50 text-gray-300 ring-1 ring-gray-100">
      {row.image ? (
        <img src={`${SERVER_URL}${row.image}`} alt={row.title} className="h-full w-full object-cover" />
      ) : (
        <ImageOff className="h-4 w-4" />
      )}
    </div>
  );
}

// Income split into what the expense took and what was left: the green part
// is the profit. A loss fills the bar red.
function SplitBar({ income, expense }) {
  if (!income && !expense) return <div className="h-2.5 rounded-full bg-gray-100" data-testid="split-bar" />;
  if (expense > income) {
    return <div className="h-2.5 rounded-full bg-red-500" title="The expense is more than the income" data-testid="split-bar" />;
  }
  const kept = income === 0 ? 0 : ((income - expense) / income) * 100;
  return (
    <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100" data-testid="split-bar">
      <div className="h-full bg-orange-400" style={{ width: `${100 - kept}%` }} />
      <div className="h-full bg-[#2f8f66]" style={{ width: `${kept}%` }} />
    </div>
  );
}

// One of the two totals: what buyers actually paid, or what the stock would
// fetch at the recommended price. The estimate is drawn with a dashed edge,
// so it is never read as money already made.
function TotalsCard({ kind, title, badge, note, lines, income, expense }) {
  const estimated = kind === "estimated";
  return (
    <section
      data-testid={`totals-${kind}`}
      className={`rounded-xl p-5 shadow-sm ${
        estimated ? "border border-dashed border-gray-300 bg-white" : "border border-gray-200/70 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            estimated ? "bg-gray-100 text-gray-600" : "bg-green-100 text-[#1f5c42]"
          }`}
        >
          {badge}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-gray-500">{note}</p>

      <div className="mt-4">
        <SplitBar income={income} expense={expense} />
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-orange-400" /> Expense
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#2f8f66]" /> Profit
          </span>
        </div>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        {lines.map(({ label, value, strong }) => (
          <div
            key={label}
            className={`flex items-baseline justify-between gap-3 ${strong ? "border-t border-gray-100 pt-2" : ""}`}
          >
            <dt className={strong ? "font-semibold text-gray-900" : "text-gray-600"}>{label}</dt>
            <dd className={strong ? `text-xl font-bold ${profitTone(value)}` : "font-semibold text-gray-900"}>
              {money(value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// One product in the list: what it is, its figures for the chosen view, and a
// bar showing how its profit compares with the best one's.
function ProductLine({ row, view, top }) {
  const figures = figuresFor(row, view);
  return (
    <li className="py-4 first:pt-0 last:pb-0" data-testid="profit-row" data-product={row._id}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 basis-60 items-center gap-3">
          <Thumb row={row} />
          <div className="min-w-0">
            <Link
              to={`/farmer/products/${row._id}`}
              className="font-medium text-gray-900 hover:text-[#2f8f66] hover:underline"
            >
              {row.title}
            </Link>
            <p className="text-xs text-gray-500">{facts(row)}</p>
          </div>
        </div>

        {row.expensePerKg === null ? (
          <Link
            to={`/farmer/products/${row._id}/edit`}
            className="ml-auto flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-100 transition hover:bg-amber-100"
          >
            No cost per kg yet
            <span className="font-semibold">Add it →</span>
          </Link>
        ) : figures === null ? (
          <p className="ml-auto text-xs text-gray-400">{whyNone(row, view)}</p>
        ) : (
          <div className="ml-auto flex items-center gap-5 text-right">
            <dl className="space-y-0.5 text-xs">
              <div className="flex justify-end gap-2">
                <dt className="text-gray-500">Income</dt>
                <dd className="font-medium text-gray-800">{money(figures.income)}</dd>
              </div>
              <div className="flex justify-end gap-2">
                <dt className="text-gray-500">Expense</dt>
                <dd className="font-medium text-gray-800">{money(figures.expense)}</dd>
              </div>
            </dl>
            <div className="min-w-24">
              <p className="text-[11px] text-gray-500">Profit</p>
              <p className={`text-lg font-bold ${profitTone(figures.profit)}`}>{money(figures.profit)}</p>
            </div>
          </div>
        )}
      </div>

      {figures !== null && (
        <div className="mt-2 h-1.5 rounded-full bg-gray-100" aria-hidden="true" data-testid="profit-bar">
          <div
            className={`h-full rounded-full ${figures.profit < 0 ? "bg-red-500" : "bg-[#2f8f66]"}`}
            style={{ width: `${Math.max((Math.abs(figures.profit) / top) * 100, figures.profit === 0 ? 0 : 2)}%` }}
          />
        </div>
      )}
    </li>
  );
}

// The farmer's expense, income and profit across all their products: the
// totals first, then each product's own figures. Everything here is worked out
// by the server from what is stored (server/utils/profit.js).
export default function FarmerProfit() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("actual");

  useEffect(() => {
    getMyProfit()
      .then(({ data: answer }) => setData(answer))
      .catch(() => setError("Could not load your profit figures. Is the server running?"))
      .finally(() => setLoading(false));
  }, []);

  const totals = data?.totals;
  const rows = data?.products || [];
  const municipality = rows.find((row) => row.recommendation.municipality)?.recommendation.municipality;
  const firstMissing = rows.find((row) => row.expensePerKg === null);

  // Products with figures first, most profitable at the top; the rest after
  // them in the order they were listed.
  const ordered = [
    ...rows.filter((row) => figuresFor(row, view)).sort((a, b) => figuresFor(b, view).profit - figuresFor(a, view).profit),
    ...rows.filter((row) => !figuresFor(row, view)),
  ];
  const top = Math.max(...ordered.map((row) => Math.abs(figuresFor(row, view)?.profit || 0)), 1);

  return (
    <FarmerLayout>
      <FarmerTopBar>
        <Link
          to="/farmer/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#2f8f66] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Profit</h1>
        <p className="text-sm text-gray-500">Expense, income and profit on your products</p>
      </FarmerTopBar>

      <div className="space-y-6 p-4 sm:p-8">
        {loading && <p className="text-sm text-gray-500">Working out your figures...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {totals && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={TrendingUp} label="Profit so far" testId="stat-profit">
                <Figure tone={totals.actual.profit < 0 ? "text-red-600" : "text-gray-900"}>
                  {money(totals.actual.profit)}
                </Figure>
                <Caption>
                  {totals.actual.soldKg > 0
                    ? `From ${kilos(totals.actual.soldKg)} sold in ${plural(totals.actual.orders, "completed order")}`
                    : "No completed sales yet"}
                </Caption>
              </StatCard>
              <StatCard icon={Wallet} label="Income" testId="stat-income">
                <Figure>{money(totals.actual.income)}</Figure>
                <Caption>What buyers paid on completed orders</Caption>
              </StatCard>
              <StatCard icon={Receipt} label="Expense" testId="stat-expense">
                <Figure>{money(totals.actual.expense)}</Figure>
                <Caption>
                  {totals.actual.soldKg > 0
                    ? `${kilos(totals.actual.soldKg)} sold × your cost per kg`
                    : "Your cost per kg on what you sell"}
                </Caption>
              </StatCard>
              <StatCard icon={Sprout} label="Estimated on stock" testId="stat-estimated">
                <Figure tone={totals.estimated.profit < 0 ? "text-red-600" : "text-gray-900"}>
                  {money(totals.estimated.profit)}
                </Figure>
                <Caption>
                  Est. profit on {kilos(totals.estimated.quantity)} at the recommended price
                </Caption>
                {firstMissing && (
                  <Warning to={`/farmer/products/${firstMissing._id}/edit`} action="Add">
                    {plural(totals.missingExpense, "product")} need{totals.missingExpense === 1 ? "s" : ""} an expense
                  </Warning>
                )}
              </StatCard>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
              <TotalsCard
                kind="actual"
                title="Actual sales"
                badge="Completed orders"
                note={
                  totals.actual.soldKg > 0
                    ? `${kilos(totals.actual.soldKg)} sold in ${plural(totals.actual.orders, "completed order")}`
                    : "No completed sales yet"
                }
                income={totals.actual.income}
                expense={totals.actual.expense}
                lines={[
                  { label: "Total Income", value: totals.actual.income },
                  { label: "Total Expense", value: totals.actual.expense },
                  { label: "Total Profit", value: totals.actual.profit, strong: true },
                ]}
              />
              <TotalsCard
                kind="estimated"
                title="Estimated on stock"
                badge="Recommended price"
                note={`${kilos(totals.estimated.quantity)} in stock across ${plural(
                  totals.estimated.products,
                  "product"
                )}, valued at the recommended price${municipality ? ` for ${municipality}` : ""}`}
                income={totals.estimated.income}
                expense={totals.estimated.expense}
                lines={[
                  { label: "Estimated Income", value: totals.estimated.income },
                  { label: "Total Expense", value: totals.estimated.expense },
                  { label: "Estimated Profit", value: totals.estimated.profit, strong: true },
                ]}
              />
            </div>

            {(totals.missingExpense > 0 || totals.missingMarketPrice > 0) && (
              <div
                className="flex items-start gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600 ring-1 ring-gray-100"
                data-testid="left-out"
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div className="space-y-1">
                  {totals.missingExpense > 0 && (
                    <p>
                      {totals.missingExpense} product{totals.missingExpense === 1 ? " has" : "s have"} no
                      expense per kg yet, so {totals.missingExpense === 1 ? "it isn't" : "they aren't"} in
                      either total. Add it from the product&apos;s Edit page.
                    </p>
                  )}
                  {totals.missingMarketPrice > 0 && (
                    <p>
                      {totals.missingMarketPrice} product{totals.missingMarketPrice === 1 ? " has" : "s have"} no
                      recommended price in your municipality, so {totals.missingMarketPrice === 1 ? "it isn't" : "they aren't"} in
                      the estimate.
                    </p>
                  )}
                </div>
              </div>
            )}

            <section className={CARD} data-testid="profit-products">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Profit by product</h2>
                  <p className="text-xs text-gray-500">
                    {view === "actual"
                      ? "What each product made on completed orders, best first"
                      : "What each product's stock would make at the recommended price, best first"}
                  </p>
                </div>
                <Segmented label="Show" options={VIEWS} value={view} onChange={setView} />
              </div>

              {rows.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">
                  No products yet. Add one from My Products to see its expense and profit here.
                </p>
              ) : (
                <ol className="mt-5 divide-y divide-gray-100">
                  {ordered.map((row) => (
                    <ProductLine key={row._id} row={row} view={view} top={top} />
                  ))}
                </ol>
              )}
            </section>

            <div className="space-y-1 text-xs text-gray-500">
              <p>
                <span className="font-semibold text-gray-700">Actual sales:</span> what buyers paid on
                completed orders, less your expense per kg on the kilos sold. Orders not picked up yet count
                in neither until they are completed.
              </p>
              <p>
                <span className="font-semibold text-gray-700">Estimated on stock:</span> the kilos still in
                stock × the recommended price for your municipality, less your expense per kg on them. Your
                own selling price isn&apos;t used for the estimate.
              </p>
            </div>
          </>
        )}
      </div>
    </FarmerLayout>
  );
}
