const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Rating = require("../models/Rating");
const { imagePath, deleteImageFile } = require("../utils/fileUtils");
const { effectiveVerificationStatus } = require("../utils/verification");

// A blank string means "clear the sale"; anything else becomes a number for
// the model's own less-than-price validation to check.
const parseSalePrice = (value) => (value === undefined || value === "" ? null : Number(value));

const MAX_IMAGES = 5;
const PRODUCT_TYPES = ["sale", "preorder"];
const FARMER_FIELDS = "name farmName location rating isVerified avatar";

// Listings only reach buyers once an admin has approved the farmer behind
// them, so a rejected or still-pending farmer effectively can't sell.
const sellable = (product) => Boolean(product.farmer?.isVerified);

// multer has already written a request's files to disk by the time the
// request is rejected, so they have to be removed again explicitly.
const discardUploads = (req) =>
  (req.files || []).forEach((file) => deleteImageFile(imagePath(file)));

// @desc    Create a product for the logged-in farmer
// @route   POST /api/products
// @access  Private (farmer)
const createProduct = asyncHandler(async (req, res) => {
  // The end of the verification flow: only an approved farmer can sell.
  if (!req.user.isVerified) {
    discardUploads(req);
    res.status(403);
    throw new Error(
      effectiveVerificationStatus(req.user) === "rejected"
        ? "Your verification was rejected. Update your documents and resubmit before listing products."
        : "Your account is still being verified. You can list products once an admin approves it."
    );
  }

  const { title, stock, price, category, description, productType, salePrice } = req.body;

  if (!title || stock === undefined || price === undefined || !category) {
    discardUploads(req);
    res.status(400);
    throw new Error("Title, stock, price and category are required");
  }
  if (productType !== undefined && !PRODUCT_TYPES.includes(productType)) {
    discardUploads(req);
    res.status(400);
    throw new Error("Product type must be 'sale' or 'preorder'");
  }

  const images = (req.files || []).map(imagePath);
  if (images.length === 0) {
    res.status(400);
    throw new Error("Add at least one photo of the product");
  }

  try {
    const product = await Product.create({
      farmer: req.user._id,
      title,
      stock,
      price,
      category,
      // Buyers collect from the farm, so a listing's address always follows
      // the farmer's registered address rather than being typed per product.
      location: req.user.location,
      description,
      productType,
      salePrice: parseSalePrice(salePrice),
      images,
      image: images[0],
    });
    res.status(201).json(product);
  } catch (err) {
    discardUploads(req);
    throw err;
  }
});

// @desc    Get the logged-in farmer's products
// @route   GET /api/products/mine
// @access  Private (farmer)
const getMyProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ farmer: req.user._id }).sort({ createdAt: -1 });

  const ratingStats = await Rating.aggregate([
    { $match: { farmer: req.user._id } },
    { $group: { _id: "$product", avg: { $avg: "$stars" }, count: { $sum: 1 } } },
  ]);
  const statsByProduct = new Map(ratingStats.map((s) => [s._id.toString(), s]));

  res.json(
    products.map((p) => {
      const stats = statsByProduct.get(p._id.toString());
      return { ...p.toObject(), rating: stats?.avg || 0, ratingCount: stats?.count || 0 };
    })
  );
});

// @desc    Browse all farmers' orderable products (marketplace)
// @route   GET /api/products
// @access  Public (guests can browse)
const getAllProducts = asyncHandler(async (req, res) => {
  const { category, location, minPrice, maxPrice, farmer, search, sort, includeOutOfStock } =
    req.query;

  // Browsing hides listings nobody can order right now: a sold-out For Sale
  // item. A pre-order listing is orderable at any stock level, and a
  // farmer's own shop page lists the whole catalogue regardless.
  const filter = {};
  if (includeOutOfStock !== "true") {
    filter.$or = [{ stock: { $gt: 0 } }, { productType: "preorder" }];
  }
  if (category) filter.category = category;
  if (farmer) filter.farmer = new mongoose.Types.ObjectId(farmer);
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  if (location) {
    filter.location = { $regex: location, $options: "i" };
  }
  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }

  // "Recommended" ranks by real signals - average rating, then units sold -
  // instead of just recency, so it needs to aggregate in the Rating/Order
  // data rather than a plain find().sort().
  if (sort === "recommended") {
    const products = await Product.aggregate([
      { $match: filter },
      {
        $lookup: { from: "ratings", localField: "_id", foreignField: "product", as: "ratings" },
      },
      {
        $lookup: {
          from: "orders",
          let: { productId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$product", "$$productId"] }, status: { $ne: "cancelled" } } },
          ],
          as: "orders",
        },
      },
      {
        $addFields: {
          avgRating: { $ifNull: [{ $avg: "$ratings.stars" }, 0] },
          totalSold: { $sum: "$orders.quantity" },
        },
      },
      // Only genuinely well-reviewed products count as "recommended" - a
      // product with no ratings (and therefore no completed sales, since a
      // rating requires one) is excluded rather than just ranked last.
      { $match: { avgRating: { $gte: 4 } } },
      { $sort: { avgRating: -1, totalSold: -1, createdAt: -1 } },
      { $project: { ratings: 0, orders: 0 } },
    ]);

    await Product.populate(products, { path: "farmer", select: FARMER_FIELDS });

    return res.json(products.filter(sellable));
  }

  // Flash Sale listings: whatever the farmer has discounted, biggest
  // discount first. Sorting by percentage off needs it computed in the
  // aggregation, since Mongo can't sort by an expression directly.
  if (sort === "flash-sale") {
    const products = await Product.aggregate([
      { $match: { ...filter, salePrice: { $ne: null }, $expr: { $lt: ["$salePrice", "$price"] } } },
      {
        $addFields: {
          discountPct: {
            $multiply: [{ $divide: [{ $subtract: ["$price", "$salePrice"] }, "$price"] }, 100],
          },
        },
      },
      { $sort: { discountPct: -1, createdAt: -1 } },
    ]);

    await Product.populate(products, { path: "farmer", select: FARMER_FIELDS });

    return res.json(products.filter(sellable));
  }

  const products = await Product.find(filter)
    .populate("farmer", FARMER_FIELDS)
    .sort({ createdAt: -1 });

  res.json(products.filter(sellable));
});

