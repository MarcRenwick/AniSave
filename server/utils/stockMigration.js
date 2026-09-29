const Order = require("../models/Order");
const Product = require("../models/Product");

// Stock used to be taken off a product the moment an order was placed (or, for
// a pre-order, accepted), and given back if it was cancelled. It is now taken
// only when an order is completed. Orders from before have no `stockTaken`;
// this brings them over:
//
//   - one not completed yet but already holding stock (new, processing,
//     ready) gives its quantity back to the product, and is marked as not
//     having taken it - it will be taken when the order is completed;
//   - a completed one is marked as having taken it (it did);
//   - a pre-order still waiting, or a cancelled order, is marked as not.
//
// Each order is claimed on its own before its stock is given back, so running
// it twice at once, or any number of times, gives nothing back twice. Run at
// server startup (see server.js), and by scripts/migrateStock.js.
async function migrateStock({ dryRun = false } = {}) {
  const legacy = { stockTaken: { $exists: false } };
  const holding = await Order.collection
    .find({ ...legacy, status: { $in: ["new", "processing", "ready"] } }, { projection: { product: 1, quantity: 1 } })
    .toArray();
  const total = await Order.collection.countDocuments(legacy);
  if (dryRun) return { returned: holding.length, orders: total };

  let returned = 0;
  for (const order of holding) {
    const claimed = await Order.collection.updateOne({ _id: order._id, ...legacy }, { $set: { stockTaken: false } });
    if (claimed.modifiedCount) {
      await Product.collection.updateOne({ _id: order.product }, { $inc: { stock: order.quantity } });
      returned++;
    }
  }
  await Order.collection.updateMany({ ...legacy, status: "done" }, { $set: { stockTaken: true } });
  await Order.collection.updateMany(legacy, { $set: { stockTaken: false } });
  return { returned, orders: total };
}

module.exports = { migrateStock };
