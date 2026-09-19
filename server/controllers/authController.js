const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Rating = require("../models/Rating");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");
const { imagePath, deleteImageFile } = require("../utils/fileUtils");
const { effectiveVerificationStatus } = require("../utils/verification");
const { resolveAddress } = require("../utils/locations");

// What a client needs to start a session. A farmer's pages read the
// verification fields to decide whether to show the pending/rejected banner,
// and everyone's read `address` to pre-fill the address pickers and to know
// whether "nearest" can be worked out for them.
const sessionPayload = (user) => ({
  _id: user._id,
  name: user.name,
  username: user.username,
  email: user.email,
  role: user.role,
  location: user.location,
  address: user.get("address"),
  avatar: user.avatar,
  isVerified: user.isVerified,
  verificationStatus: effectiveVerificationStatus(user),
  verificationNote: user.verificationNote,
  governmentId: user.governmentId,
  farmDocuments: user.farmDocuments,
  token: generateToken(user._id, user.role),
});

// @desc    Register a new user (farmer or buyer). A farmer sends their
//          verification documents in this same request.
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const {
    name,
    username,
    email,
    password,
    role,
    provinceCode,
    cityCode,
    farmName,
    farmDescription,
  } = req.body;

  // The account and its documents are created together or not at all, so a
  // refused upload can't leave a farmer with nothing for an admin to review.
  // Uploads only stay on disk if the account is actually created.
  const governmentIdFile = req.files?.governmentId?.[0];
  const farmDocumentFiles = req.files?.farmDocuments || [];
  const discardUploads = () => {
    if (governmentIdFile) deleteImageFile(imagePath(governmentIdFile));
    farmDocumentFiles.forEach((file) => deleteImageFile(imagePath(file)));
  };

  try {
    if (!name || !username || !email || !password || !role) {
      res.status(400);
      throw new Error("Name, username, email, password and role are required");
    }

    if (!["farmer", "buyer"].includes(role)) {
      res.status(400);
      throw new Error("Role must be either 'farmer' or 'buyer'");
    }

    // Farmers and buyers both pick where they are; the coordinates that
    // "nearest" is worked out from come from that pick, never from the client.
    const { address, label } = resolveAddress({ provinceCode, cityCode });

    const isFarmer = role === "farmer";
    if (isFarmer && !governmentIdFile) {
      res.status(400);
      throw new Error("A photo of a valid government-issued ID is required");
    }
    if (isFarmer && farmDocumentFiles.length === 0) {
      res.status(400);
      throw new Error("At least one farm-related document is required");
    }

    const usernameTaken = await User.findOne({ username: username.toLowerCase() });
    if (usernameTaken) {
      res.status(400);
      throw new Error("Username is already exist");
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
      location: label,
      address,
      farmName: isFarmer ? farmName : undefined,
      farmDescription: isFarmer ? farmDescription : undefined,
      // A farmer has to get their documents past an admin before selling.
      verificationStatus: isFarmer ? "pending" : "approved",
      governmentId: isFarmer ? imagePath(governmentIdFile) : undefined,
      farmDocuments: isFarmer ? farmDocumentFiles.map(imagePath) : undefined,
      verificationSubmittedAt: isFarmer ? Date.now() : undefined,
    });

    // Buyers don't have documents, so nothing they sent is worth keeping.
    if (!isFarmer) discardUploads();

    res.status(201).json(sessionPayload(user));
  } catch (err) {
    discardUploads();
    throw err;
  }
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

  if (user.isBanned) {
    res.status(403);
    throw new Error("This account has been banned. Contact support for more information.");
  }

  res.json(sessionPayload(user));
});

// @desc    Get current logged-in user's profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

// @desc    Email a 6-digit OTP for signing in without a password
// @route   POST /api/auth/login-otp/request
// @access  Public
const requestLoginOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  // Always answers the same way, so this can't be used to find out which
  // emails are registered. A banned account gets no code either.
  if (user && !user.isBanned) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.loginCode = crypto.createHash("sha256").update(code).digest("hex");
    user.loginCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Your AniSave login code",
      html: `
        <p>Hi ${user.name},</p>
        <p>Use this code to log in to AniSave. It expires in 10 minutes and can only be used once.</p>
        <h2 style="letter-spacing: 6px;">${code}</h2>
        <p>If you didn't try to log in, you can safely ignore this email - nobody can get in without this code.</p>
      `,
    });
  }

  res.json({ message: "If that email is registered, a login code has been sent." });
});

