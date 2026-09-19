const jwt = require("jsonwebtoken");

// `tv` ties a token to the user's tokenVersion. Bumping that number - on log
// out, a password change or reset, or a ban - makes every token issued before
// it stop working, which a bare JWT can't do on its own.
const generateToken = (id, role, tokenVersion = 0) =>
  jwt.sign({ id, role, tv: tokenVersion }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// Proof that the password half of a two-step sign-in went through. It carries a
// `purpose`, so the auth middleware refuses it as a session, and it only lasts
// long enough to type the emailed code.
const generateMfaToken = (id) =>
  jwt.sign({ id, purpose: "mfa" }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "10m" });

module.exports = generateToken;
module.exports.generateMfaToken = generateMfaToken;
