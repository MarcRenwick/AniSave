const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Rating = require("../models/Rating");
const Report = require("../models/Report");
const ReviewReport = require("../models/ReviewReport");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const generateToken = require("../utils/generateToken");
const { disconnectUser } = require("../utils/realtime");
const { restrictionMessage } = require("../utils/restriction");
const sendEmail = require("../utils/sendEmail");
const { imagePath, documentPath, deleteImageFile } = require("../utils/fileUtils");
const { effectiveVerificationStatus } = require("../utils/verification");
const { resolveAddress } = require("../utils/locations");
const { TERMS_VERSION } = require("../utils/privacy");
const validate = require("../utils/validate");
const otp = require("../utils/otp");
const emailOtp = require("../utils/emailOtp");
const { adminChanged, shopChanged } = require("../utils/liveUpdates");

const { escapeHtml, trySend, EMAIL_FAILED_MESSAGE } = sendEmail;
const { generateMfaToken } = generateToken;
const { LOGIN_CODE, RESET_CODE, DELETE_CODE, VERIFY_EMAIL_CODE, selectCode } = otp;
const { PASSWORD_CHANGE, LOGIN: TWO_STEP } = emailOtp;

// Five wrong passwords in a row lock the account for a quarter of an hour.
const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60 * 1000;

const LOGIN_CODE_MS = 10 * 60 * 1000;
const OTP_MINUTES = emailOtp.OTP_LIFETIME_MS / 60000;
const RESET_CODE_MS = 15 * 60 * 1000;
const DELETE_CODE_MS = 15 * 60 * 1000;
const VERIFY_EMAIL_MS = 15 * 60 * 1000;

// Checked against when a username doesn't exist, so an unknown username costs
// the same time as a wrong password and the response time can't be used to
// find out which usernames are registered.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

// Email sends are not waited for: the response then takes the same time whether
// or not an account exists, and a slow or failing mail server can't hang a
// request. A failure is logged - without the message, which holds the code -
// and `onFailure` takes back the code that never went out.
const sendInBackground = (message, { onFailure } = {}) =>
  sendEmail(message).catch((err) => {
    console.error(`Could not send an email (${message.subject}): ${err.message}`);
    return onFailure?.().catch(() => {});
  });

// Takes back a code whose email never went out. Without this, asking again
// within the resend cooldown was answered "a code has been sent" while nothing
// was - the unsent code was what the cooldown was counting from. Only removes
// the code it was given: if a newer one has been issued since, that one stays.
const forgetCode = (user, fields) => {
  const issued = user[fields.code];
  return () =>
    User.updateOne(
      { _id: user._id, [fields.code]: issued },
      { $unset: { [fields.code]: "", [fields.expires]: "" }, $set: { [fields.attempts]: 0 } }
    );
};

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

// A new account's email is verified before it gets a session: sign-up emails a
// code, and entering it (POST /verify-email) signs them in. Until then the
// password alone only leads back to the code.
const isUnverified = (user) => user.emailVerified === false;

// Emails a verification code (unless one went out a moment ago) and says
// whether it went. Waited for, like the two-step code: whoever asks has just
// signed up or proved the password, so a failure can be admitted - and the
// code is taken back, so "Send a new code" works straight away.
const sendVerificationCode = async (user) => {
  if (otp.sentRecently(user, VERIFY_EMAIL_CODE, VERIFY_EMAIL_MS)) return true;
  const code = otp.issueCode(user, VERIFY_EMAIL_CODE, VERIFY_EMAIL_MS);
  await user.save();
  return trySend(
    {
      to: user.email,
      subject: "Verify your AniSave email",
      html: codeEmail(user, {
        intro: "Welcome to AniSave! Enter this code to verify your email address and start using your account.",
        code,
        minutes: 15,
        outro: "If you didn't sign up for AniSave, you can safely ignore this email - the account stays unusable without this code.",
      }),
    },
    { onFailure: forgetCode(user, VERIFY_EMAIL_CODE) }
  );
};

// In place of a session, for an account still waiting on its email.
const verificationReply = (user, sent) => ({
  verificationRequired: true,
  username: user.username,
  email: maskEmail(user.email),
  emailSent: sent,
  message: sent ? `We emailed a 6-digit code to ${maskEmail(user.email)}.` : EMAIL_FAILED_MESSAGE,
});

