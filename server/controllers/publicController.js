const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const Product = require("../models/Product");
const Rating = require("../models/Rating");

// What the public landing page shows about AniSave: how many farmers,
// listings, buyers and towns there are, and a few real reviews. Counts only -
// nobody's details - and the reviews are ones already public on their
// product's ratings page, shown here by first name, with the farm and its
// town rather than anything about where the buyer lives.

// Worked out at most this often; the landing page is the busiest page there
// is, and none of this needs to be to the second.
const CACHE_MS = 10 * 60 * 1000;
const REVIEWS = 12;
const COMMENT_MAX = 220;
let cached = null;

const firstName = (name = "") => name.trim().split(/\s+/)[0] || "A buyer";
// A review worth putting on the front page says something: at least three real
// words, not a test like "hghghggh". (Every review still shows on its
// product's own ratings page as before - this only picks which are featured.)
const MIN_WORDS = 3;
const saysSomething = (comment = "") =>
  comment
    .trim()
    .split(/\s+/)
    .filter((word) => /\p{L}{2,}/u.test(word)).length >= MIN_WORDS;
const shorten = (text) => (text.length > COMMENT_MAX ? `${text.slice(0, COMMENT_MAX - 1).trimEnd()}…` : text);

async function overview() {
  // A farmer an admin has approved, who isn't suspended or banned - the ones
  // whose listings buyers can see.
  const sellers = { role: "farmer", isVerified: true, isBanned: { $ne: true } };
  const farmerIds = await User.distinct("_id", sellers);
  const [farmers, products, buyers, towns, ratings] = await Promise.all([
    farmerIds.length,
    // What a buyer could order right now: in stock, or open for pre-order.
    Product.countDocuments({ farmer: { $in: farmerIds }, $or: [{ stock: { $gt: 0 } }, { productType: "preorder" }] }),
    User.countDocuments({ role: "buyer", isBanned: { $ne: true } }),
    User.distinct("address.cityCode", { ...sellers, "address.cityCode": { $nin: [null, ""] } }),
    Rating.find({ removedAt: null, stars: { $gte: 4 }, comment: { $regex: /\S/ } })
      .sort({ createdAt: -1 })
      .limit(REVIEWS * 3)
      .populate("buyer", "name isBanned")
      .populate("farmer", "name farmName address.city isBanned isVerified")
      .populate("product", "title")
      .lean(),
  ]);

  const reviews = ratings
    .filter((r) => r.buyer && !r.buyer.isBanned && r.farmer && !r.farmer.isBanned && r.farmer.isVerified && r.product)
    .filter((r) => saysSomething(r.comment))
    .slice(0, REVIEWS)
    .map((r) => ({
      _id: r._id,
      name: firstName(r.buyer.name),
      stars: r.stars,
      comment: shorten(r.comment.trim()),
      product: r.product.title,
      farm: r.farmer.farmName || r.farmer.name,
      town: r.farmer.address?.city || null,
    }));

  return { farmers, products, buyers, municipalities: towns.length, reviews };
}

// @desc    Counts and a few reviews for the landing page
// @route   GET /api/public/overview
// @access  Public
const getOverview = asyncHandler(async (req, res) => {
  if (!cached || Date.now() - cached.at > CACHE_MS) {
    cached = { at: Date.now(), data: await overview() };
  }
  res.set("Cache-Control", "public, max-age=300");
  res.json(cached.data);
});

module.exports = { getOverview };
