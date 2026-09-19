const express = require("express");
const { requestAdminOtp, registerAdmin } = require("../controllers/adminAuthController");
const { guessLimiter, emailLimiter } = require("../middleware/rateLimiters");

const router = express.Router();

router.post("/request-otp", emailLimiter, requestAdminOtp);
router.post("/register", guessLimiter, registerAdmin);

module.exports = router;
