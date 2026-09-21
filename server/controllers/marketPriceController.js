const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const MarketPrice = require("../models/MarketPrice");
const Crop = require("../models/Crop");
const locations = require("../utils/locations");
const validate = require("../utils/validate");
const { fold } = require("../utils/fold");

// Which municipality a farmer is in comes from what they registered, never
// from a device's location: the address picker saved the municipality's own
// PSGC code, which is what a market price is filed under too. Accounts from
// before addresses were picked from lists have only the town's name, so that
// is matched by name as a fallback. Nothing here reads coordinates.
function municipalityOf(user) {
  const code = user?.address?.cityCode || null;
  const name = user?.address?.city || (user?.location || "").split(",")[0].trim() || "";
  if (code) {
    const city = locations.listCities(user.address.provinceCode || "")?.find((c) => c.code === code);
    return { cityCode: code, name: city?.name || name };
  }
  if (!name) return null;
  // Match the typed town against the service area's own list, so a legacy
  // account still gets the right code rather than a near-miss on the name.
  const area = locations.serviceArea();
  const match = (locations.listCities(area?.provinceCode || "") || []).find(
    (c) => fold(c.name) === fold(name)
  );
  return match ? { cityCode: match.code, name: match.name } : null;
}

// The latest live record for one crop in one municipality. This is the whole
// of the matching rule: same crop, same municipality, most recently recorded,
// not archived. There is no fallback to another town and no estimate.
const latestPriceFor = (cropId, cityCode) =>
  MarketPrice.findOne({ crop: cropId, cityCode, archived: false })
    .sort({ recordedAt: -1, createdAt: -1 })
    .lean();

// @desc    The latest market price for a crop in the farmer's own
//          municipality, as a suggested selling price. The farmer is free to
//          ignore it.
// @route   GET /api/market-prices/recommendation?crop=<crop id>
// @access  Private (farmer)
const getPriceRecommendation = asyncHandler(async (req, res) => {
  const cropId = req.query.crop;
  if (!cropId || !mongoose.isValidObjectId(cropId)) {
    return res.json({ available: false, reason: "no-product" });
  }

  const crop = await Crop.findById(cropId).select("name priceSupported active pricesFrom").lean();
  if (!crop || !crop.active) {
    return res.json({ available: false, reason: "no-product" });
  }

  // A variety is priced as the crop it is a variety of: the market records a
  // price for bananas, not for Lakatan separately. The record found is then
  // that crop's, and the answer says so rather than presenting it as the
  // variety's own price.
  const pricedCrop = crop.pricesFrom
    ? await Crop.findById(crop.pricesFrom).select("name priceSupported active").lean()
    : crop;

  const municipality = municipalityOf(req.user);

  // Without a registered municipality there is nothing to look a price up in.
  // The farmer is told what to do about it rather than shown a guess.
  if (!municipality) {
    return res.json({ available: false, product: crop.name, reason: "no-municipality" });
  }

  // The catalogue is wider than the Recommended Price feature on purpose: a
  // farmer may list produce nobody records a market price for.
  if (!crop.priceSupported || !pricedCrop?.active) {
    return res.json({
      available: false,
      product: crop.name,
      municipality: municipality.name,
      reason: "not-supported",
    });
  }

  const record = await latestPriceFor(pricedCrop._id, municipality.cityCode);
  if (!record) {
    return res.json({
      available: false,
      product: crop.name,
      municipality: municipality.name,
      reason: "no-data",
    });
  }

  res.json({
    available: true,
    product: crop.name,
    // Only when the price is recorded against another crop - the one this is a
    // variety of - so the form can say whose figure it is showing.
    pricedAs: pricedCrop._id.toString() === crop._id.toString() ? null : pricedCrop.name,
    municipality: municipality.name,
    // The recommendation IS the market price - the app never adjusts it, marks
    // it up, or averages anything together.
    pricePerKilo: record.pricePerKilo,
    recordedAt: record.recordedAt,
    source: record.source || null,
  });
});

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------

// A price may only be recorded against a municipality AniSave serves and a
// product the Recommended Price feature supports - anything else could never
// be recommended to anyone, so it is refused rather than quietly stored.
function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

async function checkedCrop(cropId) {
  if (!cropId || !mongoose.isValidObjectId(cropId)) throw badRequest("Choose a product");
  const crop = await Crop.findById(cropId).lean();
  if (!crop || !crop.active) throw badRequest("That product isn't in the list");
  if (!crop.priceSupported) {
    throw badRequest(`${crop.name} isn't one of the products the Recommended Price feature supports`);
  }
  // A variety reads its price from the crop it is a variety of, so recording
  // one against the variety would never be looked at.
  if (crop.pricesFrom) {
    const parent = await Crop.findById(crop.pricesFrom).select("name").lean();
    throw badRequest(`${crop.name} is priced as ${parent?.name || "the crop it is a variety of"} - record the price against that instead`);
  }
  return crop;
}

function checkedMunicipality(cityCode) {
  const area = locations.serviceArea();
  const city = (locations.listCities(area?.provinceCode || "") || []).find((c) => c.code === cityCode);
  if (!city) {
    throw badRequest(area ? `Choose a municipality/city in ${area.province}` : "Choose a municipality/city");
  }
  return { city, province: area?.province || "" };
}

