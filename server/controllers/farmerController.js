const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Rating = require("../models/Rating");

// @desc    List farmers for the buyer-facing home page
// @route   GET /api/farmers
// @access  Public
const getFarmers = asyncHandler(async (req, res) => {
  const farmers = await User.find({ role: "farmer" })
    .select("name farmName location rating createdAt")
    .sort({ createdAt: -1 });
  res.json(farmers);
});

// @desc    Get a single farmer's public profile
// @route   GET /api/farmers/:id
// @access  Public
const getFarmerProfile = asyncHandler(async (req, res) => {
  const farmer = await User.findOne({ _id: req.params.id, role: "farmer" }).select(
    "name farmName farmDescription location certifications isVerified createdAt"
  );

  if (!farmer) {
    res.status(404);
    throw new Error("Farmer not found");
  }

  const ratingStats = await Rating.aggregate([
    { $match: { farmer: farmer._id } },
    { $group: { _id: null, avg: { $avg: "$stars" }, count: { $sum: 1 } } },
  ]);

  res.json({
    ...farmer.toObject(),
    rating: ratingStats[0]?.avg || 0,
    ratingCount: ratingStats[0]?.count || 0,
  });
});

module.exports = { getFarmers, getFarmerProfile };
