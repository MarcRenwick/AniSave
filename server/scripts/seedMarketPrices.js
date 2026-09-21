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
 * so a real source can replace them: an administrator can add, edit and
 * archive records on the Market Prices page, or drop the rows with that source
 * and insert your own (from the municipal market's own monitoring, say, or the
 * DA's).
 *
 * Deliberately not every crop in every municipality: where there is no record,
 * the form says the recommendation is unavailable rather than borrowing a
 * price from the next town along.
 *
 * Run scripts/seedCrops.js first - a price is recorded against a catalogue
 * crop, so there is nothing to attach these to until the catalogue exists.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const MarketPrice = require("../models/MarketPrice");
const Crop = require("../models/Crop");
const locations = require("../utils/locations");
const { fold } = require("../utils/fold");

const DRY_RUN = process.argv.includes("--dry-run");
const REPLACE = process.argv.includes("--replace");
const SOURCE = "Sample data";

// Price per kilo, by municipality. Same crop, different town, different price -
// which is the whole point of the feature. Every name here has to be a crop the
// Recommended Price feature supports and a municipality in the service area;
// anything else stops the script rather than being quietly skipped.
const PRICES = {
  Aguilar: {
    Mango: 95,
    Ampalaya: 60,
    Okra: 50,
    Banana: 55,
    Tomato: 45,
    Eggplant: 50,
    Squash: 30,
    Cabbage: 70,
    Calamansi: 65,
    "Sweet Potato (Camote)": 45,
  },
  Mangaldan: {
    Mango: 110,
    Ampalaya: 70,
    Okra: 55,
    Banana: 60,
    Tomato: 55,
    Eggplant: 45,
    Squash: 35,
    Watermelon: 40,
    Guava: 60,
    Rice: 52,
  },
  "Dagupan City": {
    Mango: 140,
    Ampalaya: 80,
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
    Ampalaya: 55,
    Okra: 45,
    Banana: 50,
    Tomato: 40,
    Eggplant: 40,
    Squash: 28,
    "String Beans": 60,
    Cassava: 35,
  },
  Lingayen: {
    Mango: 125,
    Ampalaya: 75,
    Okra: 55,
    Banana: 65,
    Tomato: 50,
    Eggplant: 50,
    Pechay: 70,
    Papaya: 45,
  },
  Binmaley: {
    Mango: 120,
    Ampalaya: 72,
    Okra: 52,
    Banana: 62,
    Tomato: 48,
    Squash: 32,
    Carrot: 95,
  },
  "Urdaneta City": {
    Mango: 130,
    Ampalaya: 78,
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
const DAYS_BACK = {
  Aguilar: 1,
  Mangaldan: 1,
  "Dagupan City": 0,
  Mangatarem: 2,
  Lingayen: 1,
  Binmaley: 2,
  "Urdaneta City": 3,
};

async function main() {
  if (DRY_RUN) {
    console.log("Dry run - nothing will be written.\n");
  }
  await mongoose.connect(process.env.MONGO_URI);

  const area = locations.serviceArea();
  const cities = locations.listCities(area?.provinceCode || "") || [];
  const cityByName = new Map(cities.map((c) => [fold(c.name), c]));

  const crops = await Crop.find({ priceSupported: true, active: true }).select("name slug").lean();
  if (crops.length === 0) {
    throw new Error("The crop catalogue is empty. Run: node scripts/seedCrops.js");
  }
  const cropByName = new Map(crops.map((c) => [c.slug, c]));

  const now = new Date();
  const records = [];
  for (const [townName, priced] of Object.entries(PRICES)) {
    const city = cityByName.get(fold(townName));
    if (!city) throw new Error(`"${townName}" isn't a municipality/city in ${area?.province}`);
    // Stored at the start of the day, as the admin page does, so records
    // for the same day are ordered by which was entered last.
    const taken = new Date(now.getTime() - (DAYS_BACK[townName] || 0) * 86400000);
    const recordedAt = new Date(taken.getFullYear(), taken.getMonth(), taken.getDate());

    for (const [cropName, pricePerKilo] of Object.entries(priced)) {
      const crop = cropByName.get(fold(cropName));
      if (!crop) {
        throw new Error(`"${cropName}" isn't a product the Recommended Price feature supports`);
      }
      records.push({
        crop: crop._id,
        cropName: crop.name,
        cityCode: city.code,
        municipality: city.name,
        province: area?.province || "",
        pricePerKilo,
        recordedAt,
        source: SOURCE,
      });
    }
  }

  if (DRY_RUN) {
    for (const [town, priced] of Object.entries(PRICES)) {
      console.log(`  ${town}: ${Object.entries(priced).map(([c, p]) => `${c} P${p}`).join(", ")}`);
    }
    console.log(`\n  ${records.length} record(s) would be written, all marked "${SOURCE}".`);
    return;
  }

  if (REPLACE) {
    const { deletedCount } = await MarketPrice.deleteMany({ source: SOURCE });
    console.log(`Cleared ${deletedCount} existing sample record(s).`);
  }

  // Re-running shouldn't pile up duplicates of the same day's price: a record
  // is identified by its crop, its municipality and the day it was taken.
  let written = 0;
  for (const { cropName, ...record } of records) {
    void cropName;
    await MarketPrice.updateOne(
      { crop: record.crop, cityCode: record.cityCode, recordedAt: record.recordedAt },
      { $set: record },
      { upsert: true }
    );
    written += 1;
  }

  const total = await MarketPrice.countDocuments();
  console.log(`Wrote ${written} sample market price(s). The table now holds ${total} record(s).`);
  console.log("They are sample figures - replace them with your municipality's own data on the admin Market Prices page.");
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error(err.message || err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
