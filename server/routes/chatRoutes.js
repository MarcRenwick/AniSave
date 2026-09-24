const express = require("express");
const {
  getConversations,
  getUnreadCount,
  startConversation,
  getConversation,
  markRead,
  checkCanSend,
  sendMessage,
  unsendMessage,
  deleteMessageForMe,
  deleteConversation,
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
// Deleting: one of your own messages for both of you, any message for
// yourself only, or the whole conversation from your Messages. Always
// allowed - blocked or not.
router.post("/:id/messages/:messageId/unsend", unsendMessage);
router.delete("/:id/messages/:messageId", deleteMessageForMe);
router.delete("/:id", deleteConversation);
// A buyer's orders from the farmer they are talking to.
router.get("/:id/orders", authorize("buyer"), getConversationOrders);

module.exports = router;
