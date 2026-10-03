const bcrypt = require("bcryptjs");
const UserOtp = require("../models/UserOtp");
const { generateCode, MAX_ATTEMPTS, RESEND_COOLDOWN_MS } = require("./otp");

// Emailed codes kept in their own collection (models/UserOtp.js): confirming a
// password change, and the second step of signing in. Each request has one code
// at a time, which
//  - is six digits from crypto.randomInt, stored only as a bcrypt hash;
//  - lasts five minutes, after which MongoDB deletes it (a TTL index);
//  - can be sent again a minute after the last one, and the new code replaces it;
//  - allows five wrong guesses in all, after which the request is deleted and
//    the person has to start again.

const OTP_LIFETIME_MS = 5 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

const PASSWORD_CHANGE = "password-change";
const LOGIN = "login";

const secondsUntil = (time) => Math.max(0, Math.ceil((new Date(time).getTime() - Date.now()) / 1000));

// The request this person has going for this purpose, unless it has expired.
async function liveRequest(userId, purpose) {
  const request = await UserOtp.findOne({ user: userId, purpose });
  return request && request.expiresAt.getTime() > Date.now() ? request : null;
}

// How long until a new code may be sent, in seconds (0: now).
const resendWait = (request) =>
  request ? secondsUntil(request.sentAt.getTime() + RESEND_COOLDOWN_MS) : 0;

// What the page counts down: how long the code lasts, and when "Resend" works.
const timing = (request) => ({ expiresIn: secondsUntil(request.expiresAt), resendIn: resendWait(request) });

const hashCode = (code) => bcrypt.hash(code, BCRYPT_ROUNDS);

// Starts a new request - replacing any before it, whose code stops working -
// and returns the code to email. `extra` is kept on it (a password change's
// new password hash).
async function startRequest(userId, purpose, extra = {}) {
  const code = generateCode();
  const now = Date.now();
  const fields = {
    codeHash: await hashCode(code),
    expiresAt: new Date(now + OTP_LIFETIME_MS),
    sentAt: new Date(now),
    attempts: 0,
    ...extra,
  };
  const filter = { user: userId, purpose };
  let request;
  try {
    request = await UserOtp.findOneAndUpdate(filter, { $set: fields }, { upsert: true, new: true });
  } catch (err) {
    // Two at the same moment both tried to create it: replace the one that won.
    if (err.code !== 11000) throw err;
    request = await UserOtp.findOneAndUpdate(filter, { $set: fields }, { new: true });
  }
  return { code, request };
}

// A new code for a request that is still going ("Resend"): the old code stops
// working, the five minutes start again, and the wrong guesses so far still
// count. Null if the request changed in the meantime (used, replaced, resent).
async function renewCode(request) {
  const code = generateCode();
  const now = Date.now();
  const renewed = await UserOtp.findOneAndUpdate(
    { _id: request._id, sentAt: request.sentAt },
    { $set: { codeHash: await hashCode(code), expiresAt: new Date(now + OTP_LIFETIME_MS), sentAt: new Date(now) } },
    { new: true }
  );
  return renewed ? { code, request: renewed } : null;
}

// For when the email with a code never went out: the resend cooldown shouldn't
// count from a code nobody received, so asking again works straight away.
const forgetSend = (request) => () =>
  UserOtp.updateOne({ _id: request._id, sentAt: request.sentAt }, { $set: { sentAt: new Date(0) } });

// Checks a code. The answer is one of
//   { result: "ok", request }         - right; the request is used up (deleted)
//   { result: "wrong", attemptsLeft } - wrong, with guesses still left
//   { result: "locked" }              - that was the last guess; the request is deleted
//   { result: "expired" }             - there is no request going (expired, never made, already used)
//
// A guess is counted before the code is compared, in one atomic step, so even
// guesses sent all at once can't get past five.
async function checkCode(userId, purpose, submitted) {
  const reserved = await UserOtp.findOneAndUpdate(
    { user: userId, purpose, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { new: true }
  );
  if (!reserved) {
    const spent = await UserOtp.findOneAndDelete({ user: userId, purpose, attempts: { $gte: MAX_ATTEMPTS } });
    return { result: spent ? "locked" : "expired" };
  }

  if (await bcrypt.compare(submitted, reserved.codeHash)) {
    // Good exactly once: whichever request deletes it is the one it worked for.
    const used = await UserOtp.findOneAndDelete({ _id: reserved._id, codeHash: reserved.codeHash });
    return used ? { result: "ok", request: used } : { result: "expired" };
  }

  if (reserved.attempts >= MAX_ATTEMPTS) {
    await UserOtp.deleteOne({ _id: reserved._id });
    return { result: "locked" };
  }
  return { result: "wrong", attemptsLeft: MAX_ATTEMPTS - reserved.attempts };
}

// Ends every request this person has going - their password has just changed,
// so a sign-in or change begun with the old one shouldn't finish.
const cancelAll = (userId) => UserOtp.deleteMany({ user: userId });

// The reply to a code that didn't work. `restart` tells the page the request
// is over and the person has to begin again (`startOver` says how), and
// `reason` whether it ran out of time ("expired") or of guesses ("locked").
function sendCodeFailure(res, outcome, startOver) {
  if (outcome.result === "wrong") {
    const left = outcome.attemptsLeft;
    return res.status(400).json({
      message: `That code is incorrect. You have ${left} attempt${left === 1 ? "" : "s"} left.`,
      attemptsLeft: left,
    });
  }
  const why = outcome.result === "locked" ? "Too many wrong codes." : "That code has expired.";
  return res.status(400).json({ message: `${why} ${startOver}`, restart: true, reason: outcome.result });
}

module.exports = {
  OTP_LIFETIME_MS,
  PASSWORD_CHANGE,
  LOGIN,
  liveRequest,
  resendWait,
  timing,
  startRequest,
  renewCode,
  forgetSend,
  checkCode,
  cancelAll,
  sendCodeFailure,
};
