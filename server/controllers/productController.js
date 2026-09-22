const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const Product = require("../models/Product");
const Crop = require("../models/Crop");
const Order = require("../models/Order");
const Rating = require("../models/Rating");
const ProductInterest = require("../models/ProductInterest");
const { imagePath, deleteImageFile } = require("../utils/fileUtils");
const { effectiveVerificationStatus } = require("../utils/verification");
const { distanceFields, byNearest } = require("../utils/geo");
const { blockedIdsFor, hasBlocked } = require("../utils/blocks");
const validate = require("../utils/validate");
const { recordView, recordSearchHits, forgetProducts } = require("../utils/interest");

// The numbers on a listing, checked before they reach the database. A form
// sends text, and a browser's own number field still lets things like "100e+"
// or "12abc" through - which would be stored as NaN, or as an exponent nobody
// meant to type. Not given at all means "leave this field alone"; blank means
// "clear the sale price".
const listingNumbers = ({ stock, price, salePrice }) => ({
  ...(stock !== undefined ? { stock: validate.wholeNumber(stock, "Available quantity") } : {}),
  ...(price !== undefined ? { price: validate.number(price, "Price") } : {}),
  ...(salePrice !== undefined
    ? { salePrice: validate.number(salePrice, "Flash sale price", { allowBlank: true }) }
    : {}),
});

const MAX_IMAGES = 5;
const PRODUCT_TYPES = ["sale", "preorder"];
const FARMER_FIELDS = "name farmName location rating isVerified isBanned avatar";

// Listings only reach buyers once an admin has approved the farmer behind
// them, so a rejected or still-pending farmer effectively can't sell - and a
// banned or suspended one is out of the marketplace altogether.
const sellable = (product) => Boolean(product.farmer?.isVerified) && !product.farmer?.isBanned;

// multer has already written a request's files to disk by the time the
// request is rejected, so they have to be removed again explicitly.
const discardUploads = (req) =>
  (req.files || []).forEach((file) => deleteImageFile(imagePath(file)));

