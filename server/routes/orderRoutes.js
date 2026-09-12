const express = require("express");
const {
  createOrder,
  getFarmerOrders,
  getBuyerOrders,
  updateOrderStatus,
} = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/", authorize("buyer"), createOrder);
router.get("/farmer", authorize("farmer"), getFarmerOrders);
router.get("/buyer", authorize("buyer"), getBuyerOrders);
router.patch("/:id/status", authorize("farmer"), updateOrderStatus);

module.exports = router;
