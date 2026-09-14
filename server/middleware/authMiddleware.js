const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

// How stale a user's "last active" stamp may get before it's rewritten, so
// presence display doesn't cost a database write on every single request.
const ACTIVE_STAMP_INTERVAL = 60 * 1000;

// Verifies the JWT and attaches the logged-in user to req.user
const protect = asyncHandler(async (req, res, next) => {
  let token = req.headers.authorization;

  if (!token || !token.startsWith("Bearer ")) {
    res.status(401);
    throw new Error("Not authorized, no token");
  }

  try {
    token = token.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
  } catch (error) {
    res.status(401);
    throw new Error("Not authorized, token invalid");
  }

  if (!req.user) {
    res.status(401);
    throw new Error("Not authorized, user not found");
  }

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

module.exports = { protect, authorize };
