#!/usr/bin/env node
/*
 * Gives accounts made before addresses were structured a city/municipality-level
 * address (with coordinates), worked out from the free-typed `location` text
 * they already have - so they show up in "nearest" results instead of being
 * silently left out.
 *
 *   node scripts/backfillAddresses.js --dry-run   show what would change
 *   node scripts/backfillAddresses.js             apply it
 *
 * Safe to run more than once: it only ever ADDS an address to an account that
 * has none, never touches one that already has coordinates, and never edits
 * the `location` text. A name that matches no place, or several (a "San Jose"
 * exists in many provinces), is reported and left alone - those people can
 * pick their address in Edit Profile.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const { matchLegacyLocation } = require("../utils/locations");

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const users = await User.find({
    role: { $in: ["farmer", "buyer"] },
    "address.latitude": { $exists: false },
  }).select("username role location address");

  let updated = 0;
  let left = 0;

  for (const user of users) {
    const text = user.location;
    if (!text) {
      console.log(`  skip     ${user.username} (${user.role}): no location on file`);
      left += 1;
      continue;
    }

    const match = matchLegacyLocation(text);
    if (!match) {
      console.log(`  no match ${user.username} (${user.role}): "${text}" - not found, or could mean several places`);
      left += 1;
      continue;
    }

    console.log(`  ${DRY_RUN ? "would set" : "set      "} ${user.username} (${user.role}): "${text}" -> ${match.city}, ${match.province}`);
    if (!DRY_RUN) {
      user.address = match;
      await user.save();
    }
    updated += 1;
  }

  console.log(
    `\n${DRY_RUN ? "Dry run: " : ""}${updated} account(s) ${DRY_RUN ? "would get" : "got"} an address, ${left} left as they were.`
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
