const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

// How stale a user's "last active" stamp may get before it's rewritten, so
// presence display doesn't cost a database write on every single request.
const ACTIVE_STAMP_INTERVAL = 60 * 1000;

// The algorithm is pinned, so a token can't choose how it gets checked.
const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

// Turns a token into the user it stands for, or says why not. A valid
// signature isn't enough: the token also has to be a session token (not the
// half-finished two-step sign-in one), be the user's current generation (log
// out, a password change or a ban all raise it), and belong to an account that
// isn't banned.
async function userForToken(token) {
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    return { error: "Not authorized, token invalid" };
  }
  if (decoded.purpose) return { error: "Not authorized, token invalid" };

  const user = await User.findById(decoded.id);
  if (!user) return { error: "Not authorized, user not found" };
  if ((decoded.tv ?? 0) !== (user.tokenVersion ?? 0)) {
    return { error: "Your session has ended. Please log in again." };
  }
  if (user.isBanned) return { error: "This account has been banned. Contact support for more information." };

  return { user };
}

// Verifies the JWT and attaches the logged-in user to req.user
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }

  const { user, error } = await userForToken(header.split(" ")[1]);
  if (error) {
    // `sessionEnded` tells the app this isn't a one-off failure: the sign-in
    // it is holding is no longer good, so it should go back to the login page.
    const failure = new Error(error);
    failure.statusCode = 401;
    failure.sessionEnded = true;
    throw failure;
  }
  req.user = user;

  const lastActive = req.user.lastActiveAt?.getTime() || 0;
  if (Date.now() - lastActive > ACTIVE_STAMP_INTERVAL) {
    User.updateOne({ _id: req.user._id }, { lastActiveAt: new Date() }).catch(() => {});
  }

  next();
});

// Restricts a route to specific roles, e.g. authorize("admin")
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`Role '${req.user?.role}' is not allowed to access this resource`);
    }
    next();
  };
};

// Attaches req.user when a valid token is sent but lets anonymous requests
// through, for public pages that show a little more to a signed-in viewer.
const optionalProtect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const { user } = await userForToken(header.split(" ")[1]);
      req.user = user;
    } catch {
      req.user = undefined;
    }
  }
  next();
});

module.exports = { protect, authorize, optionalProtect };