// An account nobody finished verifying doesn't hold on to its username or
// email: whoever signs up with them next - most often the same person, after a
// typo or a lost email - replaces it. It never had a session, so nothing can
// have been done with it; only the documents it uploaded go with it.
const discardUnverified = async (user) => {
  const { deletedCount } = await User.deleteOne({ _id: user._id, emailVerified: false });
  if (!deletedCount) return;
  if (user.governmentId) deleteImageFile(user.governmentId);
  (user.farmDocuments || []).forEach(deleteImageFile);
  if (user.avatar) deleteImageFile(user.avatar);
};

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

  let user;
  try {
    // The form asks for the two halves separately so each can be checked on
    // its own; everything downstream - orders, ratings, the admin lists -
    // reads one `name`, so they are joined back together here.
    const firstName = validate.personName(body.firstName, "First name");
    const lastName = validate.personName(body.lastName, "Last name");
    const name = `${firstName} ${lastName}`;
    const username = validate.username(body.username);
    const email = validate.email(body.email);
    const password = validate.newPassword(body.password);
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

    const [usernameTaken, emailTaken] = await Promise.all([
      User.findByUsernameIgnoringCase(username),
      User.findOne({ email }),
    ]);
    if (usernameTaken && !isUnverified(usernameTaken)) {
      res.status(400);
      throw new Error("Username is already exist");
    }
    if (emailTaken && !isUnverified(emailTaken)) {
      res.status(400);
      throw new Error("Email is already registered");
    }
    if (usernameTaken) await discardUnverified(usernameTaken);
    if (emailTaken && !emailTaken._id.equals(usernameTaken?._id)) await discardUnverified(emailTaken);

    const now = new Date();
    user = await User.create({
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
      emailVerified: false,
    });

    // Buyers don't have documents, so nothing they sent is worth keeping.
    if (!isFarmer) discardUploads();
  } catch (err) {
    discardUploads();
    throw err;
  }

  // No session yet: the code emailed now is what signs them in.
  const sent = await sendVerificationCode(user);
  res.status(201).json(verificationReply(user, sent));
});

// Codes for someone already known to be who they say - signed in, or past the
// password - are kept in utils/emailOtp.js: five minutes each, five guesses,
// a new one a minute after the last. These are the emails they go out in.
const TWO_STEP_EMAIL = {
  subject: "Your AniSave sign-in code",
  intro: "Use this code to finish signing in to AniSave.",
  outro: "If this wasn't you, someone knows your password - change it right away.",
};
const PASSWORD_CHANGE_EMAIL = {
  subject: "Confirm your new AniSave password",
  intro: "Enter this code in AniSave to confirm changing your password. Your password stays as it is until you do.",
  outro:
    "If you didn't ask to change your password, don't share this code with anyone - and as whoever asked knew your current password, change it yourself as soon as you can.",
};

// Emails the code from a request just started or renewed, and says whether it
// went. These are waited for, unlike the codes asked for by email address
// alone: those can't admit a failure without revealing the address is
// registered, but this person has already proved their password, so there is
// nothing left to reveal - and being told "we emailed you a code" when nothing
// was sent would leave them waiting for an email that was never coming. (Every
// administrator signs in with two steps, so for them it is also the difference
// between getting in and not.) If it didn't go, the resend cooldown is taken
// back so asking again works straight away. Why it failed is only logged.
const emailCode = (user, issued, { subject, intro, outro }) =>
  trySend(
    { to: user.email, subject, html: codeEmail(user, { intro, code: issued.code, minutes: OTP_MINUTES, outro }) },
    { onFailure: emailOtp.forgetSend(issued.request) }
  );

// Emails a two-step code to someone who has just proved their password, and
// says whether it went - unless one went out less than a minute ago, which
// stands. Either way the request is returned, for the page's countdown.
const sendTwoStepCode = async (user) => {
  const live = await emailOtp.liveRequest(user._id, TWO_STEP);
  if (live && emailOtp.resendWait(live) > 0) return { sent: true, request: live };
  const issued = await emailOtp.startRequest(user._id, TWO_STEP);
  return { sent: await emailCode(user, issued, TWO_STEP_EMAIL), request: issued.request };
};

