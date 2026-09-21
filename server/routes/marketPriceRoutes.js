const express = require("express");
const { getPriceRecommendation } = require("../controllers/marketPriceController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// A farmer pricing their own listing. The municipality comes from their
// account, so there is nothing for the caller to pass but the crop.
router.get("/recommendation", protect, authorize("farmer"), getPriceRecommendation);

module.exports = router;
