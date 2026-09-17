const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
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
    location: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
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
    },
    farmDescription: {
      type: String,
      trim: true,
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

    // Set by an admin - a banned user cannot log in
    isBanned: {
      type: Boolean,
      default: false,
    },

    // Stamped (throttled) on authenticated requests, so a seller's profile
    // can show a real "last active" time instead of a made-up one
    lastActiveAt: {
      type: Date,
    },

    resetPasswordCode: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
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
  },
  { timestamps: true, validateModifiedOnly: true }
);

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
