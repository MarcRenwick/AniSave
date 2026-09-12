const express = require("express");
const { getFarmerProfile } = require("../controllers/farmerController");

const router = express.Router();

router.get("/:id", getFarmerProfile);

module.exports = router;
