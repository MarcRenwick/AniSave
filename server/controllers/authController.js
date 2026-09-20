const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Rating = require("../models/Rating");
const Report = require("../models/Report");
const ReviewReport = require("../models/ReviewReport");
const generateToken = require("../utils/generateToken");
const { restrictionMessage } = require("../utils/restriction");
const sendEmail = require("../utils/sendEmail");
const { imagePath, documentPath, deleteImageFile } = require("../utils/fileUtils");
const { effectiveVerificationStatus } = require("../utils/verification");
const { resolveAddress } = require("../utils/locations");
const { TERMS_VERSION } = require("../utils/privacy");
const validate = require("../utils/validate");
const otp = require("../utils/otp");

const { escapeHtml } = sendEmail;
const { generateMfaToken } = generateToken;
const { LOGIN_CODE, RESET_CODE, DELETE_CODE, MFA_CODE, selectCode } = otp;

// Five wrong passwords in a row lock the account for a quarter of an hour.
const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60 * 1000;

const LOGIN_CODE_MS = 10 * 60 * 1000;
const MFA_CODE_MS = 10 * 60 * 1000;
const RESET_CODE_MS = 15 * 60 * 1000;
const DELETE_CODE_MS = 15 * 60 * 1000;

// Checked against when a username doesn't exist, so an unknown username costs
// the same time as a wrong password and the response time can't be used to
// find out which usernames are registered.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

// Email sends are not waited for: the response then takes the same time whether
// or not an account exists, and a slow or failing mail server can't hang a
// request. A failure is logged - without the message, which holds the code.
const sendInBackground = (message) =>
  sendEmail(message).catch((err) => console.error(`Could not send an email (${message.subject}): ${err.message}`));

// Why someone is leaving, as the farmer's deletion form offers it. The labels
// people see live in the client (client/src/utils/accountDeletion.js).
const DELETION_REASONS = ["no_longer_use", "change_username", "no_longer_need", "found_another", "other"];

// A farmer fills in a form before the code is sent (a reason, "Others" in their
// own words, and agreeing to the deletion terms), so the server asks for the
// same things the form does. Nothing here is stored: the account and everything
// about it is about to be deleted. A buyer's dialog has no form and sends none
// of this.
function checkDeletionForm(req, res) {
  if (req.user.role !== "farmer") return;
  const body = validate.plainBody(req.body);

  if (typeof body.reason !== "string" || !DELETION_REASONS.includes(body.reason)) {
    res.status(400);
    throw new Error("Choose a reason for deleting your account");
  }
  if (body.reason === "other" && (typeof body.description !== "string" || !body.description.trim())) {
    res.status(400);
    throw new Error("Please tell us why you're deleting your account");
  }
  validate.optionalText(body.description, "The reason", { max: 320 });
  if (!validate.isTrue(body.agreedToTerms)) {
    res.status(400);
    throw new Error("Please agree to the account deletion terms first");
  }
}

// "marc***@gmail.com" - enough to recognise which inbox, not enough to leak the address.
const maskEmail = (email) => {
  const [local, domain] = String(email).split("@");
  return `${local.slice(0, 1)}***@${domain}`;
};

const codeEmail = (user, { intro, code, minutes, outro }) => `
  <p>Hi ${escapeHtml(user.name)},</p>
  <p>${intro} It expires in ${minutes} minutes and can only be used once.</p>
  <h2 style="letter-spacing: 6px;">${code}</h2>
  <p>${outro}</p>
`;

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
  mfaEnabled: user.role === "admin" || Boolean(user.mfaEnabled),
  token: generateToken(user._id, user.role, user.tokenVersion),
});

// Admins always sign in with two steps; anyone else can switch it on.
const needsTwoStep = (user) => user.role === "admin" || Boolean(user.mfaEnabled);

