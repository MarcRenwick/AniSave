const mongoose = require("mongoose");

// One chat message: text, a photo, or a photo with a caption. The text is
// only ever shown as text, never as markup.
const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      // A photo can be sent on its own; anything else needs words.
      required: [
        function () {
          return !this.image;
        },
        "A message can't be empty",
      ],
      trim: true,
      maxlength: [1000, "A message must be 1000 characters or fewer"],
    },
    // "/chat-images/<file>". Private like a farmer's documents: only the two
    // people in the conversation can open it (GET /api/chat-images/:file).
    image: {
      type: String,
    },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
// Finding the message a photo belongs to, to check who may see it.
messageSchema.index({ image: 1 }, { sparse: true });

module.exports = mongoose.model("Message", messageSchema);
