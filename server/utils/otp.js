// One-time codes (verifying a new account's email, login, two-step sign-in,
// password reset, account deletion).
//
//  - Generated with crypto.randomInt: Math.random() is a predictable generator.
//  - Stored as an HMAC keyed with the server secret, so a leaked database
//    doesn't let anyone work backwards from a hash to a 6-digit code.
//  - Wrong guesses are counted, and a code stops working after a few of them -
//    six digits is only a million possibilities, so unlimited guesses would
//    find it well inside its lifetime.
const crypto = require("crypto");

const MAX_ATTEMPTS = 5;
// Asking again within this long of the last code being sent doesn't send another.
const RESEND_COOLDOWN_MS = 60 * 1000;

const generateCode = () => String(crypto.randomInt(100000, 1000000));

const hashCode = (code) =>
  crypto.createHmac("sha256", process.env.JWT_SECRET).update(String(code)).digest("hex");

function codeMatches(submitted, storedHash) {
  const a = Buffer.from(hashCode(submitted), "hex");
  const b = Buffer.from(String(storedHash), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Each kind of code keeps its hash, expiry and wrong-guess counter on the user:
// { code: "loginCode", expires: "loginCodeExpires", attempts: "loginCodeAttempts" }.
// Sets them on the (unsaved) user document and returns the code to email.
function issueCode(user, fields, lifetimeMs) {
  const plain = generateCode();
  user[fields.code] = hashCode(plain);
  user[fields.expires] = new Date(Date.now() + lifetimeMs);
  user[fields.attempts] = 0;
  return plain;
}

// True while a code sent a moment ago is still fresh enough that sending
// another would just be email spam. Needs the expiry field loaded.
function sentRecently(user, fields, lifetimeMs) {
  const expires = user[fields.expires];
  if (!expires) return false;
  return new Date(expires).getTime() - lifetimeMs + RESEND_COOLDOWN_MS > Date.now();
}

// Checks a submitted code against the one stored on the user. The user must
// have been loaded with the code, expiry and attempts fields selected. A wrong
// guess is counted (atomically), and the code is destroyed once it runs out.
async function checkCode(user, fields, submitted) {
  const expires = user[fields.expires];
  if (!user[fields.code] || !expires || new Date(expires).getTime() < Date.now()) return false;
  if ((user[fields.attempts] || 0) >= MAX_ATTEMPTS) return false;

  if (codeMatches(submitted, user[fields.code])) return true;

  const Model = user.constructor;
  const updated = await Model.findByIdAndUpdate(user._id, { $inc: { [fields.attempts]: 1 } }, { new: true }).select(
    `+${fields.attempts}`
  );
  if (updated && updated[fields.attempts] >= MAX_ATTEMPTS) {
    await Model.updateOne({ _id: user._id }, { $unset: { [fields.code]: "", [fields.expires]: "" } });
  }
  return false;
}

// Used once a code has done its job.
const clearCode = (user, fields) => {
  user[fields.code] = undefined;
  user[fields.expires] = undefined;
  user[fields.attempts] = 0;
};

const LOGIN_CODE = { code: "loginCode", expires: "loginCodeExpires", attempts: "loginCodeAttempts" };
const RESET_CODE = { code: "resetPasswordCode", expires: "resetPasswordExpires", attempts: "resetPasswordAttempts" };
const DELETE_CODE = { code: "deleteAccountCode", expires: "deleteAccountExpires", attempts: "deleteAccountAttempts" };
const MFA_CODE = { code: "mfaCode", expires: "mfaCodeExpires", attempts: "mfaCodeAttempts" };
const VERIFY_EMAIL_CODE = { code: "verifyEmailCode", expires: "verifyEmailExpires", attempts: "verifyEmailAttempts" };

// The "+field" selects that load a kind of code along with its user.
const selectCode = (fields) => `+${fields.code} +${fields.expires} +${fields.attempts}`;

module.exports = {
  MAX_ATTEMPTS,
  generateCode,
  hashCode,
  codeMatches,
  issueCode,
  sentRecently,
  checkCode,
  clearCode,
  selectCode,
  LOGIN_CODE,
  RESET_CODE,
  DELETE_CODE,
  MFA_CODE,
  VERIFY_EMAIL_CODE,
};
