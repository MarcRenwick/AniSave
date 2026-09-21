const asyncHandler = require("express-async-handler");
const MarketPrice = require("../models/MarketPrice");

// Which municipality a farmer is in comes from what they registered, never
// from a device's location: the address picker saved a province and a
// municipality/city, and older accounts have the same thing as text
// ("Aguilar, Pangasinan"). Nothing here reads coordinates.
const municipalityOf = (user) =>
  user?.address?.city || (user?.location || "").split(",")[0].trim() || "";

// Names are matched folded to lower case, with punctuation treated as a space,
// so "Talong (Egg Plant)" and "talong" are the same crop to this lookup.
const fold = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

// Words worth matching a record on their own. Short ones ("of", "sa") would
// match half the table, so they are left out.
const MIN_WORD = 3;
const wordsOf = (name) => fold(name).split(" ").filter((word) => word.length >= MIN_WORD);

// @desc    The latest market price for a crop in the farmer's own municipality,
//          as a suggested selling price. The farmer is free to ignore it.
// @route   GET /api/market-prices/recommendation?product=Mango
// @access  Private (farmer)
const getPriceRecommendation = asyncHandler(async (req, res) => {
  const typed = typeof req.query.product === "string" ? req.query.product.trim() : "";
  const municipalityLabel = municipalityOf(req.user);

  // Without a registered municipality there is nothing to look a price up in.
  // The farmer is told what to do about it rather than shown a guess.
  if (!municipalityLabel) {
    return res.json({ available: false, reason: "no-municipality" });
  }
  if (fold(typed).length < 2) {
    return res.json({ available: false, municipality: municipalityLabel, reason: "no-product" });
  }

  const key = fold(typed);
  // Every query below is pinned to this one municipality. A price from the
  // next town along is not this town's price, so it is never offered.
  const inMunicipality = { municipality: fold(municipalityLabel) };
  const latest = { sort: { recordedAt: -1 } };

  // The crop as the farmer wrote it, then the crop's own local names.
  let record = await MarketPrice.findOne(
    { ...inMunicipality, $or: [{ product: key }, { aliases: key }] },
    null,
    latest
  ).lean();

  // "Lakatan Banana" is still a banana: a record for one of the words the
  // farmer typed counts, which is why the record's own name is shown back to
  // them alongside the price.
  if (!record) {
    const words = wordsOf(typed);
    if (words.length > 0) {
      record = await MarketPrice.findOne(
        { ...inMunicipality, $or: [{ product: { $in: words } }, { aliases: { $in: words } }] },
        null,
        latest
      ).lean();
    }
  }

  if (!record) {
    return res.json({ available: false, municipality: municipalityLabel, reason: "no-data" });
  }

  res.json({
    available: true,
    municipality: record.municipalityLabel || municipalityLabel,
    product: record.label,
    // The recommendation IS the market price - the app never adjusts it, marks
    // it up, or averages anything together.
    pricePerKilo: record.pricePerKilo,
    recordedAt: record.recordedAt,
    source: record.source,
    exactMatch: record.product === key || (record.aliases || []).includes(key),
  });
});

module.exports = { getPriceRecommendation, municipalityOf, fold };
