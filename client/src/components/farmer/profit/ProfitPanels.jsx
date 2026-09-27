import { money, profitTone } from "../../../utils/profit";

// One labelled amount, with how it was worked out underneath, so every figure
// can be checked by hand.
function Figure({ label, value, how, strong = false, tone = "text-gray-900" }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="min-w-0">
        <p className={strong ? "font-semibold text-gray-900" : "text-gray-600"}>{label}</p>
        {how && <p className="text-xs text-gray-400">{how}</p>}
      </div>
      <p className={`shrink-0 ${strong ? "text-lg font-bold" : "font-semibold"} ${tone}`}>{value}</p>
    </div>
  );
}

// The two kinds of figure look different on purpose, so an estimate is never
// read as money already made: a dashed grey box for what the stock would fetch
// at the recommended price, a solid green one for what buyers actually paid.
function Panel({ kind, title, badge, note, children }) {
  const estimated = kind === "estimated";
  return (
    <section
      data-testid={`profit-${kind}`}
      className={`rounded-xl p-4 text-sm ${
        estimated ? "border border-dashed border-gray-300 bg-gray-50" : "bg-green-50 ring-1 ring-green-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            estimated ? "bg-gray-200 text-gray-700" : "bg-green-200 text-[#1f5c42]"
          }`}
        >
          {badge}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-gray-500">{note}</p>
      <div className="mt-3 space-y-2.5">{children}</div>
    </section>
  );
}

const kilos = (kg) => `${kg.toLocaleString()} kg`;

// A listing's expense, income and profit, as the server works them out
// (server/utils/profit.js): an estimate for the kilos still in stock, and the
// real figures for the kilos sold.
export default function ProfitPanels({ row, twoColumns = true }) {
  const { expensePerKg, estimated, actual, recommendation } = row;
  const noExpense = expensePerKg === null;

  return (
    <div className={`grid gap-4 ${twoColumns ? "md:grid-cols-2" : ""}`}>
      <Panel
        kind="estimated"
        title="Estimated on stock"
        badge="Recommended price"
        note={`For the ${kilos(estimated.quantity)} still in stock`}
      >
        {noExpense ? (
          <p className="text-gray-500">Add your expense per kg to see this.</p>
        ) : (
          <>
            <Figure
              label="Total Expense"
              value={money(estimated.expense)}
              how={`${kilos(estimated.quantity)} × ${money(expensePerKg)}`}
            />
            {estimated.income === null ? (
              <p className="text-gray-500">
                {recommendation.reason === "no-municipality"
                  ? "Add your municipality in Edit Profile to estimate income and profit."
                  : `There's no recommended price for ${row.title} in ${recommendation.municipality || "your municipality"}, so income and profit can't be estimated.`}
              </p>
            ) : (
              <>
                <Figure
                  label="Estimated Income"
                  value={money(estimated.income)}
                  how={`${kilos(estimated.quantity)} × ${money(recommendation.pricePerKilo)}`}
                />
                <div className="border-t border-gray-200 pt-2.5">
                  <Figure
                    label="Estimated Profit"
                    value={money(estimated.profit)}
                    strong
                    tone={profitTone(estimated.profit)}
                  />
                </div>
              </>
            )}
          </>
        )}
      </Panel>

      <Panel
        kind="actual"
        title="Actual sales"
        badge="Completed orders"
        note={
          actual.soldKg > 0
            ? `${kilos(actual.soldKg)} sold in ${actual.orders} completed order${actual.orders === 1 ? "" : "s"}`
            : "No completed sales yet"
        }
      >
        {actual.soldKg === 0 ? (
          <p className="text-gray-500">
            Once a buyer picks up an order, what they paid shows here as income.
          </p>
        ) : noExpense ? (
          <>
            <Figure label="Income" value={money(actual.income)} how="What buyers paid" />
            <p className="text-gray-500">Add your expense per kg to see the profit on these sales.</p>
          </>
        ) : (
          <>
            <Figure
              label="Expense"
              value={money(actual.expense)}
              how={`${kilos(actual.soldKg)} × ${money(expensePerKg)}`}
            />
            <Figure label="Income" value={money(actual.income)} how="What buyers paid" />
            <div className="border-t border-green-200 pt-2.5">
              <Figure label="Profit" value={money(actual.profit)} strong tone={profitTone(actual.profit)} />
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
