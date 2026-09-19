const mongoose = require("mongoose");

// Short-lived OTP for the admin self-registration flow. Kept separate from
// the User model since, at this point, no admin User document exists yet.
const adminOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    // Stored as an HMAC (see utils/otp.js), never the code itself
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    // Wrong guesses so far - the code stops working after a few
    attempts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminOtp", adminOtpSchema);
