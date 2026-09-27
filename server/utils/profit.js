const { effectivePrice } = require("./pricing");

// Expense, income and profit on a farmer's listings, worked out from what is
// already stored - the listing's stock and expense per kilo, the latest market
// price for the farmer's municipality, and their orders - rather than kept as
// numbers of their own. Nothing here can go stale when stock sells, the farmer
// restocks, or an administrator records a new market price.
//
// Every kilo of a listing is in one of three places, and is counted in one:
//   - still in stock: valued at the RECOMMENDED (market) price - an estimate,
//     since nobody has bought it yet. The farmer's own selling price is
//     deliberately not used for this, and never replaced by the market one.
//   - sold, in a completed order: ACTUAL income is what the buyers paid.
//   - in an order a buyer hasn't picked up yet: neither, until it is. These
//     kilos are reported so the gap between the two is explained.
// Expense is always the farmer's expense per kilo times the kilos in question.

// Pesos to the centavo, so 0.1 + 0.2 never shows as 0.30000000000000004.
const money = (amount) => Math.round(amount * 100) / 100;

// One listing's figures. `recommendation` is the answer the Recommended Price
// feature gives for its crop (controllers/marketPriceController.js), and
// `sales` its orders added up (see salesByProduct below).
function productProfit(product, recommendation, sales = {}) {
  const expensePerKg = product.expensePerKg ?? null;
  const marketPrice = recommendation?.available ? recommendation.pricePerKilo : null;
  const soldKg = sales.soldKg || 0;
  const income = money(sales.income || 0);

  const stockExpense = expensePerKg === null ? null : money(product.stock * expensePerKg);
  const stockIncome = marketPrice === null ? null : money(product.stock * marketPrice);
  const soldExpense = expensePerKg === null ? null : money(soldKg * expensePerKg);

  return {
    _id: product._id,
    title: product.title,
    image: product.image,
    productType: product.productType,
    stock: product.stock,
    price: product.price,
    salePrice: product.salePrice ?? null,
    // What a buyer pays right now - the Flash Sale price while one is running.
    sellingPrice: effectivePrice(product),
    expensePerKg,
    recommendation: recommendation || { available: false, reason: "no-product" },
    estimated: {
      quantity: product.stock,
      expense: stockExpense,
      income: stockIncome,
      profit: stockExpense === null || stockIncome === null ? null : money(stockIncome - stockExpense),
    },
    actual: {
      soldKg,
      orders: sales.orders || 0,
      income,
      expense: soldExpense,
      profit: soldExpense === null ? null : money(income - soldExpense),
    },
    pendingKg: sales.pendingKg || 0,
  };
}

// The totals across listings. Only listings whose figures are all known are
// added up - one with no expense per kilo yet, or (for the estimate) no market
// price - so each total profit is exactly its total income less its total
// expense, and the listings left out are counted so the page can say so.
function profitTotals(rows) {
  const sum = (list, pick) => money(list.reduce((total, row) => total + pick(row), 0));

  const estimated = rows.filter((row) => row.estimated.profit !== null);
  const actual = rows.filter((row) => row.actual.profit !== null);
  const estimatedExpense = sum(estimated, (row) => row.estimated.expense);
  const estimatedIncome = sum(estimated, (row) => row.estimated.income);
  const actualExpense = sum(actual, (row) => row.actual.expense);
  const actualIncome = sum(actual, (row) => row.actual.income);

  return {
    estimated: {
      products: estimated.length,
      quantity: estimated.reduce((total, row) => total + row.estimated.quantity, 0),
      expense: estimatedExpense,
      income: estimatedIncome,
      profit: money(estimatedIncome - estimatedExpense),
    },
    actual: {
      products: actual.filter((row) => row.actual.soldKg > 0).length,
      soldKg: actual.reduce((total, row) => total + row.actual.soldKg, 0),
      orders: actual.reduce((total, row) => total + row.actual.orders, 0),
      expense: actualExpense,
      income: actualIncome,
      profit: money(actualIncome - actualExpense),
    },
    missingExpense: rows.filter((row) => row.expensePerKg === null).length,
    missingMarketPrice: rows.filter((row) => row.expensePerKg !== null && row.estimated.income === null).length,
  };
}

// The aggregation stages that add up a farmer's orders per listing: what has
// been sold (completed orders) and what is still waiting to be picked up.
// A pre-order the farmer hasn't accepted yet holds no stock, so it is neither.
const salesByProduct = (farmerId, productIds) => [
  { $match: { farmer: farmerId, product: { $in: productIds } } },
  {
    $group: {
      _id: "$product",
      soldKg: { $sum: { $cond: [{ $eq: ["$status", "done"] }, "$quantity", 0] } },
      income: { $sum: { $cond: [{ $eq: ["$status", "done"] }, "$total", 0] } },
      orders: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
      pendingKg: {
        $sum: { $cond: [{ $in: ["$status", ["new", "processing", "ready"]] }, "$quantity", 0] },
      },
    },
  },
];

module.exports = { productProfit, profitTotals, salesByProduct, money };