// @desc    Log in with the emailed OTP instead of a password
// @route   POST /api/auth/login-otp/verify
// @access  Public
const loginWithOtp = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    res.status(400);
    throw new Error("Email and the login code are required");
  }

  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

  const user = await User.findOne({
    email: email.toLowerCase(),
    loginCode: hashedCode,
    loginCodeExpires: { $gt: Date.now() },
  }).select("+loginCode +loginCodeExpires");

  if (!user) {
    res.status(400);
    throw new Error("That login code is invalid or has expired");
  }

  if (user.isBanned) {
    res.status(403);
    throw new Error("This account has been banned. Contact support for more information.");
  }

  // A code is good for exactly one login.
  user.loginCode = undefined;
  user.loginCodeExpires = undefined;
  await user.save();

  res.json(sessionPayload(user));
});

// @desc    Email a 6-digit OTP to reset a password
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
      subject: "Your AniSave OTP for password reset",
      html: `
        <p>Hi ${user.name},</p>
        <p>Someone requested a password reset for your AniSave account. Enter this OTP in the app to continue. It expires in 15 minutes.</p>
        <h2 style="letter-spacing: 6px;">${code}</h2>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });
  }

  res.json({ message: "If that email is registered, an OTP has been sent." });
});

// @desc    Reset password using the emailed OTP
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, password } = req.body;
  if (!email || !code || !password) {
    res.status(400);
    throw new Error("Email, OTP and new password are required");
  }

  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

  const user = await User.findOne({
    email: email.toLowerCase(),
    resetPasswordCode: hashedCode,
    resetPasswordExpires: { $gt: Date.now() },
  }).select("+resetPasswordCode +resetPasswordExpires");

  if (!user) {
    res.status(400);
    throw new Error("That OTP is invalid or has expired");
  }

  user.password = password;
  user.resetPasswordCode = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: "Password has been reset. You can now log in." });
});

// @desc    Update the logged-in user's profile info
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, farmName, farmDescription, provinceCode, cityCode } = req.body;

  // The address is only ever changed by picking one from the lists (free-typed
  // text is ignored). Sending neither code leaves it alone; sending only one is
  // refused, so a half-changed address can't be saved.
  const changingAddress = [provinceCode, cityCode].some(Boolean);
  const resolved = changingAddress ? resolveAddress({ provinceCode, cityCode }) : null;

  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  if (resolved) {
    req.user.address = resolved.address;
    req.user.location = resolved.label;
  }
  if (req.user.role === "farmer") {
    if (farmName !== undefined) req.user.farmName = farmName;
    if (farmDescription !== undefined) req.user.farmDescription = farmDescription;
  }

  await req.user.save();

  // A farmer's listings are picked up at their registered address, so they
  // follow it when it changes rather than keeping the old one until each is edited.
  if (resolved && req.user.role === "farmer") {
    await Product.updateMany({ farmer: req.user._id }, { $set: { location: resolved.label } });
  }

  res.json({
    _id: req.user._id,
    name: req.user.name,
    username: req.user.username,
    email: req.user.email,
    role: req.user.role,
    location: req.user.location,
    address: req.user.get("address"),
    phone: req.user.phone,
    avatar: req.user.avatar,
    farmName: req.user.farmName,
    farmDescription: req.user.farmDescription,
    isVerified: req.user.isVerified,
  });
});

// @desc    Replace the logged-in user's profile photo
// @route   PUT /api/auth/avatar
// @access  Private
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("Choose a photo to upload");
  }

  const previous = req.user.avatar;
  req.user.avatar = imagePath(req.file);
  await req.user.save();

  // The old photo only comes off disk once the new one is safely stored.
  if (previous) deleteImageFile(previous);

  res.json(req.user);
});

// @desc    Change the logged-in user's password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error("Current password and new password are required");
  }

  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.matchPassword(currentPassword))) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: "Password changed successfully." });
});

// @desc    Email a 6-digit OTP to confirm account deletion
// @route   POST /api/auth/delete-account/request-otp
// @access  Private
const requestAccountDeletion = asyncHandler(async (req, res) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  req.user.deleteAccountCode = crypto.createHash("sha256").update(code).digest("hex");
  req.user.deleteAccountExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  await req.user.save();

  await sendEmail({
    to: req.user.email,
    subject: "Confirm deleting your AniSave account",
    html: `
      <p>Hi ${req.user.name},</p>
      <p>Enter this OTP in the app to permanently delete your AniSave account. This cannot be undone. It expires in 15 minutes.</p>
      <h2 style="letter-spacing: 6px;">${code}</h2>
      <p>If you didn't request this, you can safely ignore this email - your account will not be deleted.</p>
    `,
  });

  res.json({ message: "An OTP has been sent to your email." });
});

// @desc    Confirm and permanently delete the logged-in user's account
// @route   POST /api/auth/delete-account/confirm
// @access  Private
const confirmAccountDeletion = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code) {
    res.status(400);
    throw new Error("OTP is required");
  }

  const user = await User.findById(req.user._id).select("+deleteAccountCode +deleteAccountExpires");
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

  if (
    !user.deleteAccountCode ||
    user.deleteAccountCode !== hashedCode ||
    !user.deleteAccountExpires ||
    user.deleteAccountExpires < Date.now()
  ) {
    res.status(400);
    throw new Error("That OTP is invalid or has expired");
  }

  // Cascade delete - remove everything that references this account so
  // nothing is left orphaned behind, files included.
  const products = await Product.find({ farmer: user._id });
  products.forEach((product) =>
    new Set([...product.images, product.image].filter(Boolean)).forEach(deleteImageFile)
  );
  await Product.deleteMany({ farmer: user._id });
  await Order.deleteMany({ $or: [{ farmer: user._id }, { buyer: user._id }] });
  await Rating.deleteMany({ $or: [{ farmer: user._id }, { buyer: user._id }] });
  if (user.avatar) deleteImageFile(user.avatar);
  await user.deleteOne();

  res.json({ message: "Your account has been permanently deleted." });
});

// @desc    Submit (or resubmit) the documents an admin reviews before a farmer
//          can sell - a government ID, plus at least one farm-related document
// @route   POST /api/auth/verification
// @access  Private (farmer)
const submitVerification = asyncHandler(async (req, res) => {
  const newGovernmentId = req.files?.governmentId?.[0];
  const newFarmDocuments = req.files?.farmDocuments || [];

  const governmentId = newGovernmentId ? imagePath(newGovernmentId) : req.user.governmentId;
  const farmDocuments = newFarmDocuments.length
    ? newFarmDocuments.map(imagePath)
    : req.user.farmDocuments;

  const discard = () => {
    if (newGovernmentId) deleteImageFile(imagePath(newGovernmentId));
    newFarmDocuments.forEach((file) => deleteImageFile(imagePath(file)));
  };

  if (!governmentId) {
    discard();
    res.status(400);
    throw new Error("A photo of a valid government-issued ID is required");
  }
  if (farmDocuments.length === 0) {
    discard();
    res.status(400);
    throw new Error("At least one farm-related document is required");
  }

  // Anything being replaced only leaves the disk once the new set is saved.
  const replaced = [];
  if (newGovernmentId && req.user.governmentId) replaced.push(req.user.governmentId);
  if (newFarmDocuments.length) replaced.push(...req.user.farmDocuments);

  req.user.governmentId = governmentId;
  req.user.farmDocuments = farmDocuments;
  req.user.verificationStatus = "pending";
  req.user.verificationNote = undefined;
  req.user.verificationSubmittedAt = Date.now();
  req.user.isVerified = false;
  await req.user.save();

  replaced.forEach(deleteImageFile);

  res.json(req.user);
});

module.exports = {
  registerUser,
  loginUser,
  requestLoginOtp,
  loginWithOtp,
  submitVerification,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
  uploadAvatar,
  changePassword,
  requestAccountDeletion,
  confirmAccountDeletion,
};
