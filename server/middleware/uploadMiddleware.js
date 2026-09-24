const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const {
  UPLOAD_DIR,
  DOCUMENT_DIR,
  REPORT_DIR,
  CHAT_DIR,
  imagePath,
  documentPath,
  reportEvidencePath,
  chatImagePath,
  deleteImageFile,
} = require("../utils/fileUtils");
const { saveToStore } = require("../utils/fileStore");

[UPLOAD_DIR, DOCUMENT_DIR, REPORT_DIR, CHAT_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// The only kinds of file accepted, and the extension each is saved with. The
// file's own name and declared type are never trusted: an ".html" or ".svg"
// file served back from this server would run script in the visitor's browser.
const IMAGE_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

// What a genuine file of each kind starts with. A "photo" that doesn't is
// something else with an image label on it.
const startsWith = (buffer, bytes, offset = 0) => bytes.every((byte, i) => buffer[offset + i] === byte);
const ascii = (text) => [...text].map((c) => c.charCodeAt(0));
const SIGNATURES = {
  ".jpg": (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  ".png": (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  ".gif": (b) => startsWith(b, ascii("GIF87a")) || startsWith(b, ascii("GIF89a")),
  ".webp": (b) => startsWith(b, ascii("RIFF")) && startsWith(b, ascii("WEBP"), 8),
};

// (hasOwn: a made-up type like "constructor" must not find anything on Object.prototype.)
const extensionFor = (mimetype) => (Object.hasOwn(IMAGE_EXTENSIONS, mimetype) ? IMAGE_EXTENSIONS[mimetype] : undefined);

const storageIn = (directory) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, directory),
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${crypto.randomInt(1e9)}${extensionFor(file.mimetype)}`;
      cb(null, uniqueName);
    },
  });

const fileFilter = (req, file, cb) => {
  if (extensionFor(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error("Only JPG, PNG, WebP or GIF photos are allowed");
    error.statusCode = 400;
    cb(error);
  }
};

const limits = { fileSize: 5 * 1024 * 1024, files: 6, fields: 40, fieldSize: 64 * 1024 };

const hasImageSignature = (file) => {
  try {
    const fd = fs.openSync(file.path, "r");
    const head = Buffer.alloc(12);
    fs.readSync(fd, head, 0, 12, 0);
    fs.closeSync(fd);
    return SIGNATURES[path.extname(file.filename)]?.(head) === true;
  } catch {
    return false;
  }
};

// Runs a multer middleware, then looks inside what it saved. Anything that
// isn't really the image it claimed to be is thrown away, along with the rest
// of that request's files, and the request is refused. What passes is copied
// into the database before the request goes on (see utils/fileStore.js), so it
// is still there after the server's disk has been wiped.
const withSignatureCheck = (middleware, pathFor) => (req, res, next) =>
  middleware(req, res, async (err) => {
    if (err) return next(err);

    const files = [req.file, ...(Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat())].filter(Boolean);
    if (!files.every(hasImageSignature)) {
      files.forEach((file) => fs.unlink(file.path, () => {}));
      const error = new Error("That file isn't a valid photo. Please choose a JPG, PNG, WebP or GIF image.");
      error.statusCode = 400;
      return next(error);
    }

    try {
      await Promise.all(files.map((file) => saveToStore(pathFor(file), file.path)));
      next();
    } catch (storeErr) {
      // All or nothing: a request never goes on with some of its photos kept.
      files.forEach((file) => deleteImageFile(pathFor(file)));
      next(storeErr);
    }
  });

const wrap = (instance, pathFor) => ({
  single: (name) => withSignatureCheck(instance.single(name), pathFor),
  array: (name, maxCount) => withSignatureCheck(instance.array(name, maxCount), pathFor),
  fields: (fields) => withSignatureCheck(instance.fields(fields), pathFor),
});

// Public photos (products, avatars): `upload.single(...)`, `upload.array(...)`.
const upload = wrap(multer({ storage: storageIn(UPLOAD_DIR), fileFilter, limits }), imagePath);

// Private documents (a farmer's ID and farm papers): `upload.documents.fields(...)`.
upload.documents = wrap(multer({ storage: storageIn(DOCUMENT_DIR), fileFilter, limits }), documentPath);

// Photos attached to a report (private): `upload.reports.array("evidence", 5)`.
upload.reports = wrap(
  multer({ storage: storageIn(REPORT_DIR), fileFilter, limits: { fileSize: 5 * 1024 * 1024, files: 5, fields: 10, fieldSize: 64 * 1024 } }),
  reportEvidencePath
);

// A photo sent in a chat (private), one at a time: `upload.chat.single("image")`.
upload.chat = wrap(
  multer({ storage: storageIn(CHAT_DIR), fileFilter, limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5, fieldSize: 8 * 1024 } }),
  chatImagePath
);

module.exports = upload;
