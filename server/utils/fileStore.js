const fs = require("fs");
const mongoose = require("mongoose");

// Every uploaded file is also kept in the database, in MongoDB's own file
// storage (GridFS), under the same path the rest of the app already uses for
// it - "/uploads/x.jpg", "/documents/x.jpg", "/report-evidence/x.jpg".
//
// The server's own disk can't be trusted to keep them: Render's filesystem is
// wiped on every deploy and restart, and a free instance restarts whenever it
// has sat idle for a while. So a farmer's ID was there when they registered and
// gone by the time an admin opened it. The disk copy is still written, and read
// first while it lasts; the database copy is the one that stays.
const BUCKET = "fileStore";

// The only kinds of file ever stored, by the extension they are saved with.
const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};
const contentTypeFor = (storedPath) => CONTENT_TYPES[storedPath.slice(storedPath.lastIndexOf(".")).toLowerCase()];

// Uploads can arrive while the server is still connecting to the database.
const bucket = async () => {
  if (mongoose.connection.readyState !== 1) await mongoose.connection.asPromise();
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET });
};

// Copies a file multer has just written to disk into the database.
async function saveToStore(storedPath, localFile) {
  const store = await bucket();
  await new Promise((resolve, reject) => {
    const upload = store.openUploadStream(storedPath, { metadata: { contentType: contentTypeFor(storedPath) } });
    fs.createReadStream(localFile).on("error", reject).pipe(upload).on("error", reject).on("finish", resolve);
  });
}

async function findInStore(storedPath) {
  const store = await bucket();
  const [file] = await store.find({ filename: storedPath }).limit(1).toArray();
  return file ? { store, file } : null;
}

// Sends a stored file, or says it isn't there.
async function streamFromStore(storedPath, res, headers = {}) {
  const found = await findInStore(storedPath);
  const type = contentTypeFor(storedPath);
  if (!found || !type) return false;

  res.set({ ...headers, "Content-Type": type, "Content-Length": String(found.file.length) });
  await new Promise((resolve, reject) => {
    found.store
      .openDownloadStream(found.file._id)
      .on("error", reject)
      .pipe(res)
      .on("finish", resolve)
      .on("error", reject);
  });
  return true;
}

async function deleteFromStore(storedPath) {
  const store = await bucket();
  const copies = await store.find({ filename: storedPath }).toArray();
  await Promise.all(copies.map((file) => store.delete(file._id)));
}

module.exports = { BUCKET, saveToStore, streamFromStore, deleteFromStore, findInStore };