// "Send a new code" for a request that is still going: once a minute has
// passed since the last code, a new one replaces it. Answers the request.
// `startOver` is what the person is told to do when it has expired.
async function resendCode(res, user, purpose, email, startOver) {
  const live = await emailOtp.liveRequest(user._id, purpose);
  if (!live) {
    return res.status(400).json({ message: `That code has expired. ${startOver}`, restart: true, reason: "expired" });
  }
  const wait = emailOtp.resendWait(live);
  const issued = wait > 0 ? null : await emailOtp.renewCode(live);
  if (!issued) {
    // Asked again too soon - or another tab asked a moment before this one.
    const retryIn = wait || emailOtp.resendWait(await emailOtp.liveRequest(user._id, purpose)) || 1;
    return res
      .status(429)
      .json({ message: `A code was just sent. You can ask for another in ${retryIn} seconds.`, retryIn });
  }
  if (!(await emailCode(user, issued, email))) {
    return res.status(503).json({ message: EMAIL_FAILED_MESSAGE });
  }
  res.json({ message: `We emailed a new code to ${maskEmail(user.email)}.`, ...emailOtp.timing(issued.request) });
}

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

  // Exactly as it was registered, capitals included.
  const user = await User.findOne({ username: body.username.trim() }).select(
    `+password +failedLoginAttempts +lockUntil ${selectCode(VERIFY_EMAIL_CODE)}`
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

  // Signed up but never entered the emailed code: the password leads back to
  // that step, with a fresh code, instead of to a session.
  if (isUnverified(user)) {
    return res.json(verificationReply(user, await sendVerificationCode(user)));
  }

  if (needsTwoStep(user)) {
    // Sent directly rather than thrown: the error handler replaces every 5xx
    // message with a generic apology, and this one is worth reading.
    const { sent, request } = await sendTwoStepCode(user);
    if (!sent) {
      return res.status(503).json({ message: EMAIL_FAILED_MESSAGE });
    }
    return res.json({
      mfaRequired: true,
      mfaToken: generateMfaToken(user._id),
      email: maskEmail(user.email),
      message: `We emailed a 6-digit code to ${maskEmail(user.email)}.`,
      ...emailOtp.timing(request),
    });
  }

  res.json(sessionPayload(user));
});

// Reads the two-step token from a request and loads the user it names.
const userForMfaToken = async (res, mfaToken) => {
  let decoded;
  try {
    decoded = jwt.verify(String(mfaToken), process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    decoded = null;
  }
  const user = decoded?.purpose === "mfa" ? await User.findById(decoded.id) : null;
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

  // A code is good for exactly one sign-in: the right one uses the request up,
  // and the fifth wrong one ends it - back to the password.
  const outcome = await emailOtp.checkCode(user._id, TWO_STEP, code);
  if (outcome.result !== "ok") return emailOtp.sendCodeFailure(res, outcome, "Please log in again.");

  if (user.isBanned) {
    res.status(403);
    throw new Error(restrictionMessage(user));
  }

  res.json(sessionPayload(user));
});

// @desc    Email a new two-step code (if the last one is more than a minute old)
// @route   POST /api/auth/login/mfa/resend
// @access  Public (needs the token from the password step)
const resendLoginMfa = asyncHandler(async (req, res) => {
  const body = validate.plainBody(req.body);
  const user = await userForMfaToken(res, body.mfaToken);
  await resendCode(res, user, TWO_STEP, TWO_STEP_EMAIL, "Please log in again.");
});

// The unverified account a verification request names, with its code fields.
const unverifiedByUsername = (username) =>
  typeof username === "string" && username.trim() && username.length <= 254
    ? User.findOne({ username: username.trim(), emailVerified: false }).select(selectCode(VERIFY_EMAIL_CODE))
    : null;

