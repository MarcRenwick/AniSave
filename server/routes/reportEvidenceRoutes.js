const express = require("express");
const { getEvidence } = require("../controllers/reportController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:filename", protect, getEvidence);

module.exports = router;
