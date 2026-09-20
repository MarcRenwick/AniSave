const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/db");
const { UPLOAD_DIR } = require("./utils/fileUtils");
const { apiLimiter } = require("./middleware/rateLimiters");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const farmerRoutes = require("./routes/farmerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const locationRoutes = require("./routes/locationRoutes");
const documentRoutes = require("./routes/documentRoutes");
const reportRoutes = require("./routes/reportRoutes");
const reportEvidenceRoutes = require("./routes/reportEvidenceRoutes");
const reviewReportRoutes = require("./routes/reviewReportRoutes");
const blockRoutes = require("./routes/blockRoutes");

// Every session token is signed with this. Without it nobody could log in; a
// short one could be guessed - so the server won't start in production with one.
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is not set. Add a long random value to server/.env and restart.");
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET is shorter than 32 characters - use a longer random value.");
  if (process.env.NODE_ENV === "production") process.exit(1);
}

connectDB();

const app = express();

// Security headers (no X-Powered-By, nosniff, frame protection, HSTS...).
// Cross-origin resource policy is relaxed only because the web app lives on a
// different origin from the API and has to be able to show the product photos
// served from /uploads.
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// Only the website itself may call the API from a browser. CLIENT_URL is the
// site's address (comma-separate several); in development the 127.0.0.1 twin
// of a localhost address is allowed too. Requests with no Origin header
// (curl, server-to-server) aren't browsers, so CORS doesn't apply to them.
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .flatMap((origin) =>
    process.env.NODE_ENV === "production" || !origin.includes("//localhost") ? [origin] : [origin, origin.replace("//localhost", "//127.0.0.1")]
  );
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)) }));

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Product photos and profile pictures - public by design. A farmer's ID and
// farm documents are NOT here: they are only served by /api/documents.
app.use("/uploads", express.static(UPLOAD_DIR, { index: false, dotfiles: "deny" }));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/farmers", farmerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin-auth", adminAuthRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/report-evidence", reportEvidenceRoutes);
app.use("/api/review-reports", reviewReportRoutes);
app.use("/api/blocks", blockRoutes);

app.use(notFound);
app.use(errorHandler);

// A stray failure in the background (say, a mail server timing out) is logged
// rather than taking the whole API down with it.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason instanceof Error ? reason.stack : reason);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
