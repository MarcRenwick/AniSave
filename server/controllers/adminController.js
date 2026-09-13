const asyncHandler = require("express-async-handler");
const User = require("../models/User");

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

module.exports = { getAllUsers, banUser, unbanUser };