// @desc    Register a new user (farmer or buyer). A farmer sends their
//          verification documents in this same request.
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const body = validate.plainBody(req.body);

  // The account and its documents are created together or not at all, so a
  // refused upload can't leave a farmer with nothing for an admin to review.
  // Uploads only stay on disk if the account is actually created.
  const governmentIdFile = req.files?.governmentId?.[0];
  const farmDocumentFiles = req.files?.farmDocuments || [];
  const discardUploads = () => {
    if (governmentIdFile) deleteImageFile(documentPath(governmentIdFile));
    farmDocumentFiles.forEach((file) => deleteImageFile(documentPath(file)));
  };

  try {
    const name = validate.fullName(body.name);
    const username = validate.username(body.username);
    const email = validate.email(body.email);
    const password = validate.password(body.password);
    const farmName = validate.optionalText(body.farmName, "Farm name", { max: 100, blockMarkup: true });
    const farmDescription = validate.optionalText(body.farmDescription, "Farm details", { max: 1000 });

    if (!["farmer", "buyer"].includes(body.role)) {
      res.status(400);
      throw new Error("Role must be either 'farmer' or 'buyer'");
    }
    const role = body.role;
    const isFarmer = role === "farmer";

    // Nobody gets an account without agreeing to how their data is handled -
    // enforced here, not only by the sign-up form.
    if (!validate.isTrue(body.acceptTerms)) {
      res.status(400);
      throw new Error("Please accept the Terms of Use and Privacy Policy to create an account");
    }
    if (isFarmer && !validate.isTrue(body.consentDocuments)) {
      res.status(400);
      throw new Error("Please consent to your ID and farm documents being kept and reviewed to verify you");
    }

    // Farmers and buyers both pick where they are; the coordinates that
    // "nearest" is worked out from come from that pick, never from the client.
    const { address, label } = resolveAddress({ provinceCode: body.provinceCode, cityCode: body.cityCode });

    if (isFarmer && !governmentIdFile) {
      res.status(400);
      throw new Error("A photo of a valid government-issued ID is required");
    }
    if (isFarmer && farmDocumentFiles.length === 0) {
      res.status(400);
      throw new Error("At least one farm-related document is required");
    }

    const usernameTaken = await User.findOne({ username });
    if (usernameTaken) {
      res.status(400);
      throw new Error("Username is already exist");
    }

    const emailTaken = await User.findOne({ email });
    if (emailTaken) {
      res.status(400);
      throw new Error("Email is already registered");
    }

    const now = new Date();
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
      governmentId: isFarmer ? documentPath(governmentIdFile) : undefined,
      farmDocuments: isFarmer ? farmDocumentFiles.map(documentPath) : undefined,
      verificationSubmittedAt: isFarmer ? now : undefined,
      consent: { termsVersion: TERMS_VERSION, acceptedAt: now, documentsConsentAt: isFarmer ? now : undefined },
    });

    // Buyers don't have documents, so nothing they sent is worth keeping.
    if (!isFarmer) discardUploads();

    res.status(201).json(sessionPayload(user));
  } catch (err) {
    discardUploads();
    throw err;
  }
});

// Emails a fresh two-step code to someone who has just proved their password
// (unless one went out a moment ago).
const sendTwoStepCode = async (user) => {
  if (otp.sentRecently(user, MFA_CODE, MFA_CODE_MS)) return;
  const code = otp.issueCode(user, MFA_CODE, MFA_CODE_MS);
  await user.save();
  sendInBackground({
    to: user.email,
    subject: "Your AniSave sign-in code",
    html: codeEmail(user, {
      intro: "Use this code to finish signing in to AniSave.",
      code,
      minutes: 10,
      outro: "If this wasn't you, someone knows your password - change it right away.",
    }),
  });
};

// @desc    Authenticate user & get token. Accounts with two-step sign-in (all
//          admins) get a code emailed and finish at /login/mfa instead.
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const body = validate.plainBody(req.body);
  if (typeof body.username !== "string" || typeof body.password !== "string" || !body.username || !body.password) {
    res.status(400);
    throw new Error("Username and password are required");
  }
  if (body.username.length > 254 || body.password.length > 128) {
    res.status(400);
    throw new Error("Invalid username or password");
  }

  const user = await User.findOne({ username: body.username.trim().toLowerCase() }).select(
    `+password +failedLoginAttempts +lockUntil ${selectCode(MFA_CODE)}`
  );

  // A locked account isn't tried at all - not even with the right password.
  if (user?.lockUntil && user.lockUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
    res.status(429);
    throw new Error(`Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`);
  }

  let passwordOk = false;
  if (user) passwordOk = await user.matchPassword(body.password);
  else await bcrypt.compare(body.password, DUMMY_HASH);

  if (!passwordOk) {
    if (user) {
      const updated = await User.findByIdAndUpdate(user._id, { $inc: { failedLoginAttempts: 1 } }, { new: true }).select(
        "+failedLoginAttempts"
      );
      if (updated.failedLoginAttempts >= MAX_FAILED_LOGINS) {
        await User.updateOne({ _id: user._id }, { $set: { lockUntil: new Date(Date.now() + LOCK_MS), failedLoginAttempts: 0 } });
      }
    }
    res.status(401);
    throw new Error("Invalid username or password");
  }

  if (user.failedLoginAttempts || user.lockUntil) {
    await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: 0 }, $unset: { lockUntil: "" } });
  }

  if (user.isBanned) {
    res.status(403);
    throw new Error(restrictionMessage(user));
  }

  if (needsTwoStep(user)) {
    await sendTwoStepCode(user);
    return res.json({
      mfaRequired: true,
      mfaToken: generateMfaToken(user._id),
      email: maskEmail(user.email),
      message: `We emailed a 6-digit code to ${maskEmail(user.email)}.`,
    });
  }

  res.json(sessionPayload(user));
});

