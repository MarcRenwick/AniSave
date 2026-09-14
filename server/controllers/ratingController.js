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

module.exports = { createRating };
