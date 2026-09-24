const express = require("express");
const { getChatImage } = require("../controllers/chatController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:filename", protect, authorize("buyer", "farmer"), getChatImage);

module.exports = router;
