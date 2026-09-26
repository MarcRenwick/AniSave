const express = require("express");
const {
  registerUser,
  loginUser,
  verifyLoginMfa,
  resendLoginMfa,
  verifyEmail,
  resendVerification,
  requestLoginOtp,
  loginWithOtp,
  submitVerification,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
  logoutUser,
  setMfa,
  requestAccountDeletion,
  confirmAccountDeletion,
  uploadAvatar,
  exportMyData,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { guessLimiter, emailLimiter, registerLimiter } = require("../middleware/rateLimiters");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// A farmer's verification documents: one government ID, up to 5 farm documents.
// They go to private storage, not the public uploads folder.
const verificationUploads = upload.documents.fields([
  { name: "governmentId", maxCount: 1 },
  { name: "farmDocuments", maxCount: 5 },
]);

router.post("/register", registerLimiter, verificationUploads, registerUser);
// A new account signs in for the first time with the code emailed at sign-up.
router.post("/verify-email", guessLimiter, verifyEmail);
router.post("/verify-email/resend", emailLimiter, resendVerification);
router.post("/login", guessLimiter, loginUser);
router.post("/login/mfa", guessLimiter, verifyLoginMfa);
router.post("/login/mfa/resend", emailLimiter, resendLoginMfa);
router.post("/login-otp/request", emailLimiter, requestLoginOtp);
router.post("/login-otp/verify", guessLimiter, loginWithOtp);
router.post("/logout", protect, logoutUser);
router.get("/me", protect, getMe);
router.get("/me/export", protect, exportMyData);
router.put("/mfa", protect, guessLimiter, setMfa);
router.post(
  "/verification",
  protect,
  authorize("farmer"),
  verificationUploads,
  submitVerification
);
router.post("/forgot-password", emailLimiter, forgotPassword);
router.post("/reset-password", guessLimiter, resetPassword);
router.put("/profile", protect, updateProfile);
router.put("/avatar", protect, upload.single("avatar"), uploadAvatar);
router.put("/change-password", protect, guessLimiter, changePassword);
router.post("/delete-account/request-otp", protect, emailLimiter, requestAccountDeletion);
router.post("/delete-account/confirm", protect, guessLimiter, confirmAccountDeletion);

module.exports = router;
