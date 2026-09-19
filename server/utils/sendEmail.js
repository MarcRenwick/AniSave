const fs = require("fs");
const os = require("os");
const path = require("path");
const nodemailer = require("nodemailer");

// Built lazily (inside sendEmail, not at module load) so it always reads
// EMAIL_USER/EMAIL_PASS after dotenv has actually loaded them - building it
// at the top of this file would bake in `undefined` if this module happens
// to get required before dotenv.config() runs in server.js.
const getTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Force IPv4 - some Windows/network setups advertise IPv6 for Gmail's
    // SMTP host but can't actually route it, causing ENETUNREACH.
    family: 4,
  });

// Names and other things people typed go into these emails, so they are
// escaped: otherwise someone could register with markup as their name and have
// a message from AniSave carry it to whoever owns the address.
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Where automated tests read "sent" emails from - see sendEmail below.
const TEST_OUTBOX = path.join(os.tmpdir(), "anisave-test-outbox.jsonl");

const sendEmail = async ({ to, subject, html }) => {
  // With NODE_ENV=test nothing is ever sent: the message is written to a local
  // file instead, so tests can read a one-time code without emailing anyone.
  if (process.env.NODE_ENV === "test") {
    fs.appendFileSync(TEST_OUTBOX, `${JSON.stringify({ to, subject, html })}\n`);
    return;
  }

  await getTransporter().sendMail({
    from: `"AniSave" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;
module.exports.escapeHtml = escapeHtml;
module.exports.TEST_OUTBOX = TEST_OUTBOX;
