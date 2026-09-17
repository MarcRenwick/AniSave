const express = require("express");
const {
  registerUser,
  loginUser,
  requestLoginOtp,
  loginWithOtp,
  submitVerification,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
  requestAccountDeletion,
  confirmAccountDeletion,
  uploadAvatar,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/login-otp/request", requestLoginOtp);
router.post("/login-otp/verify", loginWithOtp);
router.get("/me", protect, getMe);
router.post(
  "/verification",
  protect,
  authorize("farmer"),
  upload.fields([
    { name: "governmentId", maxCount: 1 },
    { name: "farmDocuments", maxCount: 5 },
  ]),
  submitVerification
);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.put("/profile", protect, updateProfile);
router.put("/avatar", protect, upload.single("avatar"), uploadAvatar);
router.put("/change-password", protect, changePassword);
router.post("/delete-account/request-otp", protect, requestAccountDeletion);
router.post("/delete-account/confirm", protect, confirmAccountDeletion);

module.exports = router;
