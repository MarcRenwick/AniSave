const asyncHandler = require("express-async-handler");
const Crop = require("../models/Crop");
const { fold } = require("../utils/fold");

// What a caller is allowed to see of a crop. The catalogue is not secret, but
// there is no reason to hand out timestamps or the folded matching fields.
const PUBLIC = "name group listingCategory priceSupported";

const MAX_RESULTS = 12;

// Escapes a typed string so it can go into a regular expression as plain text -
// otherwise a farmer typing "(" would make an invalid pattern.
const literal = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// @desc    Crops matching what the farmer has typed so far, for the product
//          selector. Ranked so an exact name comes first, then names that
//          start with it, then anything else that contains it - by name or by
//          one of the crop's other local names.
// @route   GET /api/crops?q=man
// @access  Private - only someone with an account lists or prices produce
const searchCrops = asyncHandler(async (req, res) => {
  const typed = typeof req.query.q === "string" ? req.query.q : "";
  const key = fold(typed);

  // With nothing typed, offer the start of the catalogue rather than nothing,
  // so the list is never an empty box.
  const base = { active: true };
  if (req.query.supportedOnly === "true") base.priceSupported = true;

  const matching = (pattern) =>
    Crop.find({ ...base, $or: [{ slug: pattern }, { aliases: pattern }] })
      .select(`${PUBLIC} slug aliases`)
      .limit(60)
      .lean();

  let found;
  if (!key) {
    found = await Crop.find(base).select(`${PUBLIC} slug aliases`).limit(60).lean();
  } else {
    found = await matching(new RegExp(literal(key)));

    // "Lakatan Banana" and "Talong (Egg Plant)" name a crop the catalogue
    // knows, just with more words around it. If the whole phrase matches
    // nothing, any one word of it will do - short ones excepted, since "of"
    // would drag in half the catalogue.
    const words = key.split(" ").filter((w) => w.length >= 3);
    if (found.length === 0 && words.length > 1) {
      found = await matching(new RegExp(`^(${words.map(literal).join("|")})`));
    }
  }

  // A crop's own name beats one of its other names at every level, so typing
  // "man" offers Mango before Cassava (whose local name is "manioc") and
  // Peanut (whose local name is "mani").
  const rank = (crop) => {
    if (!key) return 9;
    if (crop.slug === key) return 0;
    if (crop.aliases.includes(key)) return 1;
    if (crop.slug.startsWith(key)) return 2;
    if (crop.aliases.some((a) => a.startsWith(key))) return 3;
    if (crop.slug.includes(key)) return 4;
    return 5;
  };
  found.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));

  res.json(
    found.slice(0, MAX_RESULTS).map(({ _id, name, group, listingCategory, priceSupported }) => ({
      _id,
      name,
      group,
      listingCategory,
      priceSupported,
    }))
  );
});

// @desc    One crop by id, so a form can show what a saved listing points at
// @route   GET /api/crops/:id
// @access  Private
const getCrop = asyncHandler(async (req, res) => {
  const crop = await Crop.findById(req.params.id).select(PUBLIC).lean();
  if (!crop) {
    res.status(404);
    throw new Error("Crop not found");
  }
  res.json(crop);
});

// @desc    Every crop the Recommended Price feature supports, A-Z. The admin
//          price form picks from this - a price may only be recorded against a
//          product the feature can actually recommend.
// @route   GET /api/crops/supported
// @access  Private (admin)
const getSupportedCrops = asyncHandler(async (req, res) => {
  const crops = await Crop.find({ active: true, priceSupported: true })
    .select(PUBLIC)
    .sort({ name: 1 })
    .lean();
  res.json(crops);
});

module.exports = { searchCrops, getCrop, getSupportedCrops };
