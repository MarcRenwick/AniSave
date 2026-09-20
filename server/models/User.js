const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { EMAIL_PATTERN, USERNAME_PATTERN, PHONE_PATTERN } = require("../utils/validate");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [80, "Name must be 80 characters or fewer"],
      match: [/^[^<>]*$/, "Name can't contain < or >"],
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username must be 30 characters or fewer"],
      match: [USERNAME_PATTERN, "Username can only use letters, numbers, dots, dashes and underscores"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, "Email is too long"],
      match: [EMAIL_PATTERN, "Enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be 6-12 characters"],
      maxlength: [12, "Password must be 6-12 characters"],
      select: false,
      validate: {
        validator: function (value) {
          return /[A-Z]/.test(value) && /[^A-Za-z0-9]/.test(value);
        },
        message: "Password must include at least one capital letter and one special character",
      },
    },
    role: {
      type: String,
      enum: ["farmer", "buyer", "admin"],
      required: [true, "Role is required"],
    },
    // A readable one-line version of `address` ("Lingayen, Pangasinan"), kept
    // because pages and product listings show it as text. Accounts made before
    // addresses were structured only have this, free-typed.
    location: {
      type: String,
      trim: true,
    },
    // The registered address, picked from the Province > Municipality/City
    // lists. The coordinates are that city's own centre point, filled in by
    // the server from the selection (see utils/locations.js) - nobody types
    // them, and they are never a live location.
    address: {
      provinceCode: String,
      province: String,
      cityCode: String,
      city: String,
      latitude: Number,
      longitude: Number,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, "Phone number is too long"],
      match: [PHONE_PATTERN, "Enter a valid phone number"],
    },
    // Uploaded profile photo, already cropped to a square by the client
    avatar: {
      type: String,
      default: null,
    },

    // Farmer-only fields
    farmName: {
      type: String,
      trim: true,
      maxlength: [100, "Farm name must be 100 characters or fewer"],
    },
    farmDescription: {
      type: String,
      trim: true,
      maxlength: [1000, "Farm details must be 1000 characters or fewer"],
    },
    certifications: {
      type: [String],
      default: [],
    },
    rating: {
      type: Number,
      default: 0,
    },

    // Admin approval — required for farmers (and optionally buyers) before they can transact
    isVerified: {
      type: Boolean,
      default: function () {
        return this.role !== "farmer";
      },
    },

    // Documents an admin reviews before a farmer is allowed to sell.
    // verificationStatus has no default on purpose: accounts made before this
    // existed have none, and fall back to isVerified - see
    // effectiveVerificationStatus() in utils/verification.js.
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
    },
    verificationNote: {
      type: String,
      trim: true,
    },
    governmentId: {
      type: String,
      default: null,
    },
    farmDocuments: {
      type: [String],
      default: [],
    },
    verificationSubmittedAt: {
      type: Date,
    },
    verificationReviewedAt: {
      type: Date,
    },

    // Set by an admin - a banned user cannot log in
    isBanned: {
      type: Boolean,
      default: false,
    },
    // A farmer suspended after a buyer's report was reviewed (see
    // controllers/reportController.js). It is the same restriction as a ban -
    // isBanned is what every check reads - plus when and why, so the account is
    // told it was suspended rather than banned. Unbanning clears both.
    suspendedAt: {
      type: Date,
    },
    suspensionReason: {
      type: String,
      trim: true,
      maxlength: [500, "The reason must be 500 characters or fewer"],
    },

    // Stamped (throttled) on authenticated requests, so a seller's profile
    // can show a real "last active" time instead of a made-up one
    lastActiveAt: {
      type: Date,
    },

    // Buyers only: the farmers this buyer has blocked. Their shop and listings
    // stop reaching this buyer, and they can no longer sell to them - see
    // utils/blocks.js. Who somebody has blocked is nobody else's business, so
    // it is private like the fields below: it only leaves through
    // controllers/blockController.js, to the buyer it belongs to.
    blockedUsers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },

    // One-time code for signing in by email instead of a password. Every kind
    // of code is stored hashed, with an expiry and a count of wrong guesses
    // (see utils/otp.js), and none of it is ever selected by default.
    loginCode: {
      type: String,
      select: false,
    },
    loginCodeExpires: {
      type: Date,
      select: false,
    },
    loginCodeAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    resetPasswordCode: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    resetPasswordAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    deleteAccountCode: {
      type: String,
      select: false,
    },
    deleteAccountExpires: {
      type: Date,
      select: false,
    },
    deleteAccountAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    // Two-step sign-in: after the password, an emailed code. Always on for
    // admins; anyone else can switch it on in their settings.
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaCode: {
      type: String,
      select: false,
    },
    mfaCodeExpires: {
      type: Date,
      select: false,
    },
    mfaCodeAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    // Wrong passwords in a row, and the moment a lock ends. Too many wrong
    // guesses lock the account for a while, so a password can't be brute-forced.
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      select: false,
    },

    // Sessions are JWTs, which can't be recalled once issued. Each carries the
    // number below; raising it (log out, password change or reset, ban) makes
    // every older token stop working. See middleware/authMiddleware.js.
    tokenVersion: {
      type: Number,
      default: 0,
    },

    // What the person agreed to when they signed up. Accounts made before this
    // existed have none.
    consent: {
      termsVersion: String,
      acceptedAt: Date,
      // Farmers only: agreed to their ID and farm documents being kept and
      // reviewed by an administrator to verify them.
      documentsConsentAt: Date,
    },
  },
  { timestamps: true, validateModifiedOnly: true }
);

// Whatever ends up in a response, these never do - even if a query selected them.
const PRIVATE_FIELDS = [
  "password",
  "suspensionReason",
  "blockedUsers",
  "tokenVersion",
  "failedLoginAttempts",
  "lockUntil",
  "loginCode",
  "loginCodeExpires",
  "loginCodeAttempts",
  "resetPasswordCode",
  "resetPasswordExpires",
  "resetPasswordAttempts",
  "deleteAccountCode",
  "deleteAccountExpires",
  "deleteAccountAttempts",
  "mfaCode",
  "mfaCodeExpires",
  "mfaCodeAttempts",
];
const hidePrivateFields = (_doc, ret) => {
  PRIVATE_FIELDS.forEach((field) => delete ret[field]);
  return ret;
};
userSchema.set("toJSON", { transform: hidePrivateFields });
userSchema.set("toObject", { transform: hidePrivateFields });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