// Reads the two-step token from a request and loads the user it names, with
// their two-step code fields.
const userForMfaToken = async (res, mfaToken) => {
  let decoded;
  try {
    decoded = jwt.verify(String(mfaToken), process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    decoded = null;
  }
  const user = decoded?.purpose === "mfa" ? await User.findById(decoded.id).select(selectCode(MFA_CODE)) : null;
  if (!user) {
    res.status(401);
    throw new Error("Your sign-in timed out. Please log in again.");
  }
  return user;
};

// @desc    Finish a two-step sign-in with the emailed code
// @route   POST /api/auth/login/mfa
// @access  Public (needs the token from the password step)
const verifyLoginMfa = asyncHandler(async (req, res) => {
  const body = validate.plainBody(req.body);
  const code = validate.codeInput(body.code);
  const user = await userForMfaToken(res, body.mfaToken);

  if (!(await otp.checkCode(user, MFA_CODE, code))) {
    res.status(400);
    throw new Error("That code is invalid or has expired");
  }

  if (user.isBanned) {
    res.status(403);
    throw new Error(restrictionMessage(user));
  }

  // A code is good for exactly one sign-in.
  otp.clearCode(user, MFA_CODE);
  await user.save();

  res.json(sessionPayload(user));
});

// @desc    Email a new two-step code (if the last one is more than a minute old)
// @route   POST /api/auth/login/mfa/resend
// @access  Public (needs the token from the password step)
const resendLoginMfa = asyncHandler(async (req, res) => {
  const body = validate.plainBody(req.body);
  const user = await userForMfaToken(res, body.mfaToken);

  if (otp.sentRecently(user, MFA_CODE, MFA_CODE_MS)) {
    res.status(429);
    throw new Error("A code was just sent. Please wait a minute before asking for another.");
  }

  await sendTwoStepCode(user);
  res.json({ message: `We emailed a new code to ${maskEmail(user.email)}.` });
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
  const email = validate.email(validate.plainBody(req.body).email);

  const user = await User.findOne({ email }).select(selectCode(LOGIN_CODE));

  // Always answers the same way, so this can't be used to find out which
  // emails are registered. A banned account gets no code, and neither does one
  // that signs in with two steps - a code alone would skip its password.
  const eligible = user && !user.isBanned && !needsTwoStep(user);
  if (eligible && !otp.sentRecently(user, LOGIN_CODE, LOGIN_CODE_MS)) {
    const code = otp.issueCode(user, LOGIN_CODE, LOGIN_CODE_MS);
    await user.save();

    sendInBackground({
      to: user.email,
      subject: "Your AniSave login code",
      html: codeEmail(user, {
        intro: "Use this code to log in to AniSave.",
        code,
        minutes: 10,
        outro: "If you didn't try to log in, you can safely ignore this email - nobody can get in without this code.",
      }),
    });
  }

  res.json({ message: "If that email is registered, a login code has been sent." });
});

// @desc    Log in with the emailed OTP instead of a password
// @route   POST /api/auth/login-otp/verify
// @access  Public
const loginWithOtp = asyncHandler(async (req, res) => {
  const body = validate.plainBody(req.body);
  const email = validate.email(body.email);
  const code = validate.codeInput(body.code);

  const user = await User.findOne({ email }).select(selectCode(LOGIN_CODE));

  const valid = user && !needsTwoStep(user) && (await otp.checkCode(user, LOGIN_CODE, code));
  if (!valid) {
    res.status(400);
    throw new Error("That login code is invalid or has expired");
  }

  if (user.isBanned) {
    res.status(403);
    throw new Error(restrictionMessage(user));
  }

  // A code is good for exactly one login.
  otp.clearCode(user, LOGIN_CODE);
  await user.save();

  res.json(sessionPayload(user));
});

// @desc    Email a 6-digit OTP to reset a password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res) => {
  const email = validate.email(validate.plainBody(req.body).email);

  const user = await User.findOne({ email }).select(selectCode(RESET_CODE));

  // Always respond the same way whether or not the email exists, so this
  // endpoint can't be used to check which emails are registered.
  if (user && !otp.sentRecently(user, RESET_CODE, RESET_CODE_MS)) {
    const code = otp.issueCode(user, RESET_CODE, RESET_CODE_MS);
    await user.save();

    sendInBackground({
      to: user.email,
      subject: "Your AniSave OTP for password reset",
      html: codeEmail(user, {
        intro: "Someone requested a password reset for your AniSave account. Enter this OTP in the app to continue.",
        code,
        minutes: 15,
        outro: "If you didn't request this, you can safely ignore this email.",
      }),
    });
  }

  res.json({ message: "If that email is registered, an OTP has been sent." });
});

