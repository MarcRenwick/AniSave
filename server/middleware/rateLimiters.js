const rateLimit = require("express-rate-limit");

// Limits are per IP address. They slow down guessing and abuse - passwords,
// one-time codes, email sending, mass sign-ups - without touching normal use.
//
// (Behind a reverse proxy, tell Express to trust it - app.set("trust proxy", ...)
// - or every visitor will look like one address.)
//
// Automated tests set NODE_ENV=test and RATE_LIMIT=off to run thousands of
// requests; in any other setting the limits are always on.
const skip = () => process.env.NODE_ENV === "test" && process.env.RATE_LIMIT === "off";

const limiter = (options) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip,
    message: { message: "Too many requests. Please wait a few minutes and try again." },
    ...options,
  });

// The whole API - generous, just a ceiling against floods.
const apiLimiter = limiter({ limit: 1500 });

// Anything that checks a secret (password, one-time code): only FAILED attempts
// count, so signing in normally never uses any of the allowance.
const guessLimiter = limiter({ limit: 20, skipSuccessfulRequests: true });

// Anything that sends an email: a handful per quarter-hour.
const emailLimiter = limiter({ limit: 8 });

// Creating accounts: a few per hour from one address.
const registerLimiter = limiter({ windowMs: 60 * 60 * 1000, limit: 20 });

module.exports = { apiLimiter, guessLimiter, emailLimiter, registerLimiter };
