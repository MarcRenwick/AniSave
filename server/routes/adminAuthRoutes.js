const express = require("express");
const { requestAdminOtp, registerAdmin } = require("../controllers/adminAuthController");

const router = express.Router();

router.post("/request-otp", requestAdminOtp);
router.post("/register", registerAdmin);

module.exports = router;
