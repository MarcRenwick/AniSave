import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, Check, ChevronRight, ImageOff, Package, Plus } from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import { getMyProfit, SERVER_URL } from "../../services/api";
import { money } from "../../utils/profit";

// White, rounded, a hairline border - the dashboard's card.
const CARD = "rounded-xl border border-gray-200/70 bg-white shadow-sm";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const kilos = (kg) => `${kg.toLocaleString()} kg`;

// A profit in green, a loss in red; an estimate in blue, so it never reads
// as money already made.
const actualTone = (amount) => (amount < 0 ? "text-red-600" : "text-[#2f8f66]");
const estimateTone = (amount) => (amount < 0 ? "text-red-600" : "text-blue-900");

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

// "99 kg in stock · 1 kg sold · ₱10/kg cost"
const facts = (row, withCost = true) =>
  [
    row.stock > 0 ? `${kilos(row.stock)} in stock` : "Out of stock",
    row.actual.soldKg > 0 && `${kilos(row.actual.soldKg)} sold`,
    withCost && row.expensePerKg !== null && `${money(row.expensePerKg)}/kg cost`,
  ]
    .filter(Boolean)
    .join(" · ");

// One side of a total: Income − Expense = Profit, each in its own tile.
function Equation({ income, expense, result, resultLabel, resultClass }) {
  const tile = (label, value, look = "bg-gray-50 text-gray-900") => (
    <div className={`min-w-0 rounded-lg px-3 py-2.5 ${look}`}>
      <p className="text-[11px] opacity-75">{label}</p>
      <p className="truncate text-lg font-bold">{money(value)}</p>
    </div>
  );
  return (
    <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1.15fr)] items-center gap-2">
      {tile("Income", income)}
      <span className="text-gray-400" aria-hidden="true">−</span>
      {tile("Expense", expense)}
      <span className="text-gray-400" aria-hidden="true">=</span>
      <div className={`min-w-0 rounded-lg px-3 py-2.5 ${resultClass}`} data-testid="equation-result">
        <p className="text-[11px] opacity-80">{resultLabel}</p>
        <p className="truncate text-xl font-bold">{money(result)}</p>
      </div>
    </div>
  );
}

