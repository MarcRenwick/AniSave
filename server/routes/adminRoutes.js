const express = require("express");
const {
  getAllUsers,
  banUser,
  unbanUser,
  reviewFarmerVerification,
} = require("../controllers/adminController");
const { getReports, markReviewed, decideReport } = require("../controllers/reportController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/users", getAllUsers);
router.patch("/users/:id/ban", banUser);
router.patch("/users/:id/unban", unbanUser);
router.patch("/users/:id/verification", reviewFarmerVerification);

// Reports buyers have sent about farmers: review each one, then decide.
router.get("/reports", getReports);
router.patch("/reports/:id/review", markReviewed);
router.patch("/reports/:id/decision", decideReport);

module.exports = router;
