const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const { hasBlocked } = require("../utils/blocks");

// All the Blocked Users list needs to show a shop the buyer wants nothing to
// do with. No phone number, no description: blocking is the opposite of
// getting in touch.
const BLOCKED_FIELDS = "name farmName location avatar";
const card = ({ _id, name, farmName, location, avatar }) => ({
  _id,
  name,
  farmName,
  location,
  avatar,
});

// A list that can only grow is a list that can be used to fill a database, so
// it has a ceiling. Nobody blocks a hundred shops by accident.
const MAX_BLOCKED = 100;

// @desc    The shops this buyer has blocked, most recently blocked first
// @route   GET /api/blocks
// @access  Private (buyer)
const getBlockedUsers = asyncHandler(async (req, res) => {
  const blockedIds = req.user.blockedUsers || [];
  const blocked = await User.find({ _id: { $in: blockedIds } })
    .select(BLOCKED_FIELDS)
    .lean();

  // Mongo returns them in its own order; the buyer wants the one they just
  // blocked at the top, so they are put back in the order they were blocked in.
  const position = new Map(blockedIds.map((id, index) => [id.toString(), index]));
  blocked.sort((a, b) => position.get(b._id.toString()) - position.get(a._id.toString()));

  res.json(blocked.map(card));
});

// @desc    Block a farmer's shop
// @route   POST /api/blocks/:id
// @access  Private (buyer)
const blockUser = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error("Farmer not found");
  }

  // Only a farmer's shop can be blocked - there is nothing for a buyer to
  // block about another buyer, and an admin can't be hidden from.
  const farmer = await User.findOne({ _id: req.params.id, role: "farmer" }).select(BLOCKED_FIELDS);
  if (!farmer) {
    res.status(404);
    throw new Error("Farmer not found");
  }

  // Blocking someone already blocked isn't an error, it just changes nothing.
  if (!hasBlocked(req.user, farmer._id)) {
    if ((req.user.blockedUsers || []).length >= MAX_BLOCKED) {
      res.status(400);
      throw new Error(`You can block up to ${MAX_BLOCKED} shops. Unblock one first.`);
    }
    await User.updateOne({ _id: req.user._id }, { $addToSet: { blockedUsers: farmer._id } });
  }

  res.json({ blocked: true, farmer: card(farmer) });
});

// @desc    Unblock a farmer's shop
// @route   DELETE /api/blocks/:id
// @access  Private (buyer)
const unblockUser = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error("Farmer not found");
  }

  // Unlike blocking, this doesn't insist the account still exists: a buyer
  // must always be able to clear their own list, even of a shop that has since
  // been deleted.
  await User.updateOne({ _id: req.user._id }, { $pull: { blockedUsers: req.params.id } });

  res.json({ blocked: false });
});

module.exports = { getBlockedUsers, blockUser, unblockUser, MAX_BLOCKED };
