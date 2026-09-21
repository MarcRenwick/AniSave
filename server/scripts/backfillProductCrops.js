#!/usr/bin/env node
/*
 * Points listings made before the crop catalogue existed at the catalogue crop
 * they name, so they too can be shown a recommended price and be found by the
 * product selector.
 *
 *   node scripts/backfillProductCrops.js --dry-run   show what would change
 *   node scripts/backfillProductCrops.js             do it
 *   node scripts/backfillProductCrops.js --rename    also rewrite each
 *                                                    listing's title to the
 *                                                    catalogue's own name
 *
 * Only listings with no crop are touched, and only where the title matches
 * exactly one catalogue crop - by its name, by one of its other local names,
 * or by a word in the title ("Lakatan Banana" is a banana). Anything
 * ambiguous or unrecognised is listed and left alone, for the farmer to fix by
 * editing the listing.
 *
 * Without --rename the titles stay exactly as the farmers wrote them, so
 * nothing visibly changes for anyone; only the link to the catalogue is added.
 *
 * Run scripts/seedCrops.js first - there is nothing to match against until the
 * catalogue exists.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Crop = require("../models/Crop");
const { fold } = require("../utils/fold");

const DRY_RUN = process.argv.includes("--dry-run");
const RENAME = process.argv.includes("--rename");

// Words too short or too general to identify a crop on their own.
const MIN_WORD = 3;
const STOP_WORDS = new Set(["the", "and", "for", "fresh", "organic", "native", "local", "sweet", "red", "green", "kg", "per", "kilo"]);

function matcher(crops) {
  const byKey = new Map();
  for (const crop of crops) {
    byKey.set(crop.slug, crop);
    for (const alias of crop.aliases) byKey.set(alias, crop);
  }

  return (title) => {
    const key = fold(title);
    if (byKey.has(key)) return { crop: byKey.get(key), how: "exact" };

    // "Talong (Egg Plant)" folds to "talong egg plant"; the crop is whichever
    // of its words the catalogue knows - as long as it is only one of them.
    const words = key.split(" ").filter((w) => w.length >= MIN_WORD && !STOP_WORDS.has(w));
    const hits = new Map();
    for (const word of words) {
      const crop = byKey.get(word);
      if (crop) hits.set(String(crop._id), crop);
    }
    if (hits.size === 1) return { crop: [...hits.values()][0], how: "by name" };
    if (hits.size > 1) return { crop: null, how: `ambiguous (${[...hits.values()].map((c) => c.name).join(" / ")})` };
    return { crop: null, how: "no match" };
  };
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`database: ${mongoose.connection.name}${DRY_RUN ? "  (dry run - nothing will be written)" : ""}\n`);

  const crops = await Crop.find({ active: true }).select("name slug aliases listingCategory").lean();
  if (crops.length === 0) {
    console.log("The crop catalogue is empty. Run: node scripts/seedCrops.js");
    return;
  }
  const match = matcher(crops);

  const products = await Product.find({ $or: [{ crop: null }, { crop: { $exists: false } }] }).select("title crop category");
  if (products.length === 0) {
    console.log("Every listing already points at a catalogue crop. Nothing to do.");
    return;
  }

  const matched = [];
  const skipped = [];
  for (const product of products) {
    const { crop, how } = match(product.title);
    if (crop) matched.push({ product, crop, how });
    else skipped.push({ product, how });
  }

  const pad = Math.max(0, ...products.map((p) => p.title.length));
  for (const { product, crop, how } of matched) {
    const rename = RENAME && product.title !== crop.name ? `  (title -> "${crop.name}")` : "";
    console.log(`  ${product.title.padEnd(pad)}  ->  ${crop.name}  [${how}]${rename}`);
  }
  for (const { product, how } of skipped) {
    console.log(`  ${product.title.padEnd(pad)}  ->  left as it is  [${how}]`);
  }

  if (!DRY_RUN) {
    for (const { product, crop } of matched) {
      product.crop = crop._id;
      if (RENAME) {
        product.title = crop.name;
        product.category = crop.listingCategory;
      }
      await product.save();
    }
  }

  console.log(
    `\n${matched.length} of ${products.length} listing(s) ${DRY_RUN ? "would be" : "were"} linked to a catalogue crop.`
  );
  if (skipped.length > 0) {
    console.log(`${skipped.length} left alone - open each one in Edit Product and pick its product from the list.`);
  }
  if (matched.length > 0 && !RENAME) {
    console.log("Titles were left exactly as they are. Pass --rename to use the catalogue's own names instead.");
  }
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error(err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
