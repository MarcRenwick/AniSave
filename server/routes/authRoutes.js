const express = require("express");
const {
  registerUser,
  loginUser,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
  requestAccountDeletion,
  confirmAccountDeletion,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMe);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);
router.post("/delete-account/request-otp", protect, requestAccountDeletion);
router.post("/delete-account/confirm", protect, confirmAccountDeletion);

module.exports = router;
