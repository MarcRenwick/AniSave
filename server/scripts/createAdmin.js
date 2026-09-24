// One-off script to create (or recover) an admin account, since admins can't
// be signed up from the public sign-up form.
//
// Usage:
//   ADMIN_PASSWORD='...' node scripts/createAdmin.js <username> <name> <email>
//   node scripts/createAdmin.js <username> <password> <name> <email>
//
// The first form keeps the password out of your shell history and is the one
// to prefer. Either way the password is never printed back.
//
// It writes to whatever MONGO_URI points at, which is the local database
// unless you say otherwise - so to create the admin on a deployed database,
// pass that database's URI on the command:
//
//   MONGO_URI='<your Atlas connection string>' ADMIN_PASSWORD='...' \
//     node scripts/createAdmin.js siteadmin "Site Admin" admin@example.com
//
// The script says which database it actually reached before it writes, so a
// URI that quietly fell back to localhost is obvious rather than mysterious.
//
// If the account already exists this refuses to touch it. Set ADMIN_RESET=true
// to give that account a new password and make it an admin instead - which
// also signs out every session it already had.
//
// Note: signing in as an administrator always sends a 6-digit code to the
// account's email address and cannot be switched off. So an admin account is
// only usable where the server has working EMAIL_USER and EMAIL_PASS settings,
// and where you can read that mailbox.

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const validate = require("../utils/validate");

const args = process.argv.slice(2);
const fromEnv = typeof process.env.ADMIN_PASSWORD === "string" && process.env.ADMIN_PASSWORD !== "";

// <username> <name> <email> when the password came from the environment,
// <username> <password> <name> <email> when it didn't.
const [username, password, name, email] = fromEnv
  ? [args[0], process.env.ADMIN_PASSWORD, args[1], args[2]]
  : args;

if (!username || !password || !name || !email) {
  console.error("Usage: ADMIN_PASSWORD='...' node scripts/createAdmin.js <username> <name> <email>");
  console.error("   or: node scripts/createAdmin.js <username> <password> <name> <email>");
  process.exit(1);
}

// The same rules the app applies to anyone signing up, so an account made here
// is one the app would have accepted - and one that can actually log in.
let clean;
try {
  clean = {
    username: validate.username(username),
    password: validate.newPassword(password),
    name: validate.fullName(name),
    email: validate.email(email),
  };
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const reset = process.env.ADMIN_RESET === "true";

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    // Which database this actually is. Worth reading before anything is
    // written: running this without setting MONGO_URI writes to the local
    // database, which looks exactly like success from here.
    const { host, port, name: dbName } = mongoose.connection;
    console.log(`Connected to ${host}${port ? `:${port}` : ""}, database "${dbName}".`);

    const existing = await User.findOne({
      $or: [{ username: clean.username }, { email: clean.email }],
    });

    if (existing && !reset) {
      console.error(
        `A user with that username or email already exists in "${dbName}" (role: ${existing.role}).`
      );
      console.error("Re-run with ADMIN_RESET=true to give it this password and make it an admin.");
      process.exit(1);
    }

    if (existing) {
      existing.name = clean.name;
      existing.role = "admin";
      existing.password = clean.password;
      // Every session that account already had stops working, so an old token
      // can't outlive the password it was issued against.
      existing.tokenVersion = (existing.tokenVersion || 0) + 1;
      await existing.save();
      console.log(`Reset: ${existing.username} (${existing.email}) is now an admin in "${dbName}".`);
      console.log("Any session it already had has been signed out.");
    } else {
      const admin = await User.create({ ...clean, role: "admin" });
      console.log(`Admin account created in "${dbName}": ${admin.username} (${admin.email})`);
    }

    console.log(
      "Signing in as an admin always emails a 6-digit code to that address, so the server needs EMAIL_USER and EMAIL_PASS set."
    );
    await mongoose.disconnect();
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
