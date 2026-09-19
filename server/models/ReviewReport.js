const mongoose = require("mongoose");

// Why someone can report a review. The labels people see live in the client
// (client/src/utils/reviewReports.js); these are the values stored.
const REASONS = [
  "adult_content",
  "spam",
  "rude_abusive",
  "personal_info",
  "fake_review",
  "misleading_review",
  "other",
];

// pending    - just submitted, nobody has looked at it yet
// reviewed   - an admin has opened it and is looking into it
// dismissed  - final: an admin decided no action is needed
// removed    - final: an admin took the review down
// suspended  - final: an admin took the review down and suspended the person who wrote it
const STATUSES = ["pending", "reviewed", "dismissed", "removed", "suspended"];

const reviewReportSchema = new mongoose.Schema(
  {
    // A buyer, or a farmer whose product was reviewed
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rating",
      required: true,
    },
    // Who wrote the review - the person an admin can act against
    reviewAuthor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    reason: {
      type: String,
      enum: REASONS,
      required: [true, "Choose a reason for your report"],
    },
    // Only asked for when the reason is "other"
    description: {
      type: String,
      trim: true,
      maxlength: [320, "The description must be 320 characters or fewer"],
    },
    // The review as it read when it was reported, so an admin still sees what
    // was said if it has been taken down since.
    reviewSnapshot: {
      stars: { type: Number },
      comment: { type: String },
    },
    status: {
      type: String,
      enum: STATUSES,
      default: "pending",
    },

    // When an admin first opened it, and who
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // The final decision, when there is one
    decidedAt: { type: Date },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    decisionNote: {
      type: String,
      trim: true,
      maxlength: [500, "The note must be 500 characters or fewer"],
    },
  },
  { timestamps: true }
);

// Nobody reports the same review twice - a second report only makes more to read.
reviewReportSchema.index({ reporter: 1, rating: 1 }, { unique: true });
reviewReportSchema.index({ status: 1, createdAt: -1 });

const ReviewReport = mongoose.model("ReviewReport", reviewReportSchema);

module.exports = ReviewReport;
module.exports.REASONS = REASONS;
module.exports.STATUSES = STATUSES;
