const express = require("express");
const {
  getAllUsers,
  banUser,
  unbanUser,
  getTopUpRequests,
  approveTopUp,
  rejectTopUp,
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/users", getAllUsers);
router.patch("/users/:id/ban", banUser);
router.patch("/users/:id/unban", unbanUser);

router.get("/topup-requests", getTopUpRequests);
router.patch("/topup-requests/:id/approve", approveTopUp);
router.patch("/topup-requests/:id/reject", rejectTopUp);

module.exports = router;
