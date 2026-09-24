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
      // Whether it was a photo, so the list can say so.
      image: Boolean,
      // Deleted for everyone since: the list says so instead.
      deleted: Boolean,
      // Who deleted it for themselves - their list shows the one before it.
      hiddenFor: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        default: undefined,
      },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: Date,
    },
    // Null until the first message: a conversation nobody has written in yet
    // isn't shown in either person's list.
    lastMessageAt: {
      type: Date,
      default: null,
    },
    // When each side deleted the conversation. They no longer see anything
    // sent before then, and it only comes back to their list with a new
    // message. The other side keeps everything.
    buyerClearedAt: {
      type: Date,
      default: null,
    },
    farmerClearedAt: {
      type: Date,
      default: null,
    },
    // How many messages each side hasn't read yet. Since only the other
    // person's messages count, one side's number being 0 also means it has
    // seen everything the other sent: that is what "Seen" shows.
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
