const express = require("express");
const { requestTopUp, getMyTopUpRequests } = require("../controllers/walletController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, authorize("buyer"));

router.post("/topup-request", requestTopUp);
router.get("/my-requests", getMyTopUpRequests);

module.exports = router;
