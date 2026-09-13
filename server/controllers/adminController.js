const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const TopUpRequest = require("../models/TopUpRequest");

// @desc    List farmer/buyer accounts for moderation
// @route   GET /api/admin/users
// @access  Private (admin)
const getAllUsers = asyncHandler(async (req, res) => {
  const filter = { role: { $in: ["farmer", "buyer"] } };
  if (req.query.role && ["farmer", "buyer"].includes(req.query.role)) {
    filter.role = req.query.role;
  }

  const users = await User.find(filter).sort({ createdAt: -1 });
  res.json(users);
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
  await user.save();
  res.json(user);
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
  res.json(user);
});

// @desc    List wallet top-up requests (pending by default)
// @route   GET /api/admin/topup-requests
// @access  Private (admin)
const getTopUpRequests = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status && ["pending", "approved", "rejected"].includes(req.query.status)) {
    filter.status = req.query.status;
  } else {
    filter.status = "pending";
  }

  const requests = await TopUpRequest.find(filter)
    .populate("buyer", "name username")
    .sort({ createdAt: -1 });
  res.json(requests);
});

const findPendingTopUp = async (id) => {
  const request = await TopUpRequest.findById(id);
  if (!request) return { error: { status: 404, message: "Top-up request not found" } };
  if (request.status !== "pending") {
    return { error: { status: 400, message: "This request has already been reviewed" } };
  }
  return { request };
};

// @desc    Approve a top-up request and credit the buyer's wallet
// @route   PATCH /api/admin/topup-requests/:id/approve
// @access  Private (admin)
const approveTopUp = asyncHandler(async (req, res) => {
  const { request, error } = await findPendingTopUp(req.params.id);
  if (error) {
    res.status(error.status);
    throw new Error(error.message);
  }

  const buyer = await User.findById(request.buyer);
  if (!buyer) {
    res.status(404);
    throw new Error("Buyer account not found");
  }

  buyer.walletBalance += request.amount;
  await buyer.save();

  request.status = "approved";
  request.reviewedBy = req.user._id;
  request.reviewedAt = Date.now();
  await request.save();

  res.json(request);
});

// @desc    Reject a top-up request
// @route   PATCH /api/admin/topup-requests/:id/reject
// @access  Private (admin)
const rejectTopUp = asyncHandler(async (req, res) => {
  const { request, error } = await findPendingTopUp(req.params.id);
  if (error) {
    res.status(error.status);
    throw new Error(error.message);
  }

  request.status = "rejected";
  request.reviewedBy = req.user._id;
  request.reviewedAt = Date.now();
  await request.save();

  res.json(request);
});

module.exports = {
  getAllUsers,
  banUser,
  unbanUser,
  getTopUpRequests,
  approveTopUp,
  rejectTopUp,
};
