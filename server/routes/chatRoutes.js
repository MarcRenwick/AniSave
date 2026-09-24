const express = require("express");
const {
  getConversations,
  getUnreadCount,
  startConversation,
  getConversation,
  markRead,
  sendMessage,
} = require("../controllers/chatController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { chatLimiter } = require("../middleware/rateLimiters");

const router = express.Router();

// Chat is between buyers and farmers - admins have no conversations.
router.use(protect, authorize("buyer", "farmer"));

router.get("/", getConversations);
router.get("/unread", getUnreadCount);
// Only a buyer starts a conversation; the farmer replies in it.
router.post("/", authorize("buyer"), chatLimiter, startConversation);
router.get("/:id", getConversation);
router.patch("/:id/read", markRead);
router.post("/:id/messages", chatLimiter, sendMessage);

module.exports = router;
