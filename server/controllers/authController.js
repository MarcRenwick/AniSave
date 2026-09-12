const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");

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

// @desc    Email a 6-digit verification code to reset a password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  // Always respond the same way whether or not the email exists, so this
  // endpoint can't be used to check which emails are registered.
  if (user) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordCode = crypto.createHash("sha256").update(code).digest("hex");
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Your AniSave password reset code",
      html: `
        <p>Hi ${user.name},</p>
        <p>Someone requested a password reset for your AniSave account. Enter this code in the app to continue. It expires in 15 minutes.</p>
        <h2 style="letter-spacing: 6px;">${code}</h2>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });
  }

  res.json({ message: "If that email is registered, a verification code has been sent." });
});

// @desc    Reset password using the emailed verification code
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, password } = req.body;
  if (!email || !code || !password) {
    res.status(400);
    throw new Error("Email, verification code and new password are required");
  }

  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

  const user = await User.findOne({
    email: email.toLowerCase(),
    resetPasswordCode: hashedCode,
    resetPasswordExpires: { $gt: Date.now() },
  }).select("+resetPasswordCode +resetPasswordExpires");

  if (!user) {
    res.status(400);
    throw new Error("That verification code is invalid or has expired");
  }

  user.password = password;
  user.resetPasswordCode = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: "Password has been reset. You can now log in." });
});

module.exports = { registerUser, loginUser, getMe, forgotPassword, resetPassword };
