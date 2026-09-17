const express = require("express");
const {
  createOrder,
  getFarmerOrders,
  getBuyerOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  archiveOrder,
} = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/", authorize("buyer"), createOrder);
router.get("/farmer", authorize("farmer"), getFarmerOrders);
router.get("/buyer", authorize("buyer"), getBuyerOrders);
router.get("/:id", getOrderById);
router.patch("/:id/status", authorize("farmer"), updateOrderStatus);
router.patch("/:id/cancel", authorize("buyer"), cancelOrder);
router.patch("/:id/archive", authorize("buyer"), archiveOrder);

module.exports = router;
