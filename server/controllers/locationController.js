const asyncHandler = require("express-async-handler");
const locations = require("../utils/locations");

// The list only changes when someone rebuilds the data file, so let browsers
// hold onto it rather than asking again on every dropdown - for an hour, so a
// rebuilt list shows up the same day.
const cacheAWhile = (res) => res.set("Cache-Control", "public, max-age=3600");

// @desc    The one province AniSave serves, so the address form can show it
//          fixed instead of offering a choice of one
// @route   GET /api/locations/service-area
// @access  Public - the sign-up page needs it before anyone has an account
const getServiceArea = asyncHandler(async (req, res) => {
  cacheAWhile(res);
  res.json(locations.serviceArea());
});

// @desc    The provinces AniSave serves, A-Z
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

module.exports = { getServiceArea, getProvinces, getCities };
