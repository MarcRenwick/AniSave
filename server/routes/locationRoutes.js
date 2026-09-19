const express = require("express");
const { getProvinces, getCities } = require("../controllers/locationController");

const router = express.Router();

router.get("/provinces", getProvinces);
router.get("/provinces/:provinceCode/cities", getCities);

module.exports = router;