// @desc    Get a single product's public detail
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate("farmer", FARMER_FIELDS);

  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  // A cancelled order never left the farm, so it doesn't count as sold.
  const sales = await Order.aggregate([
    { $match: { product: product._id, status: { $ne: "cancelled" } } },
    { $group: { _id: null, totalSold: { $sum: "$quantity" } } },
  ]);

  const ratingStats = await Rating.aggregate([
    { $match: { product: product._id } },
    { $group: { _id: null, avg: { $avg: "$stars" }, count: { $sum: 1 } } },
  ]);

  res.json({
    ...product.toObject(),
    sold: sales[0]?.totalSold || 0,
    rating: ratingStats[0]?.avg || 0,
    ratingCount: ratingStats[0]?.count || 0,
  });
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
    discardUploads(req);
    res.status(error.status);
    throw new Error(error.message);
  }

  const { title, stock, price, category, description, productType, imageOrder, salePrice } =
    req.body;

  if (productType !== undefined && !PRODUCT_TYPES.includes(productType)) {
    discardUploads(req);
    res.status(400);
    throw new Error("Product type must be 'sale' or 'preorder'");
  }

  if (title !== undefined) product.title = title;
  if (stock !== undefined) product.stock = stock;
  if (price !== undefined) product.price = price;
  if (category !== undefined) product.category = category;
  if (description !== undefined) product.description = description;
  if (productType !== undefined) product.productType = productType;
  // A blank field from the form means "clear the sale", not "leave it alone" -
  // unlike the fields above, omitting this one entirely is what leaves it be.
  if (salePrice !== undefined) product.salePrice = parseSalePrice(salePrice);
  // Re-follows the farmer's registered address, so editing a listing also
  // brings it up to date if they've since moved.
  product.location = req.user.location;

  const uploaded = (req.files || []).map(imagePath);
  let removedImages = [];

  if (imageOrder === undefined) {
    discardUploads(req);
  } else {
    let slots;
    try {
      slots = JSON.parse(imageOrder);
    } catch {
      slots = null;
    }
    if (!Array.isArray(slots)) {
      discardUploads(req);
      res.status(400);
      throw new Error("imageOrder must be a JSON array");
    }

    // Each slot is either a photo the product already has, or "new" for the
    // next uploaded file - so a farmer can replace, drop or reorder photos
    // and whichever lands first becomes the cover.
    const current = product.images.length > 0 ? product.images : [product.image].filter(Boolean);
    let nextUpload = 0;
    const resolved = [];
    for (const slot of slots) {
      if (slot === "new") {
        if (nextUpload < uploaded.length) resolved.push(uploaded[nextUpload++]);
      } else if (current.includes(slot)) {
        // Only a photo this product already owns can be kept, so an edit
        // can't point the listing at some other file on the server.
        resolved.push(slot);
      }
    }
    const images = [...new Set(resolved)].slice(0, MAX_IMAGES);

    if (images.length === 0) {
      discardUploads(req);
      res.status(400);
      throw new Error("A product needs at least one photo");
    }

    uploaded.filter((p) => !images.includes(p)).forEach(deleteImageFile);
    removedImages = current.filter((p) => !images.includes(p));
    product.images = images;
    product.image = images[0];
  }

  try {
    await product.save();
  } catch (err) {
    uploaded.filter((p) => product.images.includes(p)).forEach(deleteImageFile);
    throw err;
  }

  // Old photos only come off disk once the listing no longer points at them.
  removedImages.forEach(deleteImageFile);
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

  const photos = new Set([...product.images, product.image].filter(Boolean));
  await product.deleteOne();
  photos.forEach(deleteImageFile);
  res.json({ message: "Product deleted" });
});

module.exports = {
  createProduct,
  getMyProducts,
  getAllProducts,
  getProductById,
  updateProduct,
  restockProduct,
  deleteProduct,
};
