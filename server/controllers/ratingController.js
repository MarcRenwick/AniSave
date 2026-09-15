const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const Rating = require("../models/Rating");

// @desc    Rate a completed order's product
// @route   POST /api/ratings
// @access  Private (buyer, owner of the order only)
const createRating = asyncHandler(async (req, res) => {
  const { orderId, stars, comment } = req.body;

  if (!orderId || !stars) {
    res.status(400);
    throw new Error("An order and a star rating are required");
  }
  if (stars < 1 || stars > 5) {
    res.status(400);
    throw new Error("Rating must be between 1 and 5 stars");
  }

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.buyer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You do not own this order");
  }
  if (order.status !== "done") {
    res.status(400);
    throw new Error("You can only rate an order once it has been completed");
  }

  const existing = await Rating.findOne({ order: order._id });
  if (existing) {
    res.status(400);
    throw new Error("You have already rated this order");
  }

  const rating = await Rating.create({
    order: order._id,
    product: order.product,
    buyer: req.user._id,
    farmer: order.farmer,
    stars,
    comment,
  });

  res.status(201).json(rating);
});

// @desc    List a product's ratings, newest first
// @route   GET /api/ratings/product/:productId
// @access  Public (a signed-in viewer also learns which reviews they liked)
const getProductRatings = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.productId)) {
    res.status(404);
    throw new Error("Product not found");
  }

  const ratings = await Rating.find({ product: req.params.productId })
    .populate("buyer", "name")
    .sort({ createdAt: -1 });

  const viewerId = req.user?._id?.toString();

  res.json(
    ratings.map((r) => ({
      _id: r._id,
      stars: r.stars,
      comment: r.comment,
      createdAt: r.createdAt,
      // The reviewer's display name, not their username - that's also their
      // login handle, and shouldn't be published on every review.
      buyerName: r.buyer?.name || "AniSave buyer",
      isMine: Boolean(viewerId) && r.buyer?._id?.toString() === viewerId,
      likeCount: r.likes.length,
      likedByMe: Boolean(viewerId) && r.likes.some((id) => id.toString() === viewerId),
    }))
  );
});

// @desc    Mark a review helpful, or take that back
// @route   POST /api/ratings/:id/like
// @access  Private (buyer)
const toggleRatingLike = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404);
    throw new Error("Rating not found");
  }

  const rating = await Rating.findById(req.params.id);
  if (!rating) {
    res.status(404);
    throw new Error("Rating not found");
  }
  if (rating.buyer.equals(req.user._id)) {
    res.status(400);
    throw new Error("You can't mark your own review as helpful");
  }

  const liked = rating.likes.some((id) => id.equals(req.user._id));
  const updated = await Rating.findByIdAndUpdate(
    rating._id,
    liked ? { $pull: { likes: req.user._id } } : { $addToSet: { likes: req.user._id } },
    { new: true }
  );

  res.json({ likeCount: updated.likes.length, likedByMe: !liked });
});

module.exports = { createRating, getProductRatings, toggleRatingLike };
