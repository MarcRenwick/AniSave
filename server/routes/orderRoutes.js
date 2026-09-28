const express = require("express");
const {
  createOrder,
  getFarmerOrders,
  getFarmerAnalytics,
  getBuyerOrders,
  getOrderById,
  updateOrderStatus,
  undoOrderStatus,
  cancelOrder,
  archiveOrder,
} = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.post("/", authorize("buyer"), createOrder);
router.get("/farmer", authorize("farmer"), getFarmerOrders);
// The dashboard's sales charts.
router.get("/farmer/analytics", authorize("farmer"), getFarmerAnalytics);
router.get("/buyer", authorize("buyer"), getBuyerOrders);
router.get("/:id", getOrderById);
router.patch("/:id/status", authorize("farmer"), updateOrderStatus);
router.patch("/:id/undo", authorize("farmer"), undoOrderStatus);
router.patch("/:id/cancel", authorize("buyer"), cancelOrder);
router.patch("/:id/archive", authorize("buyer"), archiveOrder);

module.exports = router;
