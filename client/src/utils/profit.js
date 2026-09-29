// Money as the expense, income and profit figures show it: thousands
// separated, centavos only when there are some, and a loss with its minus sign
// in front of the peso sign (-₱200).
export const money = (amount) =>
  `${amount < 0 ? "-" : ""}₱${Math.abs(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

// A profit in green, a loss in red.
export const profitTone = (amount) => (amount < 0 ? "text-red-600" : "text-[#2f8f66]");

const cents = (amount) => Math.round(amount * 100) / 100;

// The product form's estimate, worked out as the farmer types - the same
// arithmetic the server does for a saved listing (server/utils/profit.js):
// the expense on the kilos being listed (at the cost of one: the total expense
// over the batch), and what they would fetch at the
// recommended (market) price. The farmer's own selling price is not used.
// Income and profit are null without a market price to work them out from.
export function estimate({ quantity, costPerUnit, marketPrice }) {
  const expense = cents(quantity * costPerUnit);
  if (marketPrice == null) return { expense, income: null, profit: null };
  const income = cents(quantity * marketPrice);
  return { expense, income, profit: cents(income - expense) };
}

// Everything the farmer's Product Details panel shows, from the listing's
// profit row (GET /api/products/:id/profit): the per-kilo (or per-tray)
// figures, where every listed kilo is, and what the kilos left would make.
// The cost of one kilo is the listing's total expense over the batch it was
// for (costPerUnit, worked out by the server) - never over the stock left.
//
// The remaining stock is valued at the recommended (market) price when the
// farmer's municipality has one, as everywhere else. Only here, with no
// market price recorded, it falls back to the farmer's own selling price -
// and says so - rather than showing nothing.
export function productFinancials(row) {
  const { costPerUnit, sellingPrice, price, recommendation, actual, pendingKg = 0, stock } = row;
  const hasCost = costPerUnit !== null && costPerUnit !== undefined;
  const marketPrice = recommendation?.available ? recommendation.pricePerKilo : null;
  const valuedAt = marketPrice ?? sellingPrice;
  const capital = hasCost ? cents(stock * costPerUnit) : null;
  const income = cents(stock * valuedAt);

  return {
    hasCost,
    unit: row.unit || "kg",
    totalExpense: row.totalExpense ?? null,
    initialQuantity: row.initialQuantity ?? null,
    costPerUnit: hasCost ? costPerUnit : null,
    sellingPrice,
    regularPrice: price,
    onSale: sellingPrice !== price,
    margin: hasCost ? cents(sellingPrice - costPerUnit) : null,
    marketPrice,
    municipality: recommendation?.municipality || null,
    actual,
    stock: {
      soldKg: actual.soldKg,
      pendingKg,
      inStockKg: stock,
      listedKg: actual.soldKg + pendingKg + stock,
    },
    remaining: {
      basis: marketPrice === null ? "selling" : "market",
      pricePerKg: valuedAt,
      capital,
      income,
      profit: hasCost ? cents(income - capital) : null,
    },
  };
}
