const express = require("express");
const { getFarmers, getFarmerProfile } = require("../controllers/farmerController");

const router = express.Router();

router.get("/", getFarmers);
router.get("/:id", getFarmerProfile);

module.exports = router;