// A listing names its produce by pointing at a catalogue crop, not by free
// text: the farmer picks from the product selector and what arrives here is
// that crop's id. Anything else - a made-up name, an id that isn't a crop, a
// crop that has been retired - is refused, so no listing can name produce the
// rest of the app doesn't know about.
//
// Returns the crop, so the caller can take the title from it.
async function resolveCrop(cropId) {
  if (!cropId || !mongoose.isValidObjectId(cropId)) {
    const error = new Error("Choose a product from the list");
    error.statusCode = 400;
    throw error;
  }
  const crop = await Crop.findOne({ _id: cropId, active: true }).lean();
  if (!crop) {
    const error = new Error("That product isn't in the list");
    error.statusCode = 400;
    throw error;
  }
  return crop;
}

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

  const { crop: cropId, stock, price, description, productType } = req.body;

  if (stock === undefined || price === undefined) {
    discardUploads(req);
    res.status(400);
    throw new Error("Product, stock and price are required");
  }
  if (productType !== undefined && !PRODUCT_TYPES.includes(productType)) {
    discardUploads(req);
    res.status(400);
    throw new Error("Product type must be 'sale' or 'preorder'");
  }

  let numbers;
  let crop;
  try {
    crop = await resolveCrop(cropId);
    numbers = listingNumbers(req.body);
  } catch (err) {
    discardUploads(req);
    throw err;
  }

  const images = (req.files || []).map(imagePath);
  if (images.length === 0) {
    res.status(400);
    throw new Error("Add at least one photo of the product");
  }

  try {
    const product = await Product.create({
      farmer: req.user._id,
      crop: crop._id,
      // Always the catalogue's own name for the crop, never text a farmer
      // typed - which is what makes a listing's produce identifiable.
      title: crop.name,
      ...numbers,
      salePrice: numbers.salePrice ?? null,
      // The crop decides which of the two buyer-facing categories the listing
      // belongs in, so a mango can't end up filed under vegetables.
      category: crop.listingCategory,
      // Buyers collect from the farm, so a listing's address always follows
      // the farmer's registered address rather than being typed per product.
      location: req.user.location,
      description,
      productType,
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
    { $match: { farmer: req.user._id, removedAt: null } },
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

  // What buyers search for is demand, whether or not it ends in a sale, so
  // the listings a search actually turned up are counted on the way out.
  // Every answer below goes through here, so no route misses it.
  const answer = (list) => {
    if (search) recordSearchHits(list, req);
    return res.json(list);
  };

  // Browsing hides listings nobody can order right now: a sold-out For Sale
  // item. A pre-order listing is orderable at any stock level, and a
  // farmer's own shop page lists the whole catalogue regardless.
  const filter = {};
  if (includeOutOfStock !== "true") {
    filter.$or = [{ stock: { $gt: 0 } }, { productType: "preorder" }];
  }
  if (category) filter.category = category;

  // Nothing from a shop this buyer has blocked reaches them: not while
  // browsing, not in a search, not in any of the sorts below, and not on the
  // shop's own page - which asks for one farmer by id and gets nothing back.
  if (farmer) {
    if (hasBlocked(req.user, farmer)) return res.json([]);
    filter.farmer = new mongoose.Types.ObjectId(farmer);
  } else {
    const blocked = blockedIdsFor(req.user);
    if (blocked.length > 0) filter.farmer = { $nin: blocked };
  }

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
    // What this buyer has bought before is recommended back to them, ahead of
    // everything else: the thing they liked enough to buy is the easiest one
    // to suggest. A guest, or a farmer looking at a shop, has no history here,
    // so for them the list stays the well-reviewed listings alone.
    const boughtBefore =
      req.user?.role === "buyer"
        ? await Order.distinct("product", { buyer: req.user._id, status: { $ne: "cancelled" } })
        : [];

    const products = await Product.aggregate([
      { $match: filter },
      {
        // Reviews an admin has taken down don't count towards the ranking.
        $lookup: {
          from: "ratings",
          let: { productId: "$_id" },
          pipeline: [{ $match: { $expr: { $eq: ["$product", "$$productId"] }, removedAt: null } }],
          as: "ratings",
        },
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
          boughtBefore: { $in: ["$_id", boughtBefore] },
        },
      },
      // Either the buyer has bought it before, or it is genuinely well
      // reviewed. A product with neither - no ratings, and never ordered by
      // this buyer - is left out rather than just ranked last.
      { $match: { $or: [{ boughtBefore: true }, { avgRating: { $gte: 4 } }] } },
      { $sort: { boughtBefore: -1, avgRating: -1, totalSold: -1, createdAt: -1 } },
      { $project: { ratings: 0, orders: 0 } },
    ]);

    await Product.populate(products, { path: "farmer", select: FARMER_FIELDS });

    return answer(products.filter(sellable));
  }

  // "Nearest" ranks by how far each farmer's registered address is from the
  // viewer's own - real distances in km, not a text match on the town name.
  // The farmers' coordinates are used here and then dropped, so all a client
  // gets back is the distance. Without a registered address for the viewer
  // there's nothing to measure from, so the list comes back in its usual order.
  if (sort === "nearest") {
    const found = await Product.find(filter)
      .populate("farmer", `${FARMER_FIELDS} address`)
      .sort({ createdAt: -1 });

    const origin = req.user?.address;
    const products = found.filter(sellable).map((product) => {
      const { address, ...farmer } = product.farmer.toObject();
      return {
        ...product.toObject(),
        farmer: {
          ...farmer,
          city: address?.city,
          province: address?.province,
          ...distanceFields(origin, address),
        },
      };
    });

    products.sort(byNearest((p) => p.farmer.distanceKm));
    return answer(products);
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

    return answer(products.filter(sellable));
  }

  const products = await Product.find(filter)
    .populate("farmer", FARMER_FIELDS)
    .sort({ createdAt: -1 });

  answer(products.filter(sellable));
});

