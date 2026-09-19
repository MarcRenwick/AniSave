const express = require("express");
const { createReport } = require("../controllers/reportController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { reportLimiter } = require("../middleware/rateLimiters");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// Only buyers report farmers. The limiter comes before the upload so a request
// that's turned away for sending too many never gets its photos written to disk.
router.post("/", protect, authorize("buyer"), reportLimiter, upload.reports.array("evidence", 5), createReport);

module.exports = router;
