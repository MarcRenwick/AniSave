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
// the expense on the kilos being listed, and what they would fetch at the
// recommended (market) price. The farmer's own selling price is not used.
// Income and profit are null without a market price to work them out from.
export function estimate({ quantity, expensePerKg, marketPrice }) {
  const expense = cents(quantity * expensePerKg);
  if (marketPrice == null) return { expense, income: null, profit: null };
  const income = cents(quantity * marketPrice);
  return { expense, income, profit: cents(income - expense) };
}
