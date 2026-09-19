const asyncHandler = require("express-async-handler");
const locations = require("../utils/locations");

// The list only changes when someone rebuilds the data file, so let browsers
// hold onto it rather than asking again on every dropdown - for an hour, so a
// rebuilt list shows up the same day.
const cacheAWhile = (res) => res.set("Cache-Control", "public, max-age=3600");

// @desc    All provinces (Metro Manila included), A-Z
// @route   GET /api/locations/provinces
// @access  Public - needed on the sign-up page, before anyone has an account
const getProvinces = asyncHandler(async (req, res) => {
  cacheAWhile(res);
  res.json(locations.listProvinces());
});

// @desc    The cities and municipalities of one province, A-Z
// @route   GET /api/locations/provinces/:provinceCode/cities
// @access  Public
const getCities = asyncHandler(async (req, res) => {
  const cities = locations.listCities(req.params.provinceCode);
  if (!cities) {
    res.status(404);
    throw new Error("Province not found");
  }
  cacheAWhile(res);
  res.json(cities);
});

module.exports = { getProvinces, getCities };
