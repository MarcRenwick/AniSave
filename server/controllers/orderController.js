const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Rating = require("../models/Rating");

// @desc    Place an order for a product
// @route   POST /api/orders
// @access  Private (buyer)
const createOrder = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity || quantity <= 0) {
    res.status(400);
    throw new Error("A product and a positive quantity are required");
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  if (product.stock < quantity) {
    res.status(400);
    throw new Error(`Only ${product.stock}kg of ${product.title} left in stock`);
  }

  const total = product.price * quantity;

  const order = await Order.create({
    buyer: req.user._id,
    farmer: product.farmer,
    product: product._id,
    productTitle: product.title,
    pricePerKilo: product.price,
    quantity,
    total,
  });

  product.stock -= quantity;
  await product.save();

  res.status(201).json(order);
});

// @desc    Get orders placed on the logged-in farmer's products
// @route   GET /api/orders/farmer
// @access  Private (farmer)
const getFarmerOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ farmer: req.user._id })
    .populate("buyer", "name location")
    .populate("product", "image category location")
    .sort({ createdAt: -1 });
  res.json(orders);
});

// @desc    Get the logged-in buyer's own orders
// @route   GET /api/orders/buyer
// @access  Private (buyer)
const getBuyerOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ buyer: req.user._id })
    .populate("farmer", "name farmName")
    .sort({ createdAt: -1 });

  const ratings = await Rating.find({ order: { $in: orders.map((o) => o._id) } }).select("order");
  const ratedIds = new Set(ratings.map((r) => r.order.toString()));

  res.json(orders.map((o) => ({ ...o.toObject(), rated: ratedIds.has(o._id.toString()) })));
});

// Which status a farmer may move an order into, from its current status.
const ALLOWED_TRANSITIONS = {
  new: ["accepted", "cancelled"],
  accepted: ["ready"],
  ready: ["done"],
};
const TIMESTAMP_FIELD = {
  accepted: "acceptedAt",
  ready: "readyAt",
  done: "doneAt",
  cancelled: "cancelledAt",
};

// @desc    Move an order forward (accept/decline a new order, mark it ready
//          for pickup, or mark it done), one real step at a time
// @route   PATCH /api/orders/:id/status
// @access  Private (farmer, owner only)
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!TIMESTAMP_FIELD[status]) {
    res.status(400);
    throw new Error("Status must be 'accepted', 'ready', 'done' or 'cancelled'");
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.farmer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You do not own this order");
  }

  if (!ALLOWED_TRANSITIONS[order.status]?.includes(status)) {
    res.status(400);
    throw new Error(`This order is '${order.status}' and cannot be moved to '${status}'`);
  }

  order.status = status;
  order[TIMESTAMP_FIELD[status]] = Date.now();
  await order.save();

  if (status === "cancelled") {
    const product = await Product.findById(order.product);
    if (product) {
      product.stock += order.quantity;
      await product.save();
    }
  }

  res.json(order);
});

// @desc    Cancel a buyer's own order, while the farmer hasn't accepted it yet
// @route   PATCH /api/orders/:id/cancel
// @access  Private (buyer, owner only)
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.buyer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You do not own this order");
  }
  if (order.status !== "new") {
    res.status(400);
    throw new Error("This order has already been accepted by the farmer and can no longer be cancelled");
  }

  order.status = "cancelled";
  await order.save();

  const product = await Product.findById(order.product);
  if (product) {
    product.stock += order.quantity;
    await product.save();
  }

  res.json(order);
});

// @desc    Get a single order's detail, for tracking
// @route   GET /api/orders/:id
// @access  Private (the buyer or farmer on that order only)
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("farmer", "name farmName location")
    .populate("buyer", "name location")
    .populate("product", "image category location");

  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }

  const isBuyer = order.buyer._id.toString() === req.user._id.toString();
  const isFarmer = order.farmer._id.toString() === req.user._id.toString();
  if (!isBuyer && !isFarmer) {
    res.status(403);
    throw new Error("You do not have access to this order");
  }

  const myRating = await Rating.findOne({ order: order._id });

  res.json({ ...order.toObject(), myRating });
});

module.exports = {
  createOrder,
  getFarmerOrders,
  getBuyerOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
};
