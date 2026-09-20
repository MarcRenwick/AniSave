const express = require("express");
const { createReviewReport } = require("../controllers/reviewReportController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { reportLimiter } = require("../middleware/rateLimiters");

const router = express.Router();

// Buyers report other people's reviews; a farmer reports the ones written
// about their own products.
router.post("/", protect, authorize("buyer", "farmer"), reportLimiter, createReviewReport);

module.exports = router;
