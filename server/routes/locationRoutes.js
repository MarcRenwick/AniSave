const express = require("express");
const { getServiceArea, getProvinces, getCities } = require("../controllers/locationController");

const router = express.Router();

router.get("/service-area", getServiceArea);
router.get("/provinces", getProvinces);
router.get("/provinces/:provinceCode/cities", getCities);

module.exports = router;