// @desc    Verify a new account's email with the code sent to it, and sign in
// @route   POST /api/auth/verify-email   { username, code }
// @access  Public
const verifyEmail = asyncHandler(async (req, res) => {
  const body = validate.plainBody(req.body);
  const code = validate.codeInput(body.code);
  const user = await unverifiedByUsername(body.username);

  if (!user || !(await otp.checkCode(user, VERIFY_EMAIL_CODE, code))) {
    res.status(400);
    throw new Error("That code is invalid or has expired");
  }

  if (user.isBanned) {
    res.status(403);
    throw new Error(restrictionMessage(user));
  }

  user.emailVerified = true;
  otp.clearCode(user, VERIFY_EMAIL_CODE);
  await user.save();
  // A real account now - and, for a farmer, documents waiting on an admin.
  adminChanged("users");

  res.json(sessionPayload(user));
});

// @desc    Email a new verification code (if the last one is more than a minute old)
// @route   POST /api/auth/verify-email/resend   { username }
// @access  Public
const resendVerification = asyncHandler(async (req, res) => {
  const user = await unverifiedByUsername(validate.plainBody(req.body).username);

  if (user && otp.sentRecently(user, VERIFY_EMAIL_CODE, VERIFY_EMAIL_MS)) {
    res.status(429);
    throw new Error("A code was just sent. Please wait a minute before asking for another.");
  }
  if (user && !(await sendVerificationCode(user))) {
    return res.status(503).json({ message: EMAIL_FAILED_MESSAGE });
  }
  res.json({ message: "We emailed you a new code." });
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

    sendInBackground(
      {
        to: user.email,
        subject: "Your AniSave login code",
        html: codeEmail(user, {
          intro: "Use this code to log in to AniSave.",
          code,
          minutes: 10,
          outro: "If you didn't try to log in, you can safely ignore this email - nobody can get in without this code.",
        }),
      },
      { onFailure: forgetCode(user, LOGIN_CODE) }
    );
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

  // A code is good for exactly one login. It came to the account's inbox, so
  // it verifies the email too if that step was never finished.
  otp.clearCode(user, LOGIN_CODE);
  const verifiedNow = isUnverified(user);
  if (verifiedNow) user.emailVerified = true;
  await user.save();
  if (verifiedNow) adminChanged("users");

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

    sendInBackground(
      {
        to: user.email,
        subject: "Your AniSave OTP for password reset",
        html: codeEmail(user, {
          intro: "Someone requested a password reset for your AniSave account. Enter this OTP in the app to continue.",
          code,
          minutes: 15,
          outro: "If you didn't request this, you can safely ignore this email.",
        }),
      },
      { onFailure: forgetCode(user, RESET_CODE) }
    );
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
  const password = validate.newPassword(body.password, "New password");

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
  // The code came to the account's inbox, which verifies it as well.
  const verifiedNow = isUnverified(user);
  if (verifiedNow) user.emailVerified = true;
  await user.save();
  disconnectUser(user._id);
  // A sign-in or password change half-done with the old password ends here too.
  await emailOtp.cancelAll(user._id);
  if (verifiedNow) adminChanged("users");

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

// Changing a password takes two steps (Privacy and Protection (MFA) in the
// settings): the current and new passwords are checked and a code is emailed;
// only once the code is entered does the new password become the account's.

// "13 Oct 2026, 9:41 pm" in the Philippines, where AniSave is used.
const whenInManila = (date) =>
  `${date.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })} (Philippine time)`;

const passwordChangedEmail = (user) => `
  <p>Hi ${escapeHtml(user.name)},</p>
  <p>The password for your AniSave account <strong>${escapeHtml(user.username)}</strong> was changed on ${whenInManila(new Date())}. Every other device that was signed in to your account has been signed out.</p>
  <p>If this was you, there is nothing else to do.</p>
  <p>If it wasn't, reset your password straight away with "Forgot password" on the AniSave login page, then turn on two-step sign-in under Privacy and Protection (MFA) in your settings.</p>
`;

// @desc    Step 1 of changing the password: check the current one, check the
//          new one, and email a code. Nothing about the account changes yet.
// @route   POST /api/auth/change-password/request-otp   { currentPassword, newPassword, confirmPassword }
// @access  Private
const requestPasswordChange = asyncHandler(async (req, res) => {
  const body = validate.plainBody(req.body);
  const currentPassword = validate.password(body.currentPassword, "Current password");
  const newPassword = validate.strongPassword(body.newPassword, "New password");
  if (body.confirmPassword !== newPassword) {
    res.status(400);
    throw new Error("New passwords do not match");
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.matchPassword(currentPassword))) {
    res.status(401);
    throw new Error("Current password is incorrect");
  }
  if (newPassword === currentPassword || (await bcrypt.compare(newPassword, user.password))) {
    res.status(400);
    throw new Error("Your new password must be different from your current password");
  }

  // One email a minute, however the form is sent.
  const wait = emailOtp.resendWait(await emailOtp.liveRequest(user._id, PASSWORD_CHANGE));
  if (wait > 0) {
    return res
      .status(429)
      .json({ message: `A code was just sent. You can ask for another in ${wait} seconds.`, retryIn: wait });
  }

  // The new password waits with the code, already hashed - it is never kept
  // as typed - and replaces any change asked for before it.
  const issued = await emailOtp.startRequest(user._id, PASSWORD_CHANGE, {
    newPasswordHash: await bcrypt.hash(newPassword, 10),
  });
  if (!(await emailCode(user, issued, PASSWORD_CHANGE_EMAIL))) {
    return res.status(503).json({ message: EMAIL_FAILED_MESSAGE });
  }

  res.json({
    message: `We emailed a 6-digit code to ${maskEmail(user.email)}.`,
    email: maskEmail(user.email),
    ...emailOtp.timing(issued.request),
  });
});

// @desc    Email a new code for the password change in progress (a minute
//          after the last one). The old code stops working.
// @route   POST /api/auth/change-password/resend-otp
// @access  Private
const resendPasswordChange = asyncHandler(async (req, res) => {
  await resendCode(res, req.user, PASSWORD_CHANGE, PASSWORD_CHANGE_EMAIL, "Please start again.");
});

// @desc    Step 2: the emailed code. Only now is the new password saved.
// @route   POST /api/auth/change-password/verify-otp   { code }
// @access  Private
const confirmPasswordChange = asyncHandler(async (req, res) => {
  const code = validate.codeInput(validate.plainBody(req.body).code);

  const outcome = await emailOtp.checkCode(req.user._id, PASSWORD_CHANGE, code);
  if (outcome.result !== "ok") return emailOtp.sendCodeFailure(res, outcome, "Please start again.");

  // The hash made in step 1 goes on as it is (save() would hash it again).
  // Every other session - including anyone who had got hold of the old
  // password - is signed out; this device gets a fresh token so it isn't.
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { password: outcome.request.newPasswordHash }, $inc: { tokenVersion: 1 } },
    { new: true }
  );
  // Before answering, so this device's live connection comes back with its
  // new token rather than being cut off along with the old ones.
  disconnectUser(user._id);
  // A two-step sign-in someone began with the old password can't finish now.
  await emailOtp.cancelAll(user._id);

  sendInBackground({ to: user.email, subject: "Your AniSave password was changed", html: passwordChangedEmail(user) });

  res.json({
    message: "Your password has been changed. Every other device has been signed out.",
    token: generateToken(user._id, user.role, user.tokenVersion),
  });
});

