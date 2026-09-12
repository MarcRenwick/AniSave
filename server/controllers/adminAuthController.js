const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const AdminOtp = require("../models/AdminOtp");
const generateToken = require("../utils/generateToken");
const sendEmail = require("../utils/sendEmail");

const isAuthorizedAdminEmail = (email) =>
  Boolean(email) &&
  Boolean(process.env.EMAIL_USER) &&
  email.toLowerCase() === process.env.EMAIL_USER.toLowerCase();

// @desc    Request an OTP to register a new admin account
// @route   POST /api/admin-auth/request-otp
// @access  Public
const requestAdminOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  if (!isAuthorizedAdminEmail(email)) {
    res.status(403);
    throw new Error("This email is not authorized to register an admin account");
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

  await AdminOtp.findOneAndUpdate(
    { email: email.toLowerCase() },
    { code: hashedCode, expiresAt: Date.now() + 15 * 60 * 1000 },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await sendEmail({
    to: email,
    subject: "Your AniSave admin registration OTP",
    html: `
      <p>Enter this OTP in the app to finish creating an admin account. It expires in 15 minutes.</p>
      <h2 style="letter-spacing: 6px;">${code}</h2>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  res.json({ message: "An OTP has been sent to your email." });
});

// @desc    Verify the OTP and create the admin account
// @route   POST /api/admin-auth/register
// @access  Public
const registerAdmin = asyncHandler(async (req, res) => {
  const { email, code, username, password, name } = req.body;

  if (!email || !code || !username || !password || !name) {
    res.status(400);
    throw new Error("Email, OTP, username, password and name are required");
  }

  if (!isAuthorizedAdminEmail(email)) {
    res.status(403);
    throw new Error("This email is not authorized to register an admin account");
  }

  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
  const otp = await AdminOtp.findOne({
    email: email.toLowerCase(),
    code: hashedCode,
    expiresAt: { $gt: Date.now() },
  });

  if (!otp) {
    res.status(400);
    throw new Error("That OTP is invalid or has expired");
  }

  const usernameTaken = await User.findOne({ username: username.toLowerCase() });
  if (usernameTaken) {
    res.status(400);
    throw new Error("Username is already taken");
  }

  const emailTaken = await User.findOne({ email: email.toLowerCase() });
  if (emailTaken) {
    res.status(400);
    throw new Error("An account with this email already exists");
  }

  const admin = await User.create({ name, username, email, password, role: "admin" });
  await otp.deleteOne();

  res.status(201).json({
    _id: admin._id,
    name: admin.name,
    username: admin.username,
    email: admin.email,
    role: admin.role,
    token: generateToken(admin._id, admin.role),
  });
});

module.exports = { requestAdminOtp, registerAdmin };
