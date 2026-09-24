const express = require("express");
const {
  getConversations,
  getUnreadCount,
  startConversation,
  getConversation,
  markRead,
  checkCanSend,
  sendMessage,
  getConversationOrders,
} = require("../controllers/chatController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { chatLimiter } = require("../middleware/rateLimiters");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// Chat is between buyers and farmers - admins have no conversations.
router.use(protect, authorize("buyer", "farmer"));

router.get("/", getConversations);
router.get("/unread", getUnreadCount);
// Only a buyer starts a conversation; the farmer replies in it.
router.post("/", authorize("buyer"), chatLimiter, startConversation);
router.get("/:id", getConversation);
router.patch("/:id/read", markRead);
// Text as JSON, or a photo (with an optional caption) as multipart. Whether
// they may send here at all is checked before a photo is accepted.
router.post("/:id/messages", chatLimiter, checkCanSend, upload.chat.single("image"), sendMessage);
// A buyer's orders from the farmer they are talking to.
router.get("/:id/orders", authorize("buyer"), getConversationOrders);

module.exports = router;
