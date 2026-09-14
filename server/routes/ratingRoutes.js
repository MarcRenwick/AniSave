const express = require("express");
const { createRating } = require("../controllers/ratingController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("buyer"));

router.post("/", createRating);

module.exports = router;
