const asyncHandler = require("express-async-handler");
const Crop = require("../models/Crop");
const { matchKey } = require("../utils/fold");

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
  // What the farmer typed, written the same way the catalogue's own terms are:
  // lower case, punctuation as spaces, each word singularised. That is what
  // makes "MANGO", "mango" and "mangoes" one and the same search, without the
  // catalogue having to list every spelling.
  const key = matchKey(typed);

  // With nothing typed, offer the start of the catalogue rather than nothing,
  // so the list is never an empty box.
  const base = { active: true };
  if (req.query.supportedOnly === "true") base.priceSupported = true;

  const matching = (pattern) =>
    Crop.find({ ...base, terms: pattern })
      .select(`${PUBLIC} terms`)
      .limit(60)
      .lean();

  let found;
  // The typed words, when the search falls back to matching them one by one.
  let fallbackWords = [];
  if (!key) {
    found = await Crop.find(base).select(`${PUBLIC} terms`).limit(60).lean();
  } else {
    found = await matching(new RegExp(literal(key)));

    // "Talong (Egg Plant)" names a crop the catalogue knows, just with more
    // words around it. If the whole phrase matches nothing, any one word of it
    // will do - short ones excepted, since "of" would drag in half the
    // catalogue.
    const words = key.split(" ").filter((w) => w.length >= 3);
    if (found.length === 0 && words.length > 1) {
      found = await matching(new RegExp(`^(${words.map(literal).join("|")})`));
      fallbackWords = words;
    }
  }

  // Matched word by word, the crop that more of the words point at comes
  // first: "Talong (Egg Plant)" is Eggplant by all three words, while Chicken
  // Egg only shares "egg".
  const wordsMatched = (crop) =>
    fallbackWords.filter((word) => crop.terms.some((term) => term.split(" ").some((part) => part.startsWith(word)))).length;

  // A crop's own name beats one of its other names at every level, so typing
  // "man" offers Mango before Cassava (whose local name is "manioc") and
  // Peanut (whose local name is "mani"). The first term is always the crop's
  // own name; the rest are its other names.
  //
  // A whole word of the name comes next, ahead of a name that merely starts
  // with what was typed: "egg" offers Duck Egg and Quail Egg before Eggplant.
  const rank = (crop) => {
    if (!key) return 9;
    const [own, ...others] = crop.terms;
    if (own === key) return 0;
    if (others.includes(key)) return 1;
    if (own.split(" ").includes(key)) return 2;
    if (own.startsWith(key)) return 3;
    if (others.some((a) => a.startsWith(key))) return 4;
    if (own.includes(key)) return 5;
    return 6;
  };
  found.sort((a, b) => wordsMatched(b) - wordsMatched(a) || rank(a) - rank(b) || a.name.localeCompare(b.name));

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
  // Varieties are left out: each reads its price from the crop it is a variety
  // of, so a price recorded against one would never be looked at.
  const crops = await Crop.find({ active: true, priceSupported: true, pricesFrom: null })
    .select(PUBLIC)
    .sort({ name: 1 })
    .lean();
  res.json(crops);
});

module.exports = { searchCrops, getCrop, getSupportedCrops };
