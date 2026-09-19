#!/usr/bin/env node
/*
 * Brings existing accounts in line with how addresses work now: a province and
 * a municipality/city, with that city's own point as the coordinates.
 *
 *   1. Accounts made before addresses were structured only have free-typed
 *      `location` text. When it names exactly one city or municipality they get
 *      an address for it, so they show up in "nearest" instead of being
 *      silently left out. Their `location` text is left as they wrote it.
 *   2. Accounts saved by the earlier Province > City > Barangay version still
 *      carry a barangay (and maybe a barangay-level point). They are reset to
 *      their city's point, and `location` to "City, Province", so everyone's
 *      distances are measured the same way.
 *
 *   node scripts/backfillAddresses.js --dry-run   show what would change
 *   node scripts/backfillAddresses.js             apply it
 *
 * Safe to run more than once. Text that matches no place, or several (a "San
 * Jose" exists in many provinces), is reported and left alone - those people
 * can pick their address in Edit Profile.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");
const { matchLegacyLocation, resolveAddress } = require("../utils/locations");

const DRY_RUN = process.argv.includes("--dry-run");
const verb = (applied, planned) => (DRY_RUN ? planned : applied);

async function addMissingAddresses() {
  const users = await User.find({
    role: { $in: ["farmer", "buyer"] },
    "address.latitude": { $exists: false },
  }).select("username role location");

  let updated = 0;
  let left = 0;

  for (const user of users) {
    const text = user.location;
    if (!text) {
      console.log(`  skip      ${user.username} (${user.role}): no location on file`);
      left += 1;
      continue;
    }

    const match = matchLegacyLocation(text);
    if (!match) {
      console.log(`  no match  ${user.username} (${user.role}): "${text}" - not found, or could mean several places`);
      left += 1;
      continue;
    }

    console.log(`  ${verb("set      ", "would set")} ${user.username} (${user.role}): "${text}" -> ${match.label}`);
    if (!DRY_RUN) await User.updateOne({ _id: user._id }, { $set: { address: match.address } });
    updated += 1;
  }

  console.log(`  ${updated} account(s) ${verb("got", "would get")} an address, ${left} left as they were.`);
}

// The barangay fields are no longer in the schema, so these are read and
// written on the raw collection.
async function resetBarangayAddresses() {
  const cursor = User.collection.find({
    role: { $in: ["farmer", "buyer"] },
    $or: [{ "address.barangayCode": { $exists: true } }, { "address.precision": { $exists: true } }],
  });

  let reset = 0;
  let left = 0;

  for await (const user of cursor) {
    let resolved;
    try {
      resolved = resolveAddress({ provinceCode: user.address.provinceCode, cityCode: user.address.cityCode });
    } catch (err) {
      console.log(`  skip      ${user.username} (${user.role}): ${err.message}`);
      left += 1;
      continue;
    }

    console.log(`  ${verb("reset    ", "would reset")} ${user.username} (${user.role}): "${user.location}" -> ${resolved.label}`);
    if (!DRY_RUN) {
      await User.collection.updateOne({ _id: user._id }, { $set: { address: resolved.address, location: resolved.label } });
      // A farmer's listings are picked up at their registered address.
      if (user.role === "farmer") await Product.updateMany({ farmer: user._id }, { $set: { location: resolved.label } });
    }
    reset += 1;
  }

  console.log(`  ${reset} account(s) ${verb("were", "would be")} reset to their city's point, ${left} left as they were.`);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  if (DRY_RUN) console.log("Dry run - nothing will be changed.\n");

  console.log("Accounts with no structured address:");
  await addMissingAddresses();
  console.log("\nAccounts saved with a barangay:");
  await resetBarangayAddresses();

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
