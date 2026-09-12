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
    code: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminOtp", adminOtpSchema);
