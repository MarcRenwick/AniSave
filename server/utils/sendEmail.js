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

const sendEmail = async ({ to, subject, html }) => {
  await getTransporter().sendMail({
    from: `"AniSave" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;