// @desc    Reset password using the emailed OTP
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = asyncHandler(async (req, res) => {
  const body = validate.plainBody(req.body);
  const email = validate.email(body.email);
  const code = validate.codeInput(body.code);
  const password = validate.password(body.password, "New password");

  const user = await User.findOne({ email }).select(`${selectCode(RESET_CODE)} +failedLoginAttempts +lockUntil`);

  if (!user || !(await otp.checkCode(user, RESET_CODE, code))) {
    res.status(400);
    throw new Error("That OTP is invalid or has expired");
  }

  user.password = password;
  otp.clearCode(user, RESET_CODE);
  // Whoever was signed in with the old password - or a stolen copy of it - is
  // signed out. And having proved they own the inbox, the account is unlocked.
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  res.json({ message: "Password has been reset. You can now log in." });
});

// @desc    Update the logged-in user's profile info
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const body = validate.plainBody(req.body);
  const name = body.name === undefined ? undefined : validate.fullName(body.name);
  const phone = body.phone === undefined ? undefined : validate.phone(body.phone);
  const farmName = validate.optionalText(body.farmName, "Farm name", { max: 100, blockMarkup: true });
  const farmDescription = validate.optionalText(body.farmDescription, "Farm details", { max: 1000 });
  const { provinceCode, cityCode } = body;

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
  const body = validate.plainBody(req.body);
  const currentPassword = validate.password(body.currentPassword, "Current password");
  const newPassword = validate.password(body.newPassword, "New password");

  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.matchPassword(currentPassword))) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }

  user.password = newPassword;
  // Every other session - including anyone who had got hold of the old
  // password - is signed out; this device gets a fresh token so it isn't.
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  res.json({
    message: "Password changed successfully.",
    token: generateToken(user._id, user.role, user.tokenVersion),
  });
});

// @desc    Sign out for real: every token issued so far stops working, not just
//          the copy the browser is about to throw away
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  res.json({ message: "You have been logged out." });
});

// @desc    Turn two-step sign-in on or off (needs the password; admins can't turn it off)
// @route   PUT /api/auth/mfa
// @access  Private
const setMfa = asyncHandler(async (req, res) => {
  const body = validate.plainBody(req.body);
  if (typeof body.enabled !== "boolean") {
    res.status(400);
    throw new Error("Say whether two-step sign-in should be on or off");
  }
  const password = validate.password(body.password, "Password");

  if (req.user.role === "admin" && !body.enabled) {
    res.status(400);
    throw new Error("Two-step sign-in is always on for administrator accounts");
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Password is incorrect");
  }

  user.mfaEnabled = body.enabled;
  await user.save();

  res.json({ mfaEnabled: user.role === "admin" || user.mfaEnabled });
});

// @desc    Email a 6-digit OTP to confirm account deletion
// @route   POST /api/auth/delete-account/request-otp   (farmers: { reason, description?, agreedToTerms })
// @access  Private
const requestAccountDeletion = asyncHandler(async (req, res) => {
  checkDeletionForm(req, res);

  const user = await User.findById(req.user._id).select(selectCode(DELETE_CODE));

  if (!otp.sentRecently(user, DELETE_CODE, DELETE_CODE_MS)) {
    const code = otp.issueCode(user, DELETE_CODE, DELETE_CODE_MS);
    await user.save();

    await sendEmail({
      to: user.email,
      subject: "Confirm deleting your AniSave account",
      html: codeEmail(user, {
        intro: "Enter this OTP in the app to permanently delete your AniSave account. This cannot be undone.",
        code,
        minutes: 15,
        outro: "If you didn't request this, you can safely ignore this email - your account will not be deleted.",
      }),
    });
  }

  res.json({ message: "An OTP has been sent to your email." });
});

