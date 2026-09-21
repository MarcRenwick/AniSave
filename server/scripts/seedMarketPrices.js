#!/usr/bin/env node
/*
 * Fills the market-price table the Add Product form reads its suggested price
 * from: what a crop goes for at a given municipality's market, per kilo, on a
 * given day.
 *
 *   node scripts/seedMarketPrices.js --dry-run   show what would be written
 *   node scripts/seedMarketPrices.js             write it
 *   node scripts/seedMarketPrices.js --replace   clear the sample rows first
 *
 * THE FIGURES BELOW ARE SAMPLE DATA for this project, not an official feed.
 * They are marked `source: "Sample data"` so nothing pretends otherwise, and
 * so a real source can replace them: drop rows with that source and insert
 * your own (from the municipal market's own monitoring, say, or the DA's),
 * keeping the same shape - product, municipality, price per kilo, and the date
 * it was recorded.
 *
 * Deliberately not every crop in every municipality: where there is no record,
 * the form says the recommendation is unavailable rather than borrowing a
 * price from the next town along.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const MarketPrice = require("../models/MarketPrice");

const DRY_RUN = process.argv.includes("--dry-run");
const REPLACE = process.argv.includes("--replace");
const SOURCE = "Sample data";
const PROVINCE = "Pangasinan";

// Local names a farmer may well type instead of the English one.
const ALIASES = {
  mango: ["mangga"],
  "bitter melon": ["ampalaya", "amargoso"],
  okra: ["lady finger"],
  banana: ["saging", "lakatan"],
  tomato: ["kamatis", "tomatoes"],
  eggplant: ["talong"],
  squash: ["kalabasa"],
  cabbage: ["repolyo"],
  broccoli: ["brocoli"],
  watermelon: ["pakwan"],
  guava: ["bayabas"],
  "string beans": ["sitaw"],
  pechay: ["petsay"],
  onion: ["sibuyas"],
  papaya: ["papaia"],
  calamansi: ["kalamansi"],
  carrot: ["karot"],
  "dragon fruit": ["dragonfruit"],
};

// Price per kilo, by municipality. Same crop, different town, different price -
// which is the whole point of the feature.
const PRICES = {
  Aguilar: {
    Mango: 95,
    "Bitter melon": 60,
    Okra: 50,
    Banana: 55,
    Tomato: 45,
    Eggplant: 50,
    Squash: 30,
    Cabbage: 70,
    Broccoli: 150,
    Calamansi: 65,
  },
  Mangaldan: {
    Mango: 110,
    "Bitter melon": 70,
    Okra: 55,
    Banana: 60,
    Tomato: 55,
    Eggplant: 45,
    Squash: 35,
    Watermelon: 40,
    Guava: 60,
    Strawberry: 320,
  },
  "Dagupan City": {
    Mango: 140,
    "Bitter melon": 80,
    Okra: 60,
    Banana: 70,
    Tomato: 60,
    Eggplant: 55,
    Squash: 40,
    Cabbage: 85,
    Watermelon: 45,
    Onion: 130,
  },
  Mangatarem: {
    Mango: 100,
    "Bitter melon": 55,
    Okra: 45,
    Banana: 50,
    Tomato: 40,
    Eggplant: 40,
    Squash: 28,
    "String beans": 60,
  },
  Lingayen: {
    Mango: 125,
    "Bitter melon": 75,
    Okra: 55,
    Banana: 65,
    Tomato: 50,
    Eggplant: 50,
    Pechay: 70,
    Papaya: 45,
  },
  Binmaley: {
    Mango: 120,
    "Bitter melon": 72,
    Okra: 52,
    Banana: 62,
    Tomato: 48,
    Squash: 32,
    Carrot: 95,
  },
  "Urdaneta City": {
    Mango: 130,
    "Bitter melon": 78,
    Okra: 58,
    Banana: 68,
    Tomato: 58,
    Eggplant: 52,
    Cabbage: 80,
    Onion: 125,
  },
};

// Recorded over the last few days, so "the latest available record" means
// something and the form can show when the price was taken.
const DAYS_BACK = { Aguilar: 1, Mangaldan: 1, "Dagupan City": 0, Mangatarem: 2, Lingayen: 1, Binmaley: 2, "Urdaneta City": 3 };

const fold = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function rows() {
  const now = new Date();
  const out = [];
  for (const [municipalityLabel, crops] of Object.entries(PRICES)) {
    const recordedAt = new Date(now.getTime() - (DAYS_BACK[municipalityLabel] || 0) * 86400000);
    for (const [label, pricePerKilo] of Object.entries(crops)) {
      const product = fold(label);
      out.push({
        product,
        label,
        aliases: (ALIASES[product] || []).map(fold),
        municipality: fold(municipalityLabel),
        municipalityLabel,
        province: PROVINCE,
        pricePerKilo,
        recordedAt,
        source: SOURCE,
      });
    }
  }
  return out;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const records = rows();

  if (DRY_RUN) {
    console.log("Dry run - nothing will be written.\n");
    for (const [municipality, crops] of Object.entries(PRICES)) {
      console.log(`  ${municipality}: ${Object.entries(crops).map(([c, p]) => `${c} ₱${p}`).join(", ")}`);
    }
    console.log(`\n  ${records.length} record(s) would be written, all marked "${SOURCE}".`);
    await mongoose.disconnect();
    return;
  }

  if (REPLACE) {
    const { deletedCount } = await MarketPrice.deleteMany({ source: SOURCE });
    console.log(`Cleared ${deletedCount} existing sample record(s).`);
  }

  // Re-running shouldn't pile up duplicates of the same day's price: a record
  // is identified by its crop, its municipality and the day it was taken.
  let written = 0;
  for (const record of records) {
    await MarketPrice.updateOne(
      { product: record.product, municipality: record.municipality, recordedAt: record.recordedAt },
      { $set: record },
      { upsert: true }
    );
    written += 1;
  }

  const total = await MarketPrice.countDocuments();
  console.log(`Wrote ${written} sample market price(s). The table now holds ${total} record(s).`);
  console.log("They are sample figures - replace them with your municipality's own data when you have it.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
