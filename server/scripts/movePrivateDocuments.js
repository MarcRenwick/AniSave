#!/usr/bin/env node
/*
 * Moves every farmer's government ID and farm-document photos out of the public
 * uploads folder into private storage (server/private/documents), and points
 * their accounts at the new location (/documents/<file>).
 *
 * Until this is run, documents uploaded before private storage existed are
 * still reachable by anyone who has the URL.
 *
 *   node scripts/movePrivateDocuments.js --dry-run   show what would move
 *   node scripts/movePrivateDocuments.js             do it
 *
 * Safe to run more than once: anything already moved is skipped, and if an
 * earlier run stopped after moving a file but before updating the account, this
 * one finishes the job.
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const User = require("../models/User");
const { UPLOAD_DIR, DOCUMENT_DIR } = require("../utils/fileUtils");

const DRY_RUN = process.argv.includes("--dry-run");
const verb = DRY_RUN ? "would move" : "moved    ";

const stats = { moved: 0, alreadyThere: 0, missing: 0 };

// Returns the path to save for a document - the new one once it's in private storage.
function moveDocument(stored, owner) {
  if (typeof stored !== "string" || !stored.startsWith("/uploads/")) return stored;

  const name = path.basename(stored);
  const from = path.join(UPLOAD_DIR, name);
  const to = path.join(DOCUMENT_DIR, name);

  if (fs.existsSync(from)) {
    console.log(`  ${verb} ${owner}: ${name}`);
    if (!DRY_RUN) {
      fs.mkdirSync(DOCUMENT_DIR, { recursive: true });
      fs.renameSync(from, to);
    }
    stats.moved += 1;
    return `/documents/${name}`;
  }
  if (fs.existsSync(to)) {
    // An earlier run moved the file but stopped before saving the account.
    stats.alreadyThere += 1;
    return `/documents/${name}`;
  }

  console.log(`  missing   ${owner}: ${name} is not on disk - left as it was`);
  stats.missing += 1;
  return stored;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  if (DRY_RUN) console.log("Dry run - nothing will be changed.\n");

  const users = await User.collection
    .find({ $or: [{ governmentId: /^\/uploads\// }, { farmDocuments: /^\/uploads\// }] })
    .toArray();

  for (const user of users) {
    const governmentId = moveDocument(user.governmentId, user.username);
    const farmDocuments = (user.farmDocuments || []).map((doc) => moveDocument(doc, user.username));
    if (!DRY_RUN) await User.collection.updateOne({ _id: user._id }, { $set: { governmentId, farmDocuments } });
  }

  console.log(
    `\n${DRY_RUN ? "Dry run: " : ""}${users.length} account(s) checked - ${stats.moved} file(s) ${DRY_RUN ? "would move" : "moved"}, ` +
      `${stats.alreadyThere} already in private storage, ${stats.missing} missing.`
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
