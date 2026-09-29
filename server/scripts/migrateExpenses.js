#!/usr/bin/env node
/*
 * Moves listings from an expense per kilo to a total expense for the batch,
 * and marks egg orders placed before orders recorded their unit as trays.
 * The server does the same at startup; this is for running it by hand.
 *
 *   node scripts/migrateExpenses.js --dry-run   show what would change
 *   node scripts/migrateExpenses.js             change it
 *
 * Safe to re-run: a listing is only migrated while it has no initialQuantity.
 * See utils/expenseMigration.js for how the batch is worked out.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { migrateExpenses } = require("../utils/expenseMigration");

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const { products, eggOrders } = await migrateExpenses({ dryRun: DRY_RUN });
  if (DRY_RUN) console.log("Dry run - nothing was written.\n");
  products.forEach((p) =>
    console.log(`  ${p.title}: ${p.initialQuantity} listed, total expense ${p.totalExpense === null ? "none recorded" : `P${p.totalExpense}`}`)
  );
  console.log(`\n${products.length} listing(s) ${DRY_RUN ? "would be" : ""} migrated; ${eggOrders} egg order(s) ${DRY_RUN ? "would be" : ""} marked as trays.`);
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error(err.message || err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