// @desc    Confirm and permanently delete the logged-in user's account
// @route   POST /api/auth/delete-account/confirm
// @access  Private
const confirmAccountDeletion = asyncHandler(async (req, res) => {
  const code = validate.codeInput(validate.plainBody(req.body).code);

  const user = await User.findById(req.user._id).select(selectCode(DELETE_CODE));

  if (!(await otp.checkCode(user, DELETE_CODE, code))) {
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
  // Reports about reviews go with the reviews they were about, and with
  // whoever sent them or wrote the review.
  const ratingIds = await Rating.distinct("_id", { $or: [{ farmer: user._id }, { buyer: user._id }] });
  await ReviewReport.deleteMany({
    $or: [{ reporter: user._id }, { reviewAuthor: user._id }, { rating: { $in: ratingIds } }],
  });
  await Rating.deleteMany({ $or: [{ farmer: user._id }, { buyer: user._id }] });
  // Reports they sent (and, for a farmer, reports about them) go too - with the
  // evidence photos attached to them.
  const reports = await Report.find({ $or: [{ reporter: user._id }, { farmer: user._id }] });
  reports.forEach((report) => report.evidence.forEach(deleteImageFile));
  await Report.deleteMany({ $or: [{ reporter: user._id }, { farmer: user._id }] });
  // A deleted farmer leaves nothing behind in anyone's block list either.
  await User.updateMany({ blockedUsers: user._id }, { $pull: { blockedUsers: user._id } });
  if (user.avatar) deleteImageFile(user.avatar);
  // A farmer's ID and farm documents are the most sensitive thing kept about
  // anyone - they go too, not just the account they were attached to.
  if (user.governmentId) deleteImageFile(user.governmentId);
  (user.farmDocuments || []).forEach(deleteImageFile);
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

  const governmentId = newGovernmentId ? documentPath(newGovernmentId) : req.user.governmentId;
  const farmDocuments = newFarmDocuments.length
    ? newFarmDocuments.map(documentPath)
    : req.user.farmDocuments;

  const discard = () => {
    if (newGovernmentId) deleteImageFile(documentPath(newGovernmentId));
    newFarmDocuments.forEach((file) => deleteImageFile(documentPath(file)));
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

// @desc    Download a copy of everything AniSave holds about the logged-in user
//          (the right of access). Secrets - password hash, codes, tokens - are
//          never part of it, and neither is anyone else's personal data.
// @route   GET /api/auth/me/export
// @access  Private
const exportMyData = asyncHandler(async (req, res) => {
  const me = req.user;
  const [orders, ratings, reports, reviewReports, products, blockedShops] = await Promise.all([
    Order.find({ $or: [{ buyer: me._id }, { farmer: me._id }] })
      .select("productTitle pricePerKilo quantity total status createdAt acceptedAt readyAt doneAt cancelledAt")
      .lean(),
    Rating.find({ buyer: me._id }).select("stars comment createdAt").lean(),
    // Only the reports this person sent - what others reported about them isn't theirs to export.
    Report.find({ reporter: me._id }).select("reason description status createdAt").lean(),
    ReviewReport.find({ reporter: me._id }).select("reason description status createdAt").lean(),
    me.role === "farmer"
      ? Product.find({ farmer: me._id }).select("title category productType price salePrice stock location description createdAt").lean()
      : [],
    // Who a buyer has blocked is held about them, so it is theirs to take with
    // them - by name, since an account id means nothing outside this database.
    me.role === "buyer"
      ? User.find({ _id: { $in: me.blockedUsers || [] } }).select("name farmName").lean()
      : [],
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    account: {
      name: me.name,
      username: me.username,
      email: me.email,
      role: me.role,
      phone: me.phone,
      location: me.location,
      address: me.get("address"),
      farmName: me.farmName,
      farmDescription: me.farmDescription,
      hasProfilePhoto: Boolean(me.avatar),
      verificationStatus: effectiveVerificationStatus(me),
      twoStepSignIn: me.role === "admin" || Boolean(me.mfaEnabled),
      createdAt: me.createdAt,
      consent: me.get("consent"),
    },
    verificationDocuments: {
      governmentId: Boolean(me.governmentId),
      farmDocuments: me.farmDocuments?.length || 0,
    },
    orders,
    ratingsIWrote: ratings,
    reportsIFiled: reports,
    reviewReportsIFiled: reviewReports,
    myProducts: products,
    shopsIBlocked: blockedShops.map((shop) => shop.farmName || shop.name),
  };

  res.set("Content-Disposition", 'attachment; filename="anisave-my-data.json"');
  res.json(data);
});

module.exports = {
  registerUser,
  loginUser,
  verifyLoginMfa,
  resendLoginMfa,
  requestLoginOtp,
  loginWithOtp,
  submitVerification,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
  uploadAvatar,
  changePassword,
  logoutUser,
  setMfa,
  requestAccountDeletion,
  confirmAccountDeletion,
  exportMyData,
};