// @desc    Sign out for real: every token issued so far stops working, not just
//          the copy the browser is about to throw away
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  disconnectUser(req.user._id);
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

    // Signed in already, so a failure can be admitted - and is, rather than
    // sent through the error handler, which would swap it for a vague apology.
    const sent = await trySend(
      {
        to: user.email,
        subject: "Confirm deleting your AniSave account",
        html: codeEmail(user, {
          intro: "Enter this OTP in the app to permanently delete your AniSave account. This cannot be undone.",
          code,
          minutes: 15,
          outro: "If you didn't request this, you can safely ignore this email - your account will not be deleted.",
        }),
      },
      { onFailure: forgetCode(user, DELETE_CODE) }
    );
    if (!sent) return res.status(503).json({ message: EMAIL_FAILED_MESSAGE });
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
  // Their conversations go too, with every message in them: a conversation
  // can't carry on with only one person left in it.
  const conversationIds = await Conversation.distinct("_id", { $or: [{ buyer: user._id }, { farmer: user._id }] });
  (await Message.distinct("image", { conversation: { $in: conversationIds }, image: { $type: "string" } })).forEach(
    deleteImageFile
  );
  await Message.deleteMany({ conversation: { $in: conversationIds } });
  await Conversation.deleteMany({ _id: { $in: conversationIds } });
  await emailOtp.cancelAll(user._id);
  disconnectUser(user._id);
  if (user.avatar) deleteImageFile(user.avatar);
  // A farmer's ID and farm documents are the most sensitive thing kept about
  // anyone - they go too, not just the account they were attached to.
  if (user.governmentId) deleteImageFile(user.governmentId);
  (user.farmDocuments || []).forEach(deleteImageFile);
  await user.deleteOne();
  adminChanged("users");
  if (user.role === "farmer") shopChanged(user._id);

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
  // Waiting on an admin again - and, until they decide, not selling.
  adminChanged("users");
  shopChanged(req.user._id);

  res.json(req.user);
});

