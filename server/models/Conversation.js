const mongoose = require("mongoose");

// A 1-on-1 chat between one buyer and one farmer. There is at most one per
// pair: a buyer pressing "Message Farmer" again carries on the conversation
// they already have. Only these two people can read it (see chatController).
const conversationSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The newest message, kept here so the conversation list can show a
    // preview without reading every conversation's messages.
    lastMessage: {
      text: String,
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: Date,
    },
    // Null until the first message: a conversation nobody has written in yet
    // isn't shown in either person's list.
    lastMessageAt: {
      type: Date,
      default: null,
    },
    // How many messages each side hasn't read yet.
    buyerUnread: {
      type: Number,
      default: 0,
      min: 0,
    },
    farmerUnread: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

conversationSchema.index({ buyer: 1, farmer: 1 }, { unique: true });
conversationSchema.index({ buyer: 1, lastMessageAt: -1 });
conversationSchema.index({ farmer: 1, lastMessageAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
