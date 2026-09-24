#!/usr/bin/env node
/*
 * Fills the crop catalogue the product selector searches and market prices are
 * recorded against.
 *
 *   node scripts/seedCrops.js --dry-run   show what would be written
 *   node scripts/seedCrops.js             write it
 *
 * Safe to re-run: a crop is identified by its slug (its name, folded), so a
 * second run updates the rows it already wrote instead of duplicating them.
 * Crops in the database that this list doesn't mention are left alone - an
 * administrator may have added them - and nothing is ever deleted, because
 * listings and market prices point at these rows by id.
 *
 * The catalogue itself lives in data/crops.js, and the writing is done by
 * utils/cropCatalogue.js - which the server also runs at startup whenever a
 * crop is missing, so a new database gets the catalogue without this script.
 * Run it by hand to push changes to crops that are already there.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Crop = require("../models/Crop");
const { CROPS, checkCatalogue, syncCropCatalogue } = require("../utils/cropCatalogue");

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  checkCatalogue();

  const supported = CROPS.filter((c) => c.priceSupported);
  const groups = [...new Set(CROPS.map((c) => c.group))];

  if (DRY_RUN) {
    console.log("Dry run - nothing will be written.\n");
    for (const group of groups) {
      const inGroup = CROPS.filter((c) => c.group === group);
      console.log(`  ${group} (${inGroup.length}):`);
      console.log(`    ${inGroup.map((c) => (c.priceSupported ? c.name : `${c.name} (no price data)`)).join(", ")}\n`);
    }
    console.log(`  ${CROPS.length} crop(s) would be written, ${supported.length} of them supported by the Recommended Price feature.`);
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);
  const { added, updated, linked } = await syncCropCatalogue();

  const total = await Crop.countDocuments();
  const totalSupported = await Crop.countDocuments({ priceSupported: true });
  console.log(`Added ${added} crop(s), updated ${updated} already there${linked ? `, and linked ${linked} variety(ies) to the crop they are priced as` : ""}.`);
  console.log(`The catalogue now holds ${total}, ${totalSupported} of them supported by the Recommended Price feature.`);
  console.log("Supported means an administrator can record a market price for it - not that one exists yet.");
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error(err.message || err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
