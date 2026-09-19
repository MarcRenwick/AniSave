const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Rating = require("../models/Rating");
const Product = require("../models/Product");
const { distanceFields, byNearest } = require("../utils/geo");

// A farmer's coordinates stay on the server: what goes out is the town they're
// in and how far that is from the signed-in viewer, nothing that pins them down.
const publicPlace = (address) => ({ city: address?.city, province: address?.province });

// @desc    List farmers for the buyer-facing home page. Send ?sort=nearest as a
//          signed-in user with a registered address to get them nearest first,
//          each with its distance in km.
// @route   GET /api/farmers
// @access  Public (distances need a signed-in viewer)
const getFarmers = asyncHandler(async (req, res) => {
  // Only farmers an admin has approved can sell, so only they are worth listing.
  const found = await User.find({ role: "farmer", isVerified: true })
    .select("name farmName location rating createdAt address")
    .sort({ createdAt: -1 })
    .lean();

  const origin = req.user?.address;
  const farmers = found.map(({ address, ...farmer }) => ({
    ...farmer,
    ...publicPlace(address),
    ...distanceFields(origin, address),
  }));

  if (req.query.sort === "nearest") farmers.sort(byNearest((f) => f.distanceKm));

  res.json(farmers);
});

// @desc    Get a single farmer's public profile (with the distance from a
//          signed-in viewer who has a registered address)
// @route   GET /api/farmers/:id
// @access  Public
const getFarmerProfile = asyncHandler(async (req, res) => {
  // A farmer's phone number is only shown to someone signed in - the page is
  // public, and a public number is one anybody can collect.
  const farmer = await User.findOne({ _id: req.params.id, role: "farmer" }).select(
    `name farmName farmDescription location certifications isVerified createdAt lastActiveAt avatar address${req.user ? " phone" : ""}`
  );

  if (!farmer) {
    res.status(404);
    throw new Error("Farmer not found");
  }

  const ratingStats = await Rating.aggregate([
    { $match: { farmer: farmer._id } },
    { $group: { _id: null, avg: { $avg: "$stars" }, count: { $sum: 1 } } },
  ]);

  const productCount = await Product.countDocuments({ farmer: farmer._id });

  const { address, ...profile } = farmer.toObject();

  res.json({
    ...profile,
    ...publicPlace(address),
    ...distanceFields(req.user?.address, address),
    rating: ratingStats[0]?.avg || 0,
    ratingCount: ratingStats[0]?.count || 0,
    productCount,
  });
});

module.exports = { getFarmers, getFarmerProfile };
