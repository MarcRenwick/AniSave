const express = require("express");
const { requestReportCode, createReviewReport } = require("../controllers/reviewReportController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { emailLimiter, guessLimiter } = require("../middleware/rateLimiters");

const router = express.Router();

// Reporting a review takes two steps, like deleting an account: ask for an
// emailed code, then send the report with it. Buyers report other people's
// reviews; a farmer reports the ones written about their own products.
router.post("/request-otp", protect, authorize("buyer", "farmer"), emailLimiter, requestReportCode);
router.post("/", protect, authorize("buyer", "farmer"), guessLimiter, createReviewReport);

module.exports = router;
