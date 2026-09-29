const Product = require("../models/Product");
const Order = require("../models/Order");

// Brings listings and orders made before two changes up to date:
//
//   - A listing's expense used to be recorded per kilo (`expensePerKg`); it is
//     now the total for the whole batch (`totalExpense`) with the batch's size
//     (`initialQuantity`). A listing's batch is taken to be the stock it has now
//     plus what its orders took off it (every order still holding stock, or
//     sold) - so the cost of one kilo comes out exactly as the farmer entered it:
//     totalExpense = expensePerKg x initialQuantity.
//   - Eggs are sold by the tray. Orders for eggs placed before orders recorded
//     their unit are marked as trays.
//
// Safe to run any number of times: a listing is migrated only while it has no
// initialQuantity, and an order only while it has no unit. Run at server
// startup (see server.js), and by scripts/migrateExpenses.js.

// Orders in these states took stock off the listing and haven't given it back.
const HOLDING_STOCK = ["new", "processing", "ready", "done"];
const money = (amount) => Math.round(amount * 100) / 100;

// How many kilos (or trays) each listing's orders took off it.
async function takenByOrders(productIds) {
  const rows = await Order.aggregate([
    { $match: { product: { $in: productIds }, status: { $in: HOLDING_STOCK } } },
    { $group: { _id: "$product", quantity: { $sum: "$quantity" } } },
  ]);
  return new Map(rows.map((row) => [row._id.toString(), row.quantity]));
}

// The batch a listing's expense is for, as best it can be told after the fact.
async function batchQuantity(product) {
  const taken = await takenByOrders([product._id]);
  return (product.stock || 0) + (taken.get(product._id.toString()) || 0);
}

async function migrateExpenses({ dryRun = false } = {}) {
  const products = Product.collection;
  const legacy = await products
    .find({ initialQuantity: { $exists: false } }, { projection: { stock: 1, expensePerKg: 1, title: 1 } })
    .toArray();
  const taken = await takenByOrders(legacy.map((p) => p._id));

  const changes = legacy.map((p) => {
    const initialQuantity = (p.stock || 0) + (taken.get(p._id.toString()) || 0);
    const perKg = typeof p.expensePerKg === "number" ? p.expensePerKg : null;
    return {
      _id: p._id,
      title: p.title,
      initialQuantity,
      totalExpense: perKg === null ? null : money(perKg * initialQuantity),
    };
  });

  if (!dryRun && changes.length) {
    await products.bulkWrite(
      changes.map((c) => ({
        updateOne: {
          filter: { _id: c._id, initialQuantity: { $exists: false } },
          update: {
            $set: { initialQuantity: c.initialQuantity, totalExpense: c.totalExpense },
            $unset: { expensePerKg: "" },
          },
        },
      }))
    );
  }

  // Egg orders from before orders recorded their unit.
  const eggIds = await products.distinct("_id", { category: "egg" });
  const eggOrders = await Order.collection.countDocuments({ product: { $in: eggIds }, unit: { $exists: false } });
  if (!dryRun && eggOrders) {
    await Order.collection.updateMany({ product: { $in: eggIds }, unit: { $exists: false } }, { $set: { unit: "tray" } });
  }

  return { products: changes, eggOrders };
}

module.exports = { migrateExpenses, batchQuantity };
