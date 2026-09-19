const mongoose = require("mongoose");

// Why a buyer can report a seller. The labels people see live in the client
// (client/src/utils/reports.js); these are the values stored.
const REASONS = ["prohibited_item", "scam", "inappropriate_behavior", "misleading_photos", "other"];

// pending    - just submitted, nobody has looked at it yet
// reviewed   - an admin has opened it and is looking into it
// dismissed  - final: an admin decided no action is needed
// suspended  - final: an admin suspended the farmer over it
const STATUSES = ["pending", "reviewed", "dismissed", "suspended"];

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      enum: REASONS,
      required: [true, "Choose a reason for your report"],
    },
    description: {
      type: String,
      required: [true, "Please describe what happened"],
      trim: true,
      maxlength: [320, "The description must be 320 characters or fewer"],
    },
    // Optional photos, kept in private storage (only the reporter and admins can open them)
    evidence: {
      type: [String],
      default: [],
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

// "Has this buyer already got an open report against this farmer?"
reportSchema.index({ reporter: 1, farmer: 1, status: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

const Report = mongoose.model("Report", reportSchema);

module.exports = Report;
module.exports.REASONS = REASONS;
module.exports.STATUSES = STATUSES;
