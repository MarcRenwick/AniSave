const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// @desc    Register a new user (farmer or buyer)
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const {
    name,
    username,
    email,
    password,
    role,
    location,
    farmName,
    farmDescription,
  } = req.body;

  if (!name || !username || !email || !password || !role) {
    res.status(400);
    throw new Error("Name, username, email, password and role are required");
  }

  if (!["farmer", "buyer"].includes(role)) {
    res.status(400);
    throw new Error("Role must be either 'farmer' or 'buyer'");
  }

  const usernameTaken = await User.findOne({ username: username.toLowerCase() });
  if (usernameTaken) {
    res.status(400);
    throw new Error("Username is already taken");
  }

  const emailTaken = await User.findOne({ email: email.toLowerCase() });
  if (emailTaken) {
    res.status(400);
    throw new Error("Email is already registered");
  }

  const user = await User.create({
    name,
    username,
    email,
    password,
    role,
    location,
    farmName: role === "farmer" ? farmName : undefined,
    farmDescription: role === "farmer" ? farmDescription : undefined,
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    token: generateToken(user._id, user.role),
  });
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400);
    throw new Error("Username and password are required");
  }

  const user = await User.findOne({ username: username.toLowerCase() }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid username or password");
  }

  res.json({
    _id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    token: generateToken(user._id, user.role),
  });
});

// @desc    Get current logged-in user's profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

module.exports = { registerUser, loginUser, getMe };
