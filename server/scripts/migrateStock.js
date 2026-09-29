#!/usr/bin/env node
/*
 * Moves orders placed when stock was taken the moment an order was placed over
 * to stock being taken when an order is completed: every order not completed
 * yet gives its quantity back to its product. The server does the same at
 * startup; this is for running it by hand.
 *
 *   node scripts/migrateStock.js --dry-run   show what would change
 *   node scripts/migrateStock.js             change it
 *
 * Safe to re-run: an order is only migrated while it has no stockTaken.
 * See utils/stockMigration.js.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { migrateStock } = require("../utils/stockMigration");

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const { returned, orders } = await migrateStock({ dryRun: DRY_RUN });
  if (DRY_RUN) console.log("Dry run - nothing was written.\n");
  console.log(
    `${orders} order(s) ${DRY_RUN ? "would be" : ""} marked; ${returned} of them ${DRY_RUN ? "would give" : "gave"} their stock back.`
  );
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error(err.message || err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
