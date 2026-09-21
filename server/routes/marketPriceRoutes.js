const express = require("express");
const {
  getPriceRecommendation,
  listMarketPrices,
  listMunicipalities,
  createMarketPrice,
  updateMarketPrice,
  removeMarketPrice,
} = require("../controllers/marketPriceController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

// A farmer pricing their own listing. The municipality comes from their
// account, so there is nothing for the caller to pass but the crop.
router.get("/recommendation", protect, authorize("farmer"), getPriceRecommendation);

// Everything else is the administrator's price book. Farmers read prices only
// through the recommendation above - they never write one.
router.use(protect, authorize("admin"));

// Before "/:id", so it isn't read as a record id.
router.get("/municipalities", listMunicipalities);

router.route("/").get(listMarketPrices).post(createMarketPrice);
router.route("/:id").put(updateMarketPrice).delete(removeMarketPrice);

module.exports = router;
