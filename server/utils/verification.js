// Accounts created before document verification existed have no
// verificationStatus stored, so fall back to the isVerified flag they do have.
const effectiveVerificationStatus = (user) =>
  user.verificationStatus || (user.isVerified ? "approved" : "pending");

module.exports = { effectiveVerificationStatus };
