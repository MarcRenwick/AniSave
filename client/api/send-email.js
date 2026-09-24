// Sends AniSave's emails through Gmail on behalf of the API server.
//
// The API runs on Render, and Render's free plan blocks the ports mail servers
// listen on (25, 465 and 587), so the API can't reach Gmail from there. Vercel
// blocks only port 25. So the API hands each email to this function over
// HTTPS, and it goes on to Gmail from here, from the same address as ever.
//
// Only the API can use it. Every request is signed with EMAIL_PASS - the Gmail
// App Password, which the API and this function have and nobody else does -
// and a signature is good for that one message, for five minutes. Until
// EMAIL_USER and EMAIL_PASS are set on Vercel as well, it sends nothing.
import { createHmac, timingSafeEqual } from "node:crypto";
import nodemailer from "nodemailer";

// Long enough for Gmail on a slow day, short enough to answer with Gmail's
// reason before the API stops waiting, at 15 seconds.
const SMTP_TIMEOUT_MS = 10 * 1000;
const SIGNATURE_LIFETIME_MS = 5 * 60 * 1000;
// One address, with nothing in it that could add a second recipient.
const SINGLE_ADDRESS = /^[^\s@,;:<>()"]+@[^\s@,;:<>()"]+\.[^\s@,;:<>()"]+$/;

// The same signature server/utils/sendEmail.js makes. Google shows an App
// Password in groups of four; with or without the spaces it is the same
// password, so it signs the same.
const sign = (pass, timestamp, body) =>
  createHmac("sha256", pass.replace(/\s+/g, "")).update(`${timestamp}.${body}`).digest("hex");

const answer = (status, body, headers = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

function signatureProblem(request, body, pass) {
  const timestamp = request.headers.get("x-anisave-timestamp") || "";
  const signature = request.headers.get("x-anisave-signature") || "";
  if (!/^\d{1,16}$/.test(timestamp) || !/^[0-9a-f]{64}$/.test(signature)) {
    return "The request isn't signed";
  }
  if (Math.abs(Date.now() - Number(timestamp)) > SIGNATURE_LIFETIME_MS) {
    return "The request's signature has expired";
  }
  const expected = Buffer.from(sign(pass, timestamp, body), "hex");
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) {
    return "The request's signature doesn't match - EMAIL_PASS has to be the same on Render and on Vercel";
  }
  return null;
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return answer(405, { message: "Only POST is accepted here" }, { Allow: "POST" });
    }

    const { EMAIL_USER: user, EMAIL_PASS: pass } = process.env;
    if (!user || !pass) {
      return answer(503, { message: "EMAIL_USER and EMAIL_PASS aren't set on Vercel" });
    }

    // Checked against the body exactly as it arrived, before anything reads it.
    const body = await request.text();
    const problem = signatureProblem(request, body, pass);
    if (problem) return answer(401, { message: problem });

    let message = null;
    try {
      message = JSON.parse(body);
    } catch {
      // answered just below
    }
    const { to, subject, html } = message || {};
    if (
      typeof to !== "string" ||
      !SINGLE_ADDRESS.test(to) ||
      typeof subject !== "string" ||
      !subject.trim() ||
      typeof html !== "string" ||
      !html
    ) {
      return answer(400, { message: "Expected { to, subject, html }, with one address in to" });
    }

    try {
      // Waited for before answering: Vercel pauses a function once it has
      // responded, so a send left running would never finish.
      await nodemailer
        .createTransport({
          service: "gmail",
          auth: { user, pass },
          connectionTimeout: SMTP_TIMEOUT_MS,
          greetingTimeout: SMTP_TIMEOUT_MS,
          socketTimeout: SMTP_TIMEOUT_MS,
        })
        .sendMail({ from: `"AniSave" <${user}>`, to, subject, html });
    } catch (err) {
      // Gmail's reason goes back to the API's log. The message never does,
      // because it holds the code.
      console.error(`Could not send an email (${subject}): ${err.message}`);
      return answer(502, { message: `Gmail refused the email: ${err.message}` });
    }
    return answer(200, { sent: true });
  },
};
