const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const validate = require("../utils/validate");
const { effectiveVerificationStatus } = require("../utils/verification");
const { disconnectUser } = require("../utils/realtime");

const withStatus = (user) => ({
  ...user.toObject(),
  verificationStatus: effectiveVerificationStatus(user),
});

// @desc    List farmer/buyer accounts for moderation
// @route   GET /api/admin/users
// @access  Private (admin)
const getAllUsers = asyncHandler(async (req, res) => {
  // A sign-up whose email was never verified isn't an account yet - nothing to
  // moderate, and no documents worth an admin's time.
  const filter = { role: { $in: ["farmer", "buyer"] }, emailVerified: { $ne: false } };
  if (req.query.role && ["farmer", "buyer"].includes(req.query.role)) {
    filter.role = req.query.role;
  }

  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json(users.map(withStatus));
});

const findModeratableUser = async (id) => {
  const user = await User.findOne({ _id: id, role: { $in: ["farmer", "buyer"] } });
  if (!user) return { error: { status: 404, message: "User not found" } };
  return { user };
};

// @desc    Ban a farmer/buyer account
// @route   PATCH /api/admin/users/:id/ban   { reason }
// @access  Private (admin)
const banUser = asyncHandler(async (req, res) => {
  // The person is shown this when they try to log in, so it is required - the
  // same as when a report ends in a suspension.
  const reason = validate.optionalText(validate.plainBody(req.body).reason, "The reason", { max: 500 });
  if (!reason) {
    res.status(400);
    throw new Error("A reason is required when banning a user");
  }

  const { user, error } = await findModeratableUser(req.params.id);
  if (error) {
    res.status(error.status);
    throw new Error(error.message);
  }

  user.isBanned = true;
  user.suspensionReason = reason;
  // Any session they already have ends with the ban, and stays ended if they
  // are ever unbanned - they log in again.
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  disconnectUser(user._id);
  res.json(withStatus(user));
});

// @desc    Unban a farmer/buyer account
// @route   PATCH /api/admin/users/:id/unban
// @access  Private (admin)
const unbanUser = asyncHandler(async (req, res) => {
  const { user, error } = await findModeratableUser(req.params.id);
  if (error) {
    res.status(error.status);
    throw new Error(error.message);
  }

  user.isBanned = false;
  // A suspension (from a report) ends with the unban, too.
  user.suspendedAt = undefined;
  user.suspensionReason = undefined;
  await user.save();
  res.json(withStatus(user));
});

// @desc    Approve or reject a farmer's submitted verification documents
// @route   PATCH /api/admin/users/:id/verification
// @access  Private (admin)
const reviewFarmerVerification = asyncHandler(async (req, res) => {
  const { approved, note } = req.body;
  if (typeof approved !== "boolean") {
    res.status(400);
    throw new Error("'approved' must be true or false");
  }
  // A rejected farmer has to be told what to fix before resubmitting.
  if (!approved && !note?.trim()) {
    res.status(400);
    throw new Error("A reason is required when rejecting a farmer");
  }

  const { user, error } = await findModeratableUser(req.params.id);
  if (error) {
    res.status(error.status);
    throw new Error(error.message);
  }
  if (user.role !== "farmer") {
    res.status(400);
    throw new Error("Only farmer accounts go through document verification");
  }
  if (!user.governmentId || user.farmDocuments.length === 0) {
    res.status(400);
    throw new Error("This farmer hasn't submitted their documents yet");
  }
  // One decision per submission. Without this an administrator could approve a
  // farmer and then reject the same documents a moment later (or the other way
  // round), leaving the account's history saying two different things. A farmer
  // who sends new documents goes back to pending and is reviewed again; an
  // approved farmer who needs restricting is banned instead.
  if (effectiveVerificationStatus(user) !== "pending") {
    res.status(400);
    throw new Error(
      "This farmer's verification has already been decided. It can only be reviewed again if they submit new documents."
    );
  }

  user.verificationStatus = approved ? "approved" : "rejected";
  user.isVerified = approved;
  user.verificationNote = approved ? undefined : note.trim();
  user.verificationReviewedAt = Date.now();
  await user.save();

  res.json(withStatus(user));
});

module.exports = { getAllUsers, banUser, unbanUser, reviewFarmerVerification };
