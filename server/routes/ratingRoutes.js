const express = require("express");
const {
  createRating,
  getProductRatings,
  toggleRatingLike,
} = require("../controllers/ratingController");
const { protect, authorize, optionalProtect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/product/:productId", optionalProtect, getProductRatings);
router.post("/", protect, authorize("buyer"), createRating);
router.post("/:id/like", protect, authorize("buyer"), toggleRatingLike);

module.exports = router;
