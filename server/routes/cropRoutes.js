const express = require("express");
const { searchCrops, getCrop, getSupportedCrops } = require("../controllers/cropController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// The catalogue is only ever read by someone filling in a form, so it needs an
// account - but not a particular role, since both a farmer listing produce and
// an administrator recording a price search it.
router.get("/", protect, searchCrops);

// Before "/:id", or "supported" would be read as an id.
router.get("/supported", protect, authorize("admin"), getSupportedCrops);
router.get("/:id", protect, getCrop);

module.exports = router;
