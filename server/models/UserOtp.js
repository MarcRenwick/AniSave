const mongoose = require("mongoose");

// A one-time code someone is waiting on: to confirm a new password, or to
// finish a two-step sign-in. There is at most one per person and purpose, so
// sending a new code replaces the old one - which stops working there and then.
//
// The code is kept as a bcrypt hash, never as itself. Each document carries its
// own expiry, and MongoDB deletes it once that has passed (the TTL index
// below). That clean-up runs about once a minute, so the expiry is also checked
// directly (utils/emailOtp.js): an expired code never works, even in the moment
// before it is deleted.
const userOtpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    purpose: {
      type: String,
      enum: ["password-change", "login"],
      required: true,
    },
    codeHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    // When the current code went out - "Resend" waits a minute from this.
    sentAt: {
      type: Date,
      required: true,
    },
    // Wrong guesses so far, kept across resends: after five the request is
    // deleted and the person starts again.
    attempts: {
      type: Number,
      default: 0,
    },
    // A password change only: the new password, already hashed with bcrypt.
    // It is not the account's password until the code has been entered - only
    // then is it copied onto the user.
    newPasswordHash: {
      type: String,
    },
  },
  { timestamps: true }
);

userOtpSchema.index({ user: 1, purpose: 1 }, { unique: true });
userOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("UserOtp", userOtpSchema);
