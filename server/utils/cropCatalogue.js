const Crop = require("../models/Crop");
const { CROPS } = require("../data/crops");
const { fold } = require("./fold");

// The crop catalogue the product selector searches and market prices are
// recorded against. The list itself lives in data/crops.js; this writes it to
// the database. Used by scripts/seedCrops.js, and at startup (below).

// A duplicate name in the catalogue would quietly split a crop's market
// prices across two rows, so it is caught here rather than in the data.
function checkCatalogue() {
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
}

// Safe to re-run: a crop is identified by its slug (its name, folded), so a
// second run updates the rows it already wrote instead of duplicating them.
// Crops in the database that the list doesn't mention are left alone, and
// nothing is ever deleted, because listings and market prices point at these
// rows by id.
async function syncCropCatalogue() {
  checkCatalogue();

  let added = 0;
  let updated = 0;
  for (const crop of CROPS) {
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

  return { added, updated, linked };
}

// At startup. A farmer can only list produce the catalogue knows, so a
// database without it - a new one, like a freshly made Atlas cluster - leaves
// the Add Product form with nothing to choose from. If any crop in the list is
// missing, the catalogue is written; otherwise nothing is touched.
async function ensureCropCatalogue() {
  const present = new Set(await Crop.distinct("slug"));
  const missing = CROPS.filter((crop) => !present.has(fold(crop.name))).length;
  if (missing === 0) return null;
  return { missing, ...(await syncCropCatalogue()) };
}

module.exports = { CROPS, checkCatalogue, syncCropCatalogue, ensureCropCatalogue };
