import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ImageOff, Info } from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import ProfitPanels from "../../components/farmer/profit/ProfitPanels";
import { getMyProfit, SERVER_URL } from "../../services/api";
import { money, profitTone } from "../../utils/profit";

function CardHeader({ children }) {
  return (
    <div className="rounded-t-xl bg-[#2f8f66] px-4 py-2 text-sm font-semibold text-white">{children}</div>
  );
}

// One of the two totals: what the stock would fetch at the recommended price,
// or what buyers actually paid. Headed the way the dashboard's cards are.
function TotalsCard({ kind, title, note, lines }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm" data-testid={`totals-${kind}`}>
      <CardHeader>{title}</CardHeader>
      <div className="space-y-2 p-4 text-sm">
        <p className="text-xs text-gray-500">{note}</p>
        {lines.map(({ label, value, strong }) => (
          <div
            key={label}
            className={`flex items-baseline justify-between gap-3 ${strong ? "border-t border-gray-100 pt-2" : ""}`}
          >
            <span className={strong ? "font-semibold text-gray-900" : "text-gray-600"}>{label}</span>
            <span className={strong ? `text-xl font-bold ${profitTone(value)}` : "font-semibold text-gray-900"}>
              {money(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Thumb({ row }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-50 text-gray-300">
      {row.image ? (
        <img src={`${SERVER_URL}${row.image}`} alt={row.title} className="h-full w-full object-cover" />
      ) : (
        <ImageOff className="h-4 w-4" />
      )}
    </div>
  );
}

// "10 kg in stock · 4 kg sold · ₱80/kg expense"
const facts = (row) =>
  [
    `${row.stock} kg in stock`,
    row.actual.soldKg > 0 && `${row.actual.soldKg} kg sold`,
    row.expensePerKg !== null && `${money(row.expensePerKg)}/kg expense`,
  ]
    .filter(Boolean)
    .join(" · ");

function ProductName({ row }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Thumb row={row} />
      <div className="min-w-0">
        <Link to={`/farmer/products/${row._id}`} className="font-medium text-gray-900 hover:text-[#2f8f66] hover:underline">
          {row.title}
        </Link>
        <p className="text-xs text-gray-500">{facts(row)}</p>
      </div>
    </div>
  );
}

const Amount = ({ value, profit = false }) => (
  <td className={`px-4 py-3 text-right ${profit ? `font-semibold ${profitTone(value)}` : "text-gray-700"}`}>
    {money(value)}
  </td>
);

const Muted = ({ span, children, first = false }) => (
  <td colSpan={span} className={`px-4 py-3 text-center text-xs text-gray-400 ${first ? "border-l border-gray-100" : ""}`}>
    {children}
  </td>
);

// One product as a table row, from lg up: its estimate, then its sales. A
// listing without an expense per kg can't have either worked out, and says
// how to fix that instead.
function TableRow({ row }) {
  const { estimated, actual, expensePerKg } = row;
  return (
    <tr>
      <td className="px-4 py-3">
        <ProductName row={row} />
      </td>
      {expensePerKg === null ? (
        <td colSpan={6} className="border-l border-gray-100 px-4 py-3 text-center text-xs text-amber-700">
          No expense per kg yet.{" "}
          <Link to={`/farmer/products/${row._id}/edit`} className="font-semibold text-[#2f8f66] hover:underline">
            Add it
          </Link>{" "}
          to see this product&apos;s figures.
        </td>
      ) : (
        <>
          {estimated.profit === null ? (
            <Muted span={3} first>
              No recommended price in your municipality
            </Muted>
          ) : (
            <>
              <td className="border-l border-gray-100 px-4 py-3 text-right text-gray-700">{money(estimated.expense)}</td>
              <Amount value={estimated.income} />
              <Amount value={estimated.profit} profit />
            </>
          )}
          {actual.soldKg === 0 ? (
            <Muted span={3} first>
              No completed sales yet
            </Muted>
          ) : (
            <>
              <td className="border-l border-gray-100 px-4 py-3 text-right text-gray-700">{money(actual.expense)}</td>
              <Amount value={actual.income} />
              <Amount value={actual.profit} profit />
            </>
          )}
        </>
      )}
    </tr>
  );
}

// The farmer's expense, income and profit across all their products: the
// totals first, then each product's own figures. Everything here is worked out
// by the server from what is stored (server/utils/profit.js).
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
  const municipality = rows.find((row) => row.recommendation.municipality)?.recommendation.municipality;

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
            <div className="grid gap-4 md:grid-cols-2 md:gap-6">
              <TotalsCard
                kind="estimated"
                title="Estimated on stock · recommended price"
                note={`${totals.estimated.quantity} kg in stock across ${totals.estimated.products} product${
                  totals.estimated.products === 1 ? "" : "s"
                }, valued at the recommended price${municipality ? ` for ${municipality}` : ""}`}
                lines={[
                  { label: "Total Expense", value: totals.estimated.expense },
                  { label: "Estimated Income", value: totals.estimated.income },
                  { label: "Estimated Profit", value: totals.estimated.profit, strong: true },
                ]}
              />
              <TotalsCard
                kind="actual"
                title="Actual sales · completed orders"
                note={
                  totals.actual.soldKg > 0
                    ? `${totals.actual.soldKg} kg sold in ${totals.actual.orders} completed order${
                        totals.actual.orders === 1 ? "" : "s"
                      }`
                    : "No completed sales yet"
                }
                lines={[
                  { label: "Total Expense", value: totals.actual.expense },
                  { label: "Total Income", value: totals.actual.income },
                  { label: "Total Profit", value: totals.actual.profit, strong: true },
                ]}
              />
            </div>

            {(totals.missingExpense > 0 || totals.missingMarketPrice > 0) && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="left-out">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
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

            {rows.length === 0 ? (
              <p className="text-sm text-gray-500">
                No products yet. Add one from My Products to see its expense and profit here.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                {/* Phones and tablets: each product as a card with its two sets
                    of figures, rather than a table seven columns wide. */}
                <ul className="divide-y divide-gray-100 lg:hidden" data-testid="profit-cards">
                  {rows.map((row) => (
                    <li key={row._id} className="space-y-3 p-4">
                      <ProductName row={row} />
                      {row.expensePerKg === null ? (
                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          No expense per kg yet.{" "}
                          <Link to={`/farmer/products/${row._id}/edit`} className="font-semibold text-[#2f8f66] hover:underline">
                            Add it
                          </Link>{" "}
                          to see this product&apos;s figures.
                        </p>
                      ) : (
                        <ProfitPanels row={row} twoColumns />
                      )}
                    </li>
                  ))}
                </ul>

                <div className="overflow-x-auto max-lg:hidden">
                  <table className="w-full min-w-[46rem] text-left text-sm" data-testid="profit-table">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th rowSpan={2} className="px-4 py-3 align-bottom">
                          Product
                        </th>
                        <th colSpan={3} className="border-l border-gray-200 px-4 pb-1 pt-3 text-center">
                          Estimated on stock
                        </th>
                        <th colSpan={3} className="border-l border-gray-200 px-4 pb-1 pt-3 text-center">
                          Actual sales
                        </th>
                      </tr>
                      <tr>
                        <th className="border-l border-gray-200 px-4 pb-3 pt-1 text-right">Expense</th>
                        <th className="px-4 pb-3 pt-1 text-right">Income</th>
                        <th className="px-4 pb-3 pt-1 text-right">Profit</th>
                        <th className="border-l border-gray-200 px-4 pb-3 pt-1 text-right">Expense</th>
                        <th className="px-4 pb-3 pt-1 text-right">Income</th>
                        <th className="px-4 pb-3 pt-1 text-right">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map((row) => (
                        <TableRow key={row._id} row={row} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="space-y-1 text-xs text-gray-500">
              <p>
                <span className="font-semibold text-gray-700">Estimated on stock:</span> the kilos still in
                stock × the recommended price for your municipality, less your expense per kg on them. Your
                own selling price isn&apos;t used for the estimate.
              </p>
              <p>
                <span className="font-semibold text-gray-700">Actual sales:</span> what buyers paid on
                completed orders, less your expense per kg on the kilos sold. Orders not picked up yet count
                in neither until they are completed.
              </p>
            </div>
          </>
        )}
      </div>
    </FarmerLayout>
  );
}
