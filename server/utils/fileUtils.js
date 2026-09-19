const path = require("path");
const fs = require("fs");

// Two places files live:
//  - uploads/           product photos and profile pictures. Served publicly,
//                       because a shop page has to show them to anyone.
//  - private/documents/ a farmer's government ID and farm documents. Never
//                       served as static files: the only way to read one is
//                       GET /api/documents/:file, by its owner or an admin.
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const DOCUMENT_DIR = path.join(__dirname, "..", "private", "documents");

// The paths saved in the database. /uploads/x is public; /documents/x is private.
const imagePath = (file) => (file ? `/uploads/${file.filename}` : undefined);
const documentPath = (file) => (file ? `/documents/${file.filename}` : undefined);

// Where a saved path points on disk. Only the file name is used, so nothing
// stored (or sent) can walk out of these two folders.
const resolveStoredFile = (url) => {
  if (typeof url !== "string") return null;
  const name = path.basename(url);
  if (url.startsWith("/documents/")) return path.join(DOCUMENT_DIR, name);
  if (url.startsWith("/uploads/")) return path.join(UPLOAD_DIR, name);
  return null;
};

const deleteImageFile = (imageUrl) => {
  const filePath = resolveStoredFile(imageUrl);
  if (filePath) fs.unlink(filePath, () => {});
};

module.exports = { UPLOAD_DIR, DOCUMENT_DIR, imagePath, documentPath, resolveStoredFile, deleteImageFile };
