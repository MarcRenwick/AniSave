const path = require("path");
const fs = require("fs");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const { DOCUMENT_DIR } = require("../utils/fileUtils");

// @desc    A farmer's government ID or farm document photo
// @route   GET /api/documents/:filename
// @access  Private - the farmer it belongs to, or an admin reviewing them.
//          Everyone else gets "not found", so it doesn't even confirm a file exists.
const getDocument = asyncHandler(async (req, res) => {
  const filename = path.basename(String(req.params.filename));
  const stored = `/documents/${filename}`;

  if (req.user.role !== "admin") {
    const owned = await User.exists({
      _id: req.user._id,
      $or: [{ governmentId: stored }, { farmDocuments: stored }],
    });
    if (!owned) {
      res.status(404);
      throw new Error("Document not found");
    }
  }

  const file = path.join(DOCUMENT_DIR, filename);
  if (!fs.existsSync(file)) {
    res.status(404);
    throw new Error("Document not found");
  }

  // Never cached or shared, and never sniffed into anything but an image.
  res.set({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
  });
  res.sendFile(file);
});

module.exports = { getDocument };
