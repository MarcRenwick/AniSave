const express = require("express");
const { getOverview } = require("../controllers/publicController");

const router = express.Router();

// Open to anyone: the landing page's counts and reviews.
router.get("/overview", getOverview);

module.exports = router;
