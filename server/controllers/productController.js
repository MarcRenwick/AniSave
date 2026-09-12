const asyncHandler = require("express-async-handler");
const Product = require("../models/Product");
const { imagePath, deleteImageFile } = require("../utils/fileUtils");

// @desc    Create a product for the logged-in farmer
// @route   POST /api/products
// @access  Private (farmer)
const createProduct = asyncHandler(async (req, res) => {
  const { title, stock, price, category, location } = req.body;

  if (!title || stock === undefined || price === undefined || !category) {
    res.status(400);
    throw new Error("Title, stock, price and category are required");
  }

  const product = await Product.create({
    farmer: req.user._id,
    title,
    stock,
    price,
    category,
    location,
    image: imagePath(req.file),
  });

  res.status(201).json(product);
});

// @desc    Get the logged-in farmer's products
// @route   GET /api/products/mine
// @access  Private (farmer)
const getMyProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ farmer: req.user._id }).sort({ createdAt: -1 });
  res.json(products);
});

// @desc    Browse all farmers' in-stock products (marketplace)
// @route   GET /api/products
// @access  Public (guests can browse)
const getAllProducts = asyncHandler(async (req, res) => {
  const { category, location, minPrice, maxPrice, farmer } = req.query;

  const filter = { stock: { $gt: 0 } };
  if (category) filter.category = category;
  if (farmer) filter.farmer = farmer;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (location) {
    filter.location = { $regex: location, $options: "i" };
  }

  const products = await Product.find(filter)
    .populate("farmer", "name farmName location rating isVerified")
    .sort({ createdAt: -1 });

  res.json(products);
});

const findOwnedProduct = async (id, farmerId) => {
  const product = await Product.findById(id);
  if (!product) return { error: { status: 404, message: "Product not found" } };
  if (product.farmer.toString() !== farmerId.toString()) {
    return { error: { status: 403, message: "You do not own this product" } };
  }
  return { product };
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (farmer, owner only)
const updateProduct = asyncHandler(async (req, res) => {
  const { product, error } = await findOwnedProduct(req.params.id, req.user._id);
  if (error) {
    res.status(error.status);
    throw new Error(error.message);
  }

  const { title, stock, price, category, location } = req.body;
  if (title !== undefined) product.title = title;
  if (stock !== undefined) product.stock = stock;
  if (price !== undefined) product.price = price;
  if (category !== undefined) product.category = category;
  if (location !== undefined) product.location = location;

  if (req.file) {
    deleteImageFile(product.image);
    product.image = imagePath(req.file);
  }

  await product.save();
  res.json(product);
});

// @desc    Add stock to a product
// @route   PATCH /api/products/:id/restock
// @access  Private (farmer, owner only)
const restockProduct = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error("A positive restock amount is required");
  }

  const { product, error } = await findOwnedProduct(req.params.id, req.user._id);
  if (error) {
    res.status(error.status);
    throw new Error(error.message);
  }

  product.stock += Number(amount);
  await product.save();
  res.json(product);
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (farmer, owner only)
const deleteProduct = asyncHandler(async (req, res) => {
  const { product, error } = await findOwnedProduct(req.params.id, req.user._id);
  if (error) {
    res.status(error.status);
    throw new Error(error.message);
  }

  deleteImageFile(product.image);
  await product.deleteOne();
  res.json({ message: "Product deleted" });
});

module.exports = {
  createProduct,
  getMyProducts,
  getAllProducts,
  updateProduct,
  restockProduct,
  deleteProduct,
};
