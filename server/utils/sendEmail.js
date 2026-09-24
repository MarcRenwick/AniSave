const fs = require("fs");
const os = require("os");
const path = require("path");
const nodemailer = require("nodemailer");

// How long to wait on the mail service before giving up. Nodemailer's own
// defaults run to minutes: on a host that can't reach the mail server at all,
// someone pressing "Send OTP" sat watching a spinner for two minutes and was
// then told something had gone wrong on our side.
const SEND_TIMEOUT_MS = 15 * 1000;

// What the person is told when a code they are waiting on the page for could
// not be sent. Plain on purpose - the reason is in the server log, not here.
const EMAIL_FAILED_MESSAGE = "We couldn't send the email just now. Please try again in a minute.";

// Brevo's transactional email API, reached over HTTPS like any web request.
// This is how mail leaves a host that blocks SMTP: Render's free instances
// refuse outbound traffic on ports 25, 465 and 587, so Gmail's mail server
// never answers from there and every send times out. Setting BREVO_API_KEY
// switches to it. BREVO_API_URL exists only so tests can stand in for Brevo.
const brevoUrl = () => process.env.BREVO_API_URL || "https://api.brevo.com/v3/smtp/email";

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
    connectionTimeout: SEND_TIMEOUT_MS,
    greetingTimeout: SEND_TIMEOUT_MS,
    socketTimeout: SEND_TIMEOUT_MS,
  });

// Names and other things people typed go into these emails, so they are
// escaped: otherwise someone could register with markup as their name and have
// a message from AniSave carry it to whoever owns the address.
const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Where automated tests read "sent" emails from - see sendEmail below.
const TEST_OUTBOX = path.join(os.tmpdir(), "anisave-test-outbox.jsonl");

// Every failure says why in words fit for the server log - and never includes
// the message itself, which holds the code.
async function sendWithBrevo({ to, subject, html }) {
  if (typeof fetch !== "function") {
    throw new Error("Sending through Brevo needs Node 18 or newer");
  }

  let response;
  try {
    response = await fetch(brevoUrl(), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        // Has to be a sender verified in the Brevo account. A Gmail address
        // can be verified, but can't be authenticated as a domain, so Brevo
        // sends it on an address of its own and keeps "AniSave" as the name.
        sender: { name: "AniSave", email: process.env.EMAIL_USER },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  } catch (err) {
    throw new Error(
      err.name === "TimeoutError"
        ? `Brevo did not answer within ${SEND_TIMEOUT_MS / 1000} seconds`
        : `Could not reach Brevo: ${err.message}`
    );
  }

  if (!response.ok) {
    // Brevo explains itself as { code, message } - an unknown key, a sender
    // that was never verified, an account still awaiting activation.
    const detail = await response.json().catch(() => ({}));
    throw new Error(
      `Brevo refused the email (HTTP ${response.status}${detail.code ? `, ${detail.code}` : ""}): ${
        detail.message || response.statusText
      }`
    );
  }
}

const sendEmail = async ({ to, subject, html }) => {
  // With NODE_ENV=test nothing is ever sent: the message is written to a local
  // file instead, so tests can read a one-time code without emailing anyone.
  if (process.env.NODE_ENV === "test") {
    fs.appendFileSync(TEST_OUTBOX, `${JSON.stringify({ to, subject, html })}\n`);
    return;
  }

  if (process.env.BREVO_API_KEY) {
    await sendWithBrevo({ to, subject, html });
    return;
  }

  await getTransporter().sendMail({
    from: `"AniSave" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

// For a code the person is waiting on the page for. Sends it now and says
// whether it went, logging why when it didn't. `onFailure` takes the unsent
// code back, so the next request sends a new one instead of being turned away
// by the resend cooldown for a code that never arrived.
async function trySend(message, { onFailure } = {}) {
  try {
    await sendEmail(message);
    return true;
  } catch (err) {
    console.error(`Could not send an email (${message.subject}): ${err.message}`);
    if (onFailure) await onFailure().catch(() => {});
    return false;
  }
}

module.exports = sendEmail;
module.exports.escapeHtml = escapeHtml;
module.exports.trySend = trySend;
module.exports.EMAIL_FAILED_MESSAGE = EMAIL_FAILED_MESSAGE;
module.exports.SEND_TIMEOUT_MS = SEND_TIMEOUT_MS;
module.exports.TEST_OUTBOX = TEST_OUTBOX;
