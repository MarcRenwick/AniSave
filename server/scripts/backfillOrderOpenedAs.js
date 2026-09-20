#!/usr/bin/env node
/*
 * Fills in `openedAs` on orders placed before it existed - the status an order
 * started in, which is what Undo needs to know whether an accepted order goes
 * back to "new" or to "preorder" (they look identical once accepted).
 *
 *   node scripts/backfillOrderOpenedAs.js --dry-run   show what would change
 *   node scripts/backfillOrderOpenedAs.js             apply it
 *
 * An order still waiting on the farmer says it itself: its status IS the status
 * it opened in. One already under way doesn't, so it follows the listing it was
 * placed on - a best guess, and the only one available, since a farmer may have
 * switched the listing between For Sale and For Pre-Order since. Safe to run
 * more than once: it only looks at orders that have no `openedAs` yet.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");

const DRY_RUN = process.argv.includes("--dry-run");
const verb = (applied, planned) => (DRY_RUN ? planned : applied);

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  if (DRY_RUN) console.log("Dry run - nothing will be changed.\n");

  const orders = await Order.find({ openedAs: { $exists: false } }).select(
    "status productTitle product createdAt"
  );

  if (orders.length === 0) {
    console.log("Every order already says which status it opened in. Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  let exact = 0;
  let guessed = 0;

  for (const order of orders) {
    let openedAs;
    let how;

    if (order.status === "new" || order.status === "preorder") {
      openedAs = order.status;
      how = "from the order itself";
    } else {
      const product = await Product.findById(order.product).select("productType");
      openedAs = product?.productType === "preorder" ? "preorder" : "new";
      how = product ? `from the listing, which is now "${product.productType}"` : "no listing left - assumed a normal order";
    }

    console.log(`  ${verb("set      ", "would set")} ${order._id} (${order.status}, ${order.productTitle}) -> ${openedAs}  [${how}]`);
    if (!DRY_RUN) await Order.updateOne({ _id: order._id }, { $set: { openedAs } });
    if (how === "from the order itself") exact += 1;
    else guessed += 1;
  }

  console.log(
    `\n  ${orders.length} order(s) ${verb("filled in", "would be filled in")}: ${exact} read straight off the order, ${guessed} taken from the listing.`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