// @desc    Get a single product's public detail
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate("farmer", FARMER_FIELDS)
    // So the edit form can show which catalogue product the listing is of,
    // rather than having to look it up again by name.
    .populate("crop", "name group listingCategory priceSupported");

  // A suspended farmer's listings aren't reachable, even by a direct link -
  // and neither are a shop's listings for a buyer who blocked it.
  if (!product || product.farmer?.isBanned || hasBlocked(req.user, product.farmer?._id)) {
    res.status(404);
    throw new Error("Product not found");
  }

  // A cancelled order never left the farm, so it doesn't count as sold.
  const sales = await Order.aggregate([
    { $match: { product: product._id, status: { $ne: "cancelled" } } },
    { $group: { _id: null, totalSold: { $sum: "$quantity" } } },
  ]);

  const ratingStats = await Rating.aggregate([
    { $match: { product: product._id, removedAt: null } },
    { $group: { _id: null, avg: { $avg: "$stars" }, count: { $sum: 1 } } },
  ]);

  // A buyer opening a listing is interest in that crop, counted for the
  // farmer's dashboard. A farmer checking their own listing is not.
  //
  // Only the page that IS the buyer opening it asks for the count. Plenty of
  // other things load a product - the ratings page, a report form, the
  // checkout, the farmer's own editor - and none of them is a fresh look at
  // the listing. Nor is stepping back to it from any of those: the browser is
  // returning to a page the buyer already opened, not opening it again.
  if (req.query.opened === "true") recordView(product, req);

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

  const { crop: cropId, description, productType, imageOrder } = req.body;

  if (productType !== undefined && !PRODUCT_TYPES.includes(productType)) {
    discardUploads(req);
    res.status(400);
    throw new Error("Product type must be 'sale' or 'preorder'");
  }

  let numbers;
  let crop = null;
  try {
    // Only when the request names a crop: a partial update that doesn't
    // mention one (restocking, reordering photos) leaves the listing's produce
    // exactly as it was, including on a listing made before the catalogue
    // existed.
    if (cropId !== undefined) crop = await resolveCrop(cropId);
    numbers = listingNumbers(req.body);
  } catch (err) {
    discardUploads(req);
    throw err;
  }

  if (crop) {
    product.crop = crop._id;
    product.title = crop.name;
    product.category = crop.listingCategory;
  }
  if (numbers.stock !== undefined) product.stock = numbers.stock;
  if (numbers.price !== undefined) product.price = numbers.price;
  if (description !== undefined) product.description = description;
  if (productType !== undefined) product.productType = productType;
  // A blank field from the form means "clear the sale", not "leave it alone" -
  // unlike the fields above, omitting this one entirely is what leaves it be.
  if (numbers.salePrice !== undefined) product.salePrice = numbers.salePrice;
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
  const amount = validate.wholeNumber(req.body.amount, "Restock amount");
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
  // A listing that is gone shouldn't keep its place in the demand ranking.
  await forgetProducts([product._id]);
  photos.forEach(deleteImageFile);
  res.json({ message: "Product deleted" });
});

// @desc    What buyers are looking for most: the crops searched for and opened
//          the most across the marketplace, by name. Nothing here comes from
//          sales - a crop everyone searches for and nobody has bought yet is
//          exactly what a farmer wants to know about.
// @route   GET /api/products/top-searched
// @access  Private (farmer)
const getTopSearched = asyncHandler(async (req, res) => {
  const rows = await ProductInterest.aggregate([
    // The same crop listed by several farmers is one crop to a buyer, so the
    // counts are added up by name rather than by listing.
    {
      $group: {
        _id: { $toLower: "$title" },
        title: { $first: "$title" },
        searches: { $sum: "$searches" },
        views: { $sum: "$views" },
        lastAt: { $max: "$lastAt" },
      },
    },
    { $addFields: { count: { $add: ["$searches", "$views"] } } },
    { $match: { count: { $gt: 0 } } },
    { $sort: { count: -1, lastAt: -1 } },
    { $limit: 5 },
  ]);

  res.json(
    rows.map(({ title, searches, views, count }) => ({ title, searches, views, count }))
  );
});

module.exports = {
  createProduct,
  getMyProducts,
  getAllProducts,
  getProductById,
  getTopSearched,
  updateProduct,
  restockProduct,
  deleteProduct,
};