function TotalCard({ kind, icon: Icon, iconClass, title, note, children }) {
  return (
    <section className={`${CARD} p-5`} data-testid={`totals-${kind}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">{note}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

// A grey pill standing in for a set of figures that can't be worked out.
const Gap = ({ children }) => (
  <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">{children}</span>
);

const NO_SALES = "No completed sales yet";
const NO_STOCK = "Out of stock - nothing left to estimate";

// Which price the stock was valued at: the market's, or - with none recorded
// in the farmer's municipality - their own selling price.
function PriceTag({ estimated }) {
  const market = estimated.basis === "market";
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-[11px] text-gray-500" data-testid="estimate-basis">
      {money(estimated.pricePerKg)}/kg
      <span
        className={`rounded-full px-1.5 py-px font-semibold ring-1 ${
          market ? "bg-blue-50 text-blue-800 ring-blue-100" : "bg-gray-100 text-gray-600 ring-gray-200"
        }`}
      >
        {market ? "Market price" : "Your price"}
      </span>
    </span>
  );
}

function ProductName({ row }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Thumb row={row} />
      <div className="min-w-0">
        <Link to={`/farmer/products/${row._id}`} className="font-semibold text-gray-900 hover:text-[#2f8f66] hover:underline">
          {row.title}
        </Link>
        <p className="text-xs text-gray-500">{facts(row)}</p>
      </div>
    </div>
  );
}

// The table, from lg up: a product's actual sales, then its estimate on stock.
function TableRow({ row }) {
  const { actual, estimated } = row;
  const cell = "px-4 py-3 text-right";
  return (
    <tr data-testid="profit-row" data-product={row._id}>
      <td className="px-5 py-3">
        <ProductName row={row} />
      </td>
      {actual.soldKg === 0 ? (
        <td colSpan={3} className="border-l border-gray-100 px-4 py-3 text-center">
          <Gap>{NO_SALES}</Gap>
        </td>
      ) : (
        <>
          <td className={`${cell} border-l border-gray-100 text-gray-700`}>{money(actual.income)}</td>
          <td className={`${cell} text-gray-700`}>{money(actual.expense)}</td>
          <td className={`${cell} font-bold ${actualTone(actual.profit)}`}>{money(actual.profit)}</td>
        </>
      )}
      {estimated.quantity === 0 ? (
        <td colSpan={3} className="border-l border-gray-100 px-4 py-3 text-center">
          <Gap>{NO_STOCK}</Gap>
        </td>
      ) : (
        <>
          <td className={`${cell} border-l border-gray-100 text-gray-700`}>
            {money(estimated.income)}
            <div className="mt-0.5">
              <PriceTag estimated={estimated} />
            </div>
          </td>
          <td className={`${cell} text-gray-700`}>{money(estimated.expense)}</td>
          <td className={`${cell} pr-5 font-bold ${estimateTone(estimated.profit)}`}>{money(estimated.profit)}</td>
        </>
      )}
    </tr>
  );
}

// The same on a phone or tablet: the product, then its two sets of figures.
function MobileRow({ row }) {
  const { actual, estimated } = row;
  const line = (title, titleClass, figures, tone, gap, tag = null) => (
    <div className="rounded-lg bg-gray-50 px-3 py-2.5 text-xs">
      <p className={`flex flex-wrap items-center justify-between gap-2 font-semibold ${titleClass}`}>
        {title}
        {figures && tag}
      </p>
      {figures ? (
        <div className="mt-1 grid grid-cols-3 gap-2">
          <p className="text-gray-500">
            Income <span className="block text-sm font-medium text-gray-800">{money(figures.income)}</span>
          </p>
          <p className="text-gray-500">
            Expense <span className="block text-sm font-medium text-gray-800">{money(figures.expense)}</span>
          </p>
          <p className="text-gray-500">
            Profit <span className={`block text-sm font-bold ${tone(figures.profit)}`}>{money(figures.profit)}</span>
          </p>
        </div>
      ) : (
        <p className="mt-1 text-gray-500">{gap}</p>
      )}
    </div>
  );
  return (
    <li className="space-y-2.5 px-5 py-4" data-testid="profit-row" data-product={row._id}>
      <ProductName row={row} />
      {line("Actual sales", "text-[#2f8f66]", actual.soldKg === 0 ? null : actual, actualTone, NO_SALES)}
      {line("Estimated on stock", "text-blue-800", estimated.quantity === 0 ? null : estimated, estimateTone, NO_STOCK, <PriceTag estimated={estimated} />)}
    </li>
  );
}

// The farmer's expense, income and profit: the two totals, each product's
// figures, then the products still missing a cost per kg. Everything is
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
  const costed = rows.filter((row) => row.expensePerKg !== null);
  const needCost = rows.filter((row) => row.expensePerKg === null);
  const municipality = rows.find((row) => row.recommendation.municipality)?.recommendation.municipality;

  return (
    <FarmerLayout>
      <FarmerTopBar>
        <Link
          to="/farmer/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#2f8f66] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Profit</h1>
        <p className="text-sm text-gray-500">Your expenses, income and profit per product</p>
      </FarmerTopBar>

      <div className="space-y-5 p-4 sm:p-8">
        {loading && <p className="text-sm text-gray-500">Working out your figures...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {totals && (
          <>
            <div className="grid gap-5 lg:grid-cols-2">
              <TotalCard
                kind="actual"
                icon={Check}
                iconClass="bg-green-50 text-[#2f8f66] ring-1 ring-green-100"
                title="Actual sales"
                note={
                  totals.actual.soldKg > 0
                    ? `Completed orders · ${kilos(totals.actual.soldKg)} sold in ${plural(totals.actual.orders, "order")}`
                    : "Completed orders · no completed sales yet"
                }
              >
                <Equation
                  income={totals.actual.income}
                  expense={totals.actual.expense}
                  result={totals.actual.profit}
                  resultLabel="Profit"
                  resultClass={totals.actual.profit < 0 ? "bg-red-600 text-white" : "bg-[#2f8f66] text-white"}
                />
              </TotalCard>
              <TotalCard
                kind="estimated"
                icon={Package}
                iconClass="bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                title="Estimated on stock"
                note={
                  totals.estimated.ownCount === 0
                    ? `If you sell the ${kilos(totals.estimated.quantity)} left, at ${
                        municipality ? `${municipality}'s` : "your municipality's"
                      } recommended price`
                    : `If you sell the ${kilos(totals.estimated.quantity)} left`
                }
              >
                <Equation
                  income={totals.estimated.income}
                  expense={totals.estimated.expense}
                  result={totals.estimated.profit}
                  resultLabel="Est. profit"
                  resultClass={
                    totals.estimated.profit < 0 ? "bg-red-50 text-red-700 ring-1 ring-red-100" : "bg-blue-50 text-blue-900 ring-1 ring-blue-100"
                  }
                />
                {totals.estimated.ownCount > 0 && (
                  <p className="mt-3 text-xs text-gray-500" data-testid="estimate-basis-note">
                    Estimate uses market price for {plural(totals.estimated.marketCount, "product")} and your own selling
                    price for {totals.estimated.ownCount} (no market price recorded in your municipality).
                  </p>
                )}
              </TotalCard>
            </div>

            <section className={CARD} data-testid="profit-products">
              <div className="px-5 pb-3 pt-5">
                <h2 className="text-base font-semibold text-gray-900">Profit per product</h2>
                <p className="text-xs text-gray-500">Products with an expense per kg set</p>
              </div>

              {costed.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-gray-500">
                  {rows.length === 0
                    ? "No products yet. Add one from My Products to see its expense and profit here."
                    : "None of your products has a cost per kg yet - add one below to see its figures."}
                </p>
              ) : (
                <>
                  <div className="max-lg:hidden">
                    <table className="w-full text-left text-sm" data-testid="profit-table">
                      <thead className="border-y border-gray-100 bg-gray-50/70 text-xs text-gray-500">
                        <tr>
                          <th rowSpan={2} className="px-5 py-2 align-bottom font-semibold text-gray-700">
                            Product
                          </th>
                          <th colSpan={3} className="border-l border-gray-100 px-4 pt-2 text-center font-semibold text-[#2f8f66]">
                            Actual sales
                          </th>
                          <th colSpan={3} className="border-l border-gray-100 px-5 pt-2 text-center font-semibold text-blue-800">
                            Estimated on stock
                          </th>
                        </tr>
                        <tr>
                          <th className="border-l border-gray-100 px-4 pb-2 text-right font-medium">Income</th>
                          <th className="px-4 pb-2 text-right font-medium">Expense</th>
                          <th className="px-4 pb-2 text-right font-medium">Profit</th>
                          <th className="border-l border-gray-100 px-4 pb-2 text-right font-medium">Income</th>
                          <th className="px-4 pb-2 text-right font-medium">Expense</th>
                          <th className="px-5 pb-2 text-right font-medium">Profit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {costed.map((row) => (
                          <TableRow key={row._id} row={row} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <ul className="divide-y divide-gray-100 border-t border-gray-100 lg:hidden" data-testid="profit-cards">
                    {costed.map((row) => (
                      <MobileRow key={row._id} row={row} />
                    ))}
                  </ul>
                </>
              )}
            </section>

            {needCost.length > 0 && (
              <section className={`${CARD} p-5`} data-testid="needs-cost">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                    <AlertCircle className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      {plural(needCost.length, "product")} need{needCost.length === 1 ? "s" : ""} your cost per kg
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
                        Add cost
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
                  <span className="font-semibold text-gray-800">Actual sales:</span> what buyers paid on completed
                  orders, less your cost per kg on the kilos sold. Orders not picked up yet count in neither until
                  they are completed.
                </p>
                <p>
                  <span className="font-semibold text-gray-800">Estimated on stock:</span> the kilos still in stock ×
                  the recommended price for your municipality, less your cost per kg on them. Where no market price
                  is recorded for a product in your municipality, your own selling price is used instead, and the
                  product says &quot;Your price&quot;.
                </p>
                <p>
                  Only products with a cost per kg are added up - so each profit is exactly its income less its
                  expense.
                </p>
              </div>
            </details>
          </>
        )}
      </div>
    </FarmerLayout>
  );
}