// A date the administrator typed, as a day rather than a moment, and never in
// the future - a price can't have been taken at a market that hasn't happened.
//
// Every record is stored at the start of its day, including one saved without
// a date. Two prices for the same day therefore tie on `recordedAt`, and the
// lookup breaks that tie by which was entered last - so correcting today's
// price replaces it, instead of sorting underneath a record that happened to
// carry a time of day.
function checkedDate(value) {
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (value === undefined || value === "") return startOfDay(new Date());

  // "2026-09-21" on its own is read as UTC midnight, which is the day before
  // in some time zones - so a plain date is read as a local one.
  const plainDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  const when = plainDate
    ? new Date(Number(plainDate[1]), Number(plainDate[2]) - 1, Number(plainDate[3]))
    : new Date(value);
  if (Number.isNaN(when.getTime())) throw badRequest("Enter a valid date recorded");

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (when > endOfToday) throw badRequest("The date recorded can't be in the future");
  return startOfDay(when);
}

const withCrop = (query) => query.populate("crop", "name group priceSupported");

// @desc    Market-price records, newest first, for the admin page
// @route   GET /api/market-prices?cityCode=&crop=&archived=
// @access  Private (admin)
const listMarketPrices = asyncHandler(async (req, res) => {
  const filter = { archived: req.query.archived === "true" };
  if (req.query.cityCode) filter.cityCode = req.query.cityCode;
  if (req.query.crop && mongoose.isValidObjectId(req.query.crop)) filter.crop = req.query.crop;

  const records = await withCrop(MarketPrice.find(filter))
    .sort({ recordedAt: -1, createdAt: -1 })
    .limit(500)
    .lean();

  res.json(records);
});

// @desc    The municipalities and cities a price may be recorded for - the
//          service area's own list, so the admin form can't name anywhere else
// @route   GET /api/market-prices/municipalities
// @access  Private (admin)
const listMunicipalities = asyncHandler(async (req, res) => {
  const area = locations.serviceArea();
  res.json({
    province: area?.province || "",
    provinceCode: area?.provinceCode || "",
    cities: locations.listCities(area?.provinceCode || "") || [],
  });
});

// @desc    Record a market price
// @route   POST /api/market-prices
// @access  Private (admin)
const createMarketPrice = asyncHandler(async (req, res) => {
  const crop = await checkedCrop(req.body.crop);
  const { city, province } = checkedMunicipality(req.body.cityCode);
  const pricePerKilo = validate.number(req.body.pricePerKilo, "Price per kilo");
  const recordedAt = checkedDate(req.body.recordedAt);

  const record = await MarketPrice.create({
    crop: crop._id,
    cityCode: city.code,
    municipality: city.name,
    province,
    pricePerKilo,
    recordedAt,
    source: typeof req.body.source === "string" ? req.body.source.trim() : "",
    recordedBy: req.user._id,
  });

  res.status(201).json(await withCrop(MarketPrice.findById(record._id)).lean());
});

// @desc    Update a market-price record
// @route   PUT /api/market-prices/:id
// @access  Private (admin)
const updateMarketPrice = asyncHandler(async (req, res) => {
  const record = await MarketPrice.findById(req.params.id);
  if (!record) {
    res.status(404);
    throw new Error("Market price record not found");
  }

  if (req.body.crop !== undefined) record.crop = (await checkedCrop(req.body.crop))._id;
  if (req.body.cityCode !== undefined) {
    const { city, province } = checkedMunicipality(req.body.cityCode);
    record.cityCode = city.code;
    record.municipality = city.name;
    record.province = province;
  }
  if (req.body.pricePerKilo !== undefined) {
    record.pricePerKilo = validate.number(req.body.pricePerKilo, "Price per kilo");
  }
  if (req.body.recordedAt !== undefined) record.recordedAt = checkedDate(req.body.recordedAt);
  if (req.body.source !== undefined) record.source = String(req.body.source).trim();
  if (req.body.archived !== undefined) record.archived = Boolean(req.body.archived);
  record.recordedBy = req.user._id;

  await record.save();
  res.json(await withCrop(MarketPrice.findById(record._id)).lean());
});

// @desc    Archive a market-price record, or delete it outright
// @route   DELETE /api/market-prices/:id?permanent=true
// @access  Private (admin)
//
// Archiving is the normal way to retire an outdated price: the record stops
// being recommended but the history of what the crop went for is kept.
const removeMarketPrice = asyncHandler(async (req, res) => {
  const record = await MarketPrice.findById(req.params.id);
  if (!record) {
    res.status(404);
    throw new Error("Market price record not found");
  }

  if (req.query.permanent === "true") {
    await record.deleteOne();
    return res.json({ message: "Market price record deleted", id: req.params.id, deleted: true });
  }

  record.archived = true;
  await record.save();
  res.json(await withCrop(MarketPrice.findById(record._id)).lean());
});

module.exports = {
  getPriceRecommendation,
  listMarketPrices,
  listMunicipalities,
  createMarketPrice,
  updateMarketPrice,
  removeMarketPrice,
  municipalityOf,
};
