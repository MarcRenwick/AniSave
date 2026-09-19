const path = require("path");
const fs = require("fs");

// Three places files live:
//  - uploads/           product photos and profile pictures. Served publicly,
//                       because a shop page has to show them to anyone.
//  - private/documents/ a farmer's government ID and farm documents. Never
//                       served as static files: the only way to read one is
//                       GET /api/documents/:file, by its owner or an admin.
//  - private/reports/   the photos a buyer attaches to a report. Private too:
//                       only the buyer who sent them and admins can open one
//                       (GET /api/report-evidence/:file).
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const DOCUMENT_DIR = path.join(__dirname, "..", "private", "documents");
const REPORT_DIR = path.join(__dirname, "..", "private", "reports");

// The paths saved in the database. /uploads/x is public; /documents/x and
// /report-evidence/x are private.
const imagePath = (file) => (file ? `/uploads/${file.filename}` : undefined);
const documentPath = (file) => (file ? `/documents/${file.filename}` : undefined);
const reportEvidencePath = (file) => (file ? `/report-evidence/${file.filename}` : undefined);

// Where a saved path points on disk. Only the file name is used, so nothing
// stored (or sent) can walk out of these folders.
const resolveStoredFile = (url) => {
  if (typeof url !== "string") return null;
  const name = path.basename(url);
  if (url.startsWith("/documents/")) return path.join(DOCUMENT_DIR, name);
  if (url.startsWith("/report-evidence/")) return path.join(REPORT_DIR, name);
  if (url.startsWith("/uploads/")) return path.join(UPLOAD_DIR, name);
  return null;
};

const deleteImageFile = (imageUrl) => {
  const filePath = resolveStoredFile(imageUrl);
  if (filePath) fs.unlink(filePath, () => {});
};

module.exports = {
  UPLOAD_DIR,
  DOCUMENT_DIR,
  REPORT_DIR,
  imagePath,
  documentPath,
  reportEvidencePath,
  resolveStoredFile,
  deleteImageFile,
};
