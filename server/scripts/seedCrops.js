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
 * The catalogue itself lives in data/crops.js.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Crop = require("../models/Crop");
const { CROPS } = require("../data/crops");
const { fold } = require("../utils/fold");

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  // A duplicate name in the catalogue would quietly split a crop's market
  // prices across two rows, so it is caught here rather than in the data.
  const bySlug = new Map();
  for (const crop of CROPS) {
    const slug = fold(crop.name);
    if (bySlug.has(slug)) throw new Error(`data/crops.js lists "${crop.name}" twice`);
    bySlug.set(slug, crop);
  }
  const claimed = new Map();
  for (const crop of CROPS) {
    for (const alias of crop.aliases.map(fold)) {
      if (bySlug.has(alias) && bySlug.get(alias) !== crop) {
        throw new Error(`"${alias}" is both a crop of its own and an alias of "${crop.name}"`);
      }
      if (claimed.has(alias)) {
        throw new Error(`"${alias}" is an alias of both "${claimed.get(alias)}" and "${crop.name}"`);
      }
      claimed.set(alias, crop.name);
    }
  }

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

  let added = 0;
  let updated = 0;
  for (const crop of CROPS) {
    // A crop is identified by its slug - its name, folded - so running this
    // again updates the row it wrote last time instead of adding a second one.
    // The write goes through the model, so the pre-validate hook sets the slug,
    // folds the aliases and rebuilds the searchable terms.
    const existing = await Crop.findOne({ slug: fold(crop.name) });
    const doc = existing || new Crop();
    doc.set({ ...crop, pricesFrom: null, active: true });
    await doc.save();
    if (existing) updated += 1;
    else added += 1;
  }

  // Done in a second pass, because a variety's parent may not have existed yet
  // on the first one.
  let linked = 0;
  for (const crop of CROPS.filter((c) => c.pricesFrom)) {
    const parent = await Crop.findOne({ slug: fold(crop.pricesFrom) });
    if (!parent) throw new Error(`"${crop.name}" is priced as "${crop.pricesFrom}", which isn't in the catalogue`);
    await Crop.updateOne({ slug: fold(crop.name) }, { $set: { pricesFrom: parent._id } });
    linked += 1;
  }

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
