// One-off script to create an admin account, since admins can't self-register.
// Usage: node scripts/createAdmin.js <username> <password> <name> <email>
// Example: node scripts/createAdmin.js admin Admin123! "Site Admin" admin@anisave.com

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

const [username, password, name, email] = process.argv.slice(2);

if (!username || !password || !name || !email) {
  console.error("Usage: node scripts/createAdmin.js <username> <password> <name> <email>");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    const existing = await User.findOne({ $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] });
    if (existing) {
      console.error("A user with that username or email already exists.");
      process.exit(1);
    }

    const admin = await User.create({ username, password, name, email, role: "admin" });
    console.log(`Admin account created: ${admin.username} (${admin.email})`);
    await mongoose.disconnect();
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
