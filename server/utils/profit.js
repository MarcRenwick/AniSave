const { effectivePrice } = require("./pricing");
const { unitOf } = require("./units");

// Expense, income and profit on a farmer's listings, worked out from what is
// already stored - the listing's stock and total expense, the latest market
// price for the farmer's municipality, and their orders - rather than kept as
// numbers of their own. Nothing here can go stale when stock sells, the farmer
// restocks, or an administrator records a new market price.
//
// Every kilo of a listing is in one of three places, and is counted in one:
//   - still in stock: valued at the RECOMMENDED (market) price - an estimate,
//     since nobody has bought it yet. Where the farmer's municipality has no
//     market price for the product, the farmer's own selling price stands in,
//     and `estimated.basis` says which was used. The selling price itself is
//     never replaced by the market one.
//   - sold, in a completed order: ACTUAL income is what the buyers paid.
//   - in an order a buyer hasn't picked up yet: neither, until it is. These
//     kilos are reported so the gap between the two is explained.
// Expense is always the cost of one kilo times the kilos in question, and the
// cost of one kilo is the listing's total expense divided by the batch it was
// for (initialQuantity) - never by the stock left, which falls as it sells. So
// before anything sells, the estimate is (stock x price) - total expense, and
// a sale's profit is kilos sold x (price - total expense / initial quantity).
// Eggs work the same way by the tray.

// Pesos to the centavo, so 0.1 + 0.2 never shows as 0.30000000000000004.
const money = (amount) => Math.round(amount * 100) / 100;

// One listing's figures. `recommendation` is the answer the Recommended Price
// feature gives for its crop (controllers/marketPriceController.js), and
// `sales` its orders added up (see salesByProduct below).
// The cost of one kilo (or tray), or null without an expense to go on.
const costPerUnit = (product) =>
  typeof product.totalExpense === "number" && product.initialQuantity > 0
    ? product.totalExpense / product.initialQuantity
    : null;

function productProfit(product, recommendation, sales = {}) {
  const unitCost = costPerUnit(product);
  const marketPrice = recommendation?.available ? recommendation.pricePerKilo : null;
  const soldKg = sales.soldKg || 0;
  const income = money(sales.income || 0);

  const stockExpense = unitCost === null ? null : money(product.stock * unitCost);
  const sellingPrice = effectivePrice(product);
  // What the stock is valued at: the market price, or the farmer's own.
  const estimatePrice = marketPrice ?? sellingPrice;
  const stockIncome = money(product.stock * estimatePrice);
  const soldExpense = unitCost === null ? null : money(soldKg * unitCost);

  return {
    _id: product._id,
    title: product.title,
    image: product.image,
    productType: product.productType,
    stock: product.stock,
    price: product.price,
    salePrice: product.salePrice ?? null,
    // What a buyer pays right now - the Flash Sale price while one is running.
    sellingPrice,
    // What `stock` and the quantities below count in: "tray" for eggs.
    unit: unitOf(product.category),
    totalExpense: product.totalExpense ?? null,
    initialQuantity: product.initialQuantity ?? null,
    // The cost of one kilo (or tray): totalExpense / initialQuantity.
    costPerUnit: unitCost === null ? null : money(unitCost),
    recommendation: recommendation || { available: false, reason: "no-product" },
    estimated: {
      quantity: product.stock,
      basis: marketPrice === null ? "selling" : "market",
      pricePerKg: estimatePrice,
      expense: stockExpense,
      income: stockIncome,
      profit: stockExpense === null ? null : money(stockIncome - stockExpense),
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

// The totals across listings. Only listings with an expense are
// added up - without one there is no expense or profit to add - so each total
// profit is exactly its total income less its total expense, and the listings
// left out are counted so the page can say so. The estimate takes every such
// listing with stock, and counts how many were valued at the market price and
// how many at the farmer's own.
function profitTotals(rows) {
  const sum = (list, pick) => money(list.reduce((total, row) => total + pick(row), 0));

  const estimated = rows.filter((row) => row.estimated.profit !== null && row.estimated.quantity > 0);
  const actual = rows.filter((row) => row.actual.profit !== null);
  const estimatedExpense = sum(estimated, (row) => row.estimated.expense);
  const estimatedIncome = sum(estimated, (row) => row.estimated.income);
  const actualExpense = sum(actual, (row) => row.actual.expense);
  const actualIncome = sum(actual, (row) => row.actual.income);

  // Kilos and trays are counted apart; a tray isn't a kilo.
  const kilos = (list, pick) => list.filter((row) => row.unit !== "tray").reduce((total, row) => total + pick(row), 0);
  const trays = (list, pick) => list.filter((row) => row.unit === "tray").reduce((total, row) => total + pick(row), 0);

  return {
    estimated: {
      products: estimated.length,
      quantity: kilos(estimated, (row) => row.estimated.quantity),
      trays: trays(estimated, (row) => row.estimated.quantity),
      expense: estimatedExpense,
      income: estimatedIncome,
      profit: money(estimatedIncome - estimatedExpense),
      marketCount: estimated.filter((row) => row.estimated.basis === "market").length,
      ownCount: estimated.filter((row) => row.estimated.basis === "selling").length,
    },
    actual: {
      products: actual.filter((row) => row.actual.soldKg > 0).length,
      soldKg: kilos(actual, (row) => row.actual.soldKg),
      soldTrays: trays(actual, (row) => row.actual.soldKg),
      orders: actual.reduce((total, row) => total + row.actual.orders, 0),
      expense: actualExpense,
      income: actualIncome,
      profit: money(actualIncome - actualExpense),
    },
    missingExpense: rows.filter((row) => row.costPerUnit === null).length,
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
