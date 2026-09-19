const express = require("express");
const { getProvinces, getCities, getBarangays } = require("../controllers/locationController");

const router = express.Router();

router.get("/provinces", getProvinces);
router.get("/provinces/:provinceCode/cities", getCities);
router.get("/cities/:cityCode/barangays", getBarangays);

module.exports = router;
