const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const AdminOtp = require("../models/AdminOtp");
const generateToken = require("../utils/generateToken");
const { trySend, EMAIL_FAILED_MESSAGE } = require("../utils/sendEmail");
const validate = require("../utils/validate");
const otp = require("../utils/otp");

const ADMIN_CODE_MS = 15 * 60 * 1000;
const ADMIN_CODE_FIELDS = { code: "code", expires: "expiresAt", attempts: "attempts" };

const isAuthorizedAdminEmail = (email) =>
  Boolean(email) &&
  Boolean(process.env.EMAIL_USER) &&
  email.toLowerCase() === process.env.EMAIL_USER.toLowerCase();

// @desc    Request an OTP to register a new admin account
// @route   POST /api/admin-auth/request-otp
// @access  Public
const requestAdminOtp = asyncHandler(async (req, res) => {
  const email = validate.email(validate.plainBody(req.body).email);

  if (!isAuthorizedAdminEmail(email)) {
    res.status(403);
    throw new Error("This email is not authorized to register an admin account");
  }

  // Asking again straight away doesn't send another code - nobody, the real
  // admin's inbox included, should be flooded by repeated requests.
  const existing = await AdminOtp.findOne({ email });
  if (existing && otp.sentRecently(existing, ADMIN_CODE_FIELDS, ADMIN_CODE_MS)) {
    return res.json({ message: "An OTP has been sent to your email." });
  }

  const code = otp.generateCode();
  const hashed = otp.hashCode(code);

  await AdminOtp.findOneAndUpdate(
    { email },
    { code: hashed, expiresAt: Date.now() + ADMIN_CODE_MS, attempts: 0 },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Waited for, and a failure admitted: the only address that gets this far
  // is the one already written into the server's settings, so there is nothing
  // to give away. A code that never went out is taken back, or asking again
  // within the minute would be told "sent" while nothing was.
  const sent = await trySend(
    {
      to: email,
      subject: "Your AniSave admin registration OTP",
      html: `
      <p>Enter this OTP in the app to finish creating an admin account. It expires in 15 minutes.</p>
      <h2 style="letter-spacing: 6px;">${code}</h2>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
    },
    { onFailure: () => AdminOtp.deleteOne({ email, code: hashed }) }
  );

  // Sent directly rather than thrown: the error handler turns every 5xx into
  // "Something went wrong on our side", which is all this page used to say.
  if (!sent) return res.status(503).json({ message: EMAIL_FAILED_MESSAGE });

  res.json({ message: "An OTP has been sent to your email." });
});

// @desc    Verify the OTP and create the admin account
// @route   POST /api/admin-auth/register
// @access  Public
const registerAdmin = asyncHandler(async (req, res) => {
  const body = validate.plainBody(req.body);
  const email = validate.email(body.email);
  const code = validate.codeInput(body.code);
  const username = validate.username(body.username);
  const password = validate.newPassword(body.password);
  const name = validate.fullName(body.name);

  if (!isAuthorizedAdminEmail(email)) {
    res.status(403);
    throw new Error("This email is not authorized to register an admin account");
  }

  // The code is looked up by email and then checked, so wrong guesses can be
  // counted - it is dead after a few, however fast someone tries.
  const otpRecord = await AdminOtp.findOne({ email });
  if (!otpRecord || !(await otp.checkCode(otpRecord, ADMIN_CODE_FIELDS, code))) {
    res.status(400);
    throw new Error("That OTP is invalid or has expired");
  }

  const usernameTaken = await User.findOne({ username });
  if (usernameTaken) {
    res.status(400);
    throw new Error("Username is already taken");
  }

  const emailTaken = await User.findOne({ email });
  if (emailTaken) {
    res.status(400);
    throw new Error("An account with this email already exists");
  }

  const admin = await User.create({ name, username, email, password, role: "admin", mfaEnabled: true });
  await otpRecord.deleteOne();

  res.status(201).json({
    _id: admin._id,
    name: admin.name,
    username: admin.username,
    email: admin.email,
    role: admin.role,
    token: generateToken(admin._id, admin.role, admin.tokenVersion),
  });
});

module.exports = { requestAdminOtp, registerAdmin };