// @desc    Download a copy of everything AniSave holds about the logged-in user
//          (the right of access). Secrets - password hash, codes, tokens - are
//          never part of it, and neither is anyone else's personal data.
// @route   GET /api/auth/me/export
// @access  Private
const exportMyData = asyncHandler(async (req, res) => {
  const me = req.user;
  const [orders, ratings, reports, reviewReports, products, blockedShops, conversations] = await Promise.all([
    Order.find({ $or: [{ buyer: me._id }, { farmer: me._id }] })
      .select("productTitle pricePerKilo quantity unit total status createdAt acceptedAt readyAt doneAt cancelledAt")
      .lean(),
    Rating.find({ buyer: me._id }).select("stars comment createdAt").lean(),
    // Only the reports this person sent - what others reported about them isn't theirs to export.
    Report.find({ reporter: me._id }).select("reason description status createdAt").lean(),
    ReviewReport.find({ reporter: me._id }).select("reason description status createdAt").lean(),
    me.role === "farmer"
      ? Product.find({ farmer: me._id }).select("title category productType price salePrice totalExpense initialQuantity stock location description createdAt").lean()
      : [],
    // Who a buyer has blocked is held about them, so it is theirs to take with
    // them - by name, since an account id means nothing outside this database.
    me.role === "buyer"
      ? User.find({ _id: { $in: me.blockedUsers || [] } }).select("name farmName").lean()
      : [],
    ["buyer", "farmer"].includes(me.role)
      ? Conversation.find({ [me.role]: me._id, lastMessageAt: { $ne: null } }).populate("buyer farmer", "name farmName").lean()
      : [],
  ]);
  // Their chats, both sides of each - they are part of every conversation they are in.
  const chatMessages = await Message.find({ conversation: { $in: conversations.map((c) => c._id) } })
    .sort({ createdAt: 1 })
    .lean();

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
    messages: conversations.map((conversation) => {
      const other = me.role === "buyer" ? conversation.farmer : conversation.buyer;
      return {
        with: other?.farmName || other?.name || "Deleted account",
        messages: chatMessages
          .filter((m) => m.conversation.equals(conversation._id))
          .map((m) => ({
            from: m.sender.equals(me._id) ? "me" : "them",
            text: m.text,
            ...(m.image ? { photo: true } : {}),
            ...(m.orderUpdate ? { orderUpdate: { product: m.orderUpdate.productTitle, status: m.orderUpdate.status } } : {}),
            ...(m.deletedAt ? { deleted: true } : {}),
            sentAt: m.createdAt,
          })),
      };
    }),
  };

  res.set("Content-Disposition", 'attachment; filename="anisave-my-data.json"');
  res.json(data);
});

module.exports = {
  registerUser,
  loginUser,
  verifyLoginMfa,
  resendLoginMfa,
  verifyEmail,
  resendVerification,
  requestLoginOtp,
  loginWithOtp,
  submitVerification,
  getMe,
  forgotPassword,
  resetPassword,
  updateProfile,
  uploadAvatar,
  requestPasswordChange,
  resendPasswordChange,
  confirmPasswordChange,
  logoutUser,
  setMfa,
  requestAccountDeletion,
  confirmAccountDeletion,
  exportMyData,
};
