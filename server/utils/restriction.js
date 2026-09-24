// What a restricted (banned or suspended) account is told when it tries to get in.
// A ban and a report-based suspension are the same restriction (isBanned), but
// the person is told which one it is - and why, when the admin gave a reason.
// Accounts restricted before reasons were recorded get the message without one.
const withReason = (reason) => {
  const clean = String(reason || "").trim();
  if (!clean) return "";
  return ` Reason: ${clean}${/[.!?]$/.test(clean) ? "" : "."}`;
};

const restrictionMessage = (user) =>
  user.suspendedAt
    ? `This account has been suspended after a report was reviewed.${withReason(user.suspensionReason)} Contact support for more information.`
    : `This account has been banned.${withReason(user.suspensionReason)} Contact support for more information.`;

module.exports = { restrictionMessage };
