const asyncHandler = require("express-async-handler");
const User = require("../models/User");

// @desc    Get a single farmer's public profile
// @route   GET /api/farmers/:id
// @access  Public
const getFarmerProfile = asyncHandler(async (req, res) => {
  const farmer = await User.findOne({ _id: req.params.id, role: "farmer" }).select(
    "name farmName farmDescription location rating certifications isVerified createdAt"
  );

  if (!farmer) {
    res.status(404);
    throw new Error("Farmer not found");
  }

  res.json(farmer);
});

module.exports = { getFarmerProfile };
