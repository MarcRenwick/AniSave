const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const Product = require("../models/Product");

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
    .populate("buyer", "name")
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
  res.json(orders);
});

// @desc    Update an order's status (new -> ready -> done)
// @route   PATCH /api/orders/:id/status
// @access  Private (farmer, owner only)
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["new", "ready", "done"].includes(status)) {
    res.status(400);
    throw new Error("Status must be 'new', 'ready' or 'done'");
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

  order.status = status;
  await order.save();
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

module.exports = { createOrder, getFarmerOrders, getBuyerOrders, updateOrderStatus, cancelOrder };
