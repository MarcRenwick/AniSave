// What a restricted (banned or suspended) account is told when it tries to get in.
// A ban and a report-based suspension are the same restriction (isBanned), but
// the person is told which one it is.
const restrictionMessage = (user) =>
  user.suspendedAt
    ? "This account has been suspended after a report was reviewed. Contact support for more information."
    : "This account has been banned. Contact support for more information.";

module.exports = { restrictionMessage };
