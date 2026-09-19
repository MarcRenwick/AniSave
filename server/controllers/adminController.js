const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const { effectiveVerificationStatus } = require("../utils/verification");

const withStatus = (user) => ({
  ...user.toObject(),
  verificationStatus: effectiveVerificationStatus(user),
});

// @desc    List farmer/buyer accounts for moderation
// @route   GET /api/admin/users
// @access  Private (admin)
const getAllUsers = asyncHandler(async (req, res) => {
  const filter = { role: { $in: ["farmer", "buyer"] } };
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
// @route   PATCH /api/admin/users/:id/ban
// @access  Private (admin)
const banUser = asyncHandler(async (req, res) => {
  const { user, error } = await findModeratableUser(req.params.id);
  if (error) {
    res.status(error.status);
    throw new Error(error.message);
  }

  user.isBanned = true;
  // Any session they already have ends with the ban, and stays ended if they
  // are ever unbanned - they log in again.
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
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

  user.verificationStatus = approved ? "approved" : "rejected";
  user.isVerified = approved;
  user.verificationNote = approved ? undefined : note.trim();
  user.verificationReviewedAt = Date.now();
  await user.save();

  res.json(withStatus(user));
});

module.exports = { getAllUsers, banUser, unbanUser, reviewFarmerVerification };
