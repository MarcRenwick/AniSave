const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const { tookStock, PROMISED } = Order;
const Product = require("../models/Product");
const Rating = require("../models/Rating");
const { effectivePrice } = require("../utils/pricing");
const { hasBlocked } = require("../utils/blocks");
const { unitOf, amountOf } = require("../utils/units");
const { postOrderUpdate, retractOrderUpdate } = require("./chatController");
const { orderChanged, productChanged } = require("../utils/liveUpdates");

// A completed order takes its quantity off the listing's stock, and a declined
// or cancelled one can give some back (see giveStockBack) - either way buyers'
// marketplaces are told the listing changed.
const STOCK_MOVES = ["done", "cancelled"];

// Every reply about a single order sends the whole order: the buyer, the
// farmer and the product it is for, not just their ids. A status change that
// answered with the bare row left the page holding an order whose buyer and
// product were ids, which is how a freshly accepted order came to show
// "Unknown buyer" and no photo.
const withDetails = (id) =>
  Order.findById(id)
    .populate("farmer", "name farmName location phone")
    .populate("buyer", "name location phone")
    .populate("product", "image category location");

// @desc    Place an order for a product
// @route   POST /api/orders
// @access  Private (buyer)
const createOrder = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity || quantity <= 0) {
    res.status(400);
    throw new Error("A product and a positive quantity are required");
  }

  const product = await Product.findById(productId).populate("farmer", "isVerified isBanned");
  if (!product || product.farmer?.isBanned) {
    res.status(404);
    throw new Error("Product not found");
  }

  // Closes the direct-link route around browsing: an unapproved farmer can't
  // take orders even if a buyer reaches one of their listings.
  if (!product.farmer?.isVerified) {
    res.status(403);
    throw new Error("This farmer isn't verified yet, so their products can't be ordered.");
  }

  // The other half of blocking: a blocked shop can't sell to this buyer,
  // however they reached the listing - a cart filled before the block, a
  // bookmark, or a request made outside the app altogether. Orders already
  // placed are left alone; blocking stops what comes next, it doesn't undo
  // what the two of them already agreed.
  if (hasBlocked(req.user, product.farmer._id)) {
    res.status(403);
    throw new Error(
      "You blocked this shop, so you can't order from them. Unblock them under Profile > Blocked Users first."
    );
  }

  // Only a listing the farmer put up For Pre-Order takes pre-orders - an
  // ordinary listing still needs the stock to actually be there.
  const isPreOrder = product.productType === "preorder";
  const unit = unitOf(product.category);
  // Eggs go by the whole tray.
  if (unit === "tray" && !Number.isInteger(Number(quantity))) {
    res.status(400);
    throw new Error("Eggs are sold by the whole tray");
  }
  // Stock only goes down when an order is completed, so what can still be
  // ordered is the stock less what the farmer has already accepted.
  if (!isPreOrder) {
    const free = product.stock - (await promisedOf(product._id));
    if (free < quantity) {
      res.status(400);
      throw new Error(
        free <= 0
          ? `${product.title} is all promised to other buyers right now`
          : `Only ${amountOf(free, unit)} of ${product.title} left in stock`
      );
    }
  }

  // Charges whatever price is live on the product right now - the sale price
  // during an active Flash Sale - rather than trusting anything the buyer's
  // cart sent.
  const pricePerKilo = effectivePrice(product);
  const total = pricePerKilo * quantity;

  const order = await Order.create({
    buyer: req.user._id,
    farmer: product.farmer._id,
    product: product._id,
    productTitle: product.title,
    pricePerKilo,
    quantity,
    unit,
    total,
    status: isPreOrder ? "preorder" : "new",
    openedAs: isPreOrder ? "preorder" : "new",
    // Taken off the stock when the order is completed, not before.
    stockTaken: false,
  });

  // The farmer's order list, dashboard and bell pick it up straight away.
  orderChanged(order, { action: "placed", by: "buyer", buyerName: req.user.name });

  res.status(201).json(order);
});

// @desc    Get orders placed on the logged-in farmer's products
// @route   GET /api/orders/farmer
// @access  Private (farmer)
const getFarmerOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ farmer: req.user._id })
    .populate("buyer", "name location phone")
    .populate("product", "image category location")
    .sort({ createdAt: -1 });
  res.json(orders);
});

// The farmer's completed sales, added up for the dashboard's Analytical
// Demands charts. A sale is dated by when the farmer completed it (or when it
// was placed, for orders from before that was recorded), the same as every
// other sales figure on the dashboard.
const SOLD_AT = { $ifNull: ["$doneAt", "$createdAt"] };
// How a moment is written down for each bucket size - in the farmer's own
// time zone, since "Monday" or "September 3" means their day, not the
// server's.
const BUCKET_FORMAT = { hour: "%Y-%m-%dT%H", day: "%Y-%m-%d", month: "%Y-%m" };
// Four years either way is more than any chart asks for, and stops a request
// from making the database add up everything since 1970.
const MAX_SPAN_MS = 4 * 366 * 24 * 60 * 60 * 1000;

const isTimeZone = (tz) => {
  if (typeof tz !== "string" || !/^[A-Za-z0-9_+\-/]{1,64}$/.test(tz)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// Kilos and trays (eggs) are added up apart - a tray isn't a kilo.
const IS_TRAY = { $eq: ["$unit", "tray"] };
const KILOS = { $sum: { $cond: [IS_TRAY, 0, "$quantity"] } };
const TRAYS = { $sum: { $cond: [IS_TRAY, "$quantity", 0] } };

const addUp = (key) => ({
  $group: {
    _id: key,
    revenue: { $sum: "$total" },
    kg: KILOS,
    trays: TRAYS,
    orders: { $sum: 1 },
  },
});
const rounded = (rows) =>
  rows.map(({ _id, revenue, kg, trays, orders }) => ({
    key: _id,
    revenue: Math.round(revenue * 100) / 100,
    kg: Math.round(kg * 100) / 100,
    trays,
    orders,
  }));

// @desc    The farmer's completed sales over a period, and the period before,
//          added up per hour, day or month, per day (both periods), and per
//          product
// @route   GET /api/orders/farmer/analytics?from=&to=&prevFrom=&granularity=&tz=
// @access  Private (farmer)
const getFarmerAnalytics = asyncHandler(async (req, res) => {
  const from = new Date(req.query.from);
  const to = new Date(req.query.to);
  const prevFrom = new Date(req.query.prevFrom);
  const granularity = req.query.granularity;
  if ([from, to, prevFrom].some((d) => Number.isNaN(d.getTime())) || !(prevFrom <= from && from < to)) {
    res.status(400);
    throw new Error("Choose a valid period");
  }
  if (to - from > MAX_SPAN_MS || from - prevFrom > MAX_SPAN_MS) {
    res.status(400);
    throw new Error("That period is too long");
  }
  if (!BUCKET_FORMAT[granularity]) {
    res.status(400);
    throw new Error("Choose hour, day or month");
  }
  const timezone = isTimeZone(req.query.tz) ? req.query.tz : "Asia/Manila";
  const bucket = (format) => ({ $dateToString: { format, date: "$soldAt", timezone } });
  const within = (start, end) => ({ $match: { soldAt: { $gte: start, $lt: end } } });

  const [result] = await Order.aggregate([
    { $match: { farmer: req.user._id, status: "done" } },
    { $addFields: { soldAt: SOLD_AT } },
    within(prevFrom, to),
    {
      $facet: {
        current: [within(from, to), addUp(bucket(BUCKET_FORMAT[granularity])), { $sort: { _id: 1 } }],
        previous: [within(prevFrom, from), addUp(bucket(BUCKET_FORMAT[granularity])), { $sort: { _id: 1 } }],
        days: [within(from, to), addUp(bucket(BUCKET_FORMAT.day)), { $sort: { _id: 1 } }],
        previousDays: [within(prevFrom, from), addUp(bucket(BUCKET_FORMAT.day)), { $sort: { _id: 1 } }],
        products: [
          within(from, to),
          { $sort: { soldAt: 1 } },
          {
            $group: {
              _id: "$product",
              // The title it was last sold under, if the farmer renamed it.
              title: { $last: "$productTitle" },
              revenue: { $sum: "$total" },
              kg: KILOS,
              trays: TRAYS,
              unit: { $last: { $ifNull: ["$unit", "kg"] } },
              orders: { $sum: 1 },
            },
          },
          { $sort: { kg: -1, revenue: -1 } },
        ],
      },
    },
  ]);

  res.json({
    timezone,
    current: rounded(result.current),
    previous: rounded(result.previous),
    days: rounded(result.days),
    previousDays: rounded(result.previousDays),
    products: result.products.map(({ _id, title, revenue, kg, trays, unit, orders }) => ({
      product: _id,
      title,
      unit,
      revenue: Math.round(revenue * 100) / 100,
      kg: Math.round(kg * 100) / 100,
      trays,
      orders,
    })),
  });
});

// @desc    Get the logged-in buyer's own orders
// @route   GET /api/orders/buyer
// @access  Private (buyer)
const getBuyerOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ buyer: req.user._id })
    .populate("farmer", "name farmName")
    // The photo My Orders shows beside each order.
    .populate("product", "image")
    .sort({ createdAt: -1 });

  const ratings = await Rating.find({ order: { $in: orders.map((o) => o._id) } }).select("order");
  const ratedIds = new Set(ratings.map((r) => r.order.toString()));

  res.json(orders.map((o) => ({ ...o.toObject(), rated: ratedIds.has(o._id.toString()) })));
});

// How much of a product the farmer has accepted orders for that aren't
// completed yet - still in their stock, but promised. (`except` leaves one
// order out: the one being accepted.)
async function promisedOf(productId, except = null) {
  const [row] = await Order.aggregate([
    { $match: { product: productId, ...PROMISED, ...(except ? { _id: { $ne: except } } : {}) } },
    { $group: { _id: null, quantity: { $sum: "$quantity" } } },
  ]);
  return row?.quantity || 0;
}

// Takes a completed order's quantity off its product's stock - never below
// zero - once.
async function takeStock(order) {
  if (tookStock(order)) return;
  await Product.updateOne({ _id: order.product }, [
    { $set: { stock: { $max: [0, { $subtract: ["$stock", order.quantity] }] } } },
  ]);
  order.stockTaken = true;
}

// Gives an order's stock back, for one that took it before stock was only
// taken on completion.
async function giveStockBack(order) {
  if (!tookStock(order)) return;
  await Product.updateOne({ _id: order.product }, { $inc: { stock: order.quantity } });
  order.stockTaken = false;
}

// Which status a farmer may move an order into, from its current status.
const ALLOWED_TRANSITIONS = {
  new: ["processing", "cancelled"],
  preorder: ["processing", "cancelled"],
  processing: ["ready"],
  ready: ["done"],
};
const TIMESTAMP_FIELD = {
  processing: "acceptedAt",
  ready: "readyAt",
  done: "doneAt",
  cancelled: "cancelledAt",
};

// @desc    Move an order one real step forward: accept or decline it, mark it
//          ready for pickup, or mark it picked up
// @route   PATCH /api/orders/:id/status
// @access  Private (farmer, owner only)
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!TIMESTAMP_FIELD[status]) {
    res.status(400);
    throw new Error("Status must be 'processing', 'ready', 'done' or 'cancelled'");
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

  const from = order.status;
  if (!ALLOWED_TRANSITIONS[from]?.includes(status)) {
    res.status(400);
    throw new Error(`This order is '${from}' and cannot be moved to '${status}'`);
  }

  // Accepting promises the order's kilos to this buyer, so there has to be
  // that much in stock that isn't already promised to someone else - for a
  // pre-order, that means the farmer has restocked enough of it by now.
  // (Stock itself only goes down when the order is completed.)
  if (status === "processing" && !tookStock(order)) {
    const product = await Product.findById(order.product);
    if (!product) {
      res.status(404);
      throw new Error("That product no longer exists, so this order can't be accepted");
    }
    const free = product.stock - (await promisedOf(product._id, order._id));
    if (free < order.quantity) {
      res.status(400);
      throw new Error(
        `You need ${amountOf(order.quantity, order.unit)} in stock to accept this ${from === "preorder" ? "pre-order" : "order"} - you have ${amountOf(Math.max(free, 0), order.unit)}${
          free < product.stock ? " not already promised to other accepted orders" : ""
        }`
      );
    }
  }

  // Completed: the kilos have left the farm, so now they come off the stock.
  if (status === "done") await takeStock(order);
  // An order from before that rule gives back what it took when declined.
  if (status === "cancelled") await giveStockBack(order);

  order.status = status;
  order[TIMESTAMP_FIELD[status]] = Date.now();
  await order.save();

  // The buyer finds where their order stands in their chat with the farmer.
  await postOrderUpdate(order, req.user);
  // ...and their order pages, and the farmer's other tabs, update straight away.
  orderChanged(order, { action: "status", by: "farmer", previousStatus: from });
  if (STOCK_MOVES.includes(status)) productChanged({ _id: order.product, farmer: order.farmer }, "stock");

  res.json(await withDetails(order._id));
});

// The step an order goes back to when the farmer takes a status change back.
// The flow is a straight line - new (or preorder) -> processing -> ready ->
// done - so one step back is all it takes. Two statuses are deliberately not
// in here: a completed order is finished, picked up and possibly already
// rated, and a declined one has been announced to the buyer with their stock
// put back. Neither is something to quietly reopen.
const previousStatusOf = (order) => {
  if (order.status === "processing") return order.openedAs || "new";
  if (order.status === "ready") return "processing";
  return null;
};

const NOTHING_TO_UNDO = {
  done: "This order is complete, so it can no longer be undone.",
  cancelled: "A declined order can't be undone - the buyer has been told, and their stock was put back.",
};

// @desc    Take back the last status change on a farmer's own order, so an
//          accidental Accept or Ready goes back one step
// @route   PATCH /api/orders/:id/undo
// @access  Private (farmer, owner only)
const undoOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    res.status(404);
    throw new Error("Order not found");
  }
  if (order.farmer.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("You do not own this order");
  }

  const previous = previousStatusOf(order);
  if (!previous) {
    res.status(400);
    throw new Error(
      NOTHING_TO_UNDO[order.status] || "This order hasn't been moved anywhere yet, so there is nothing to undo."
    );
  }

  // Nothing here changes the stock - only completing an order does - except
  // for a pre-order accepted before that rule, which took its stock when
  // accepted and gives it back.
  if (previous === "preorder") await giveStockBack(order);

  // The stage being undone never happened, so its timestamp goes with it -
  // otherwise the tracker would still show the moment an order became ready.
  const undone = order.status;
  order.status = previous;
  order[TIMESTAMP_FIELD[undone]] = undefined;
  await order.save();
  await retractOrderUpdate(order, undone, req.user);
  orderChanged(order, { action: "undone", by: "farmer", previousStatus: undone });

  res.json(await withDetails(order._id));
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
  if (order.status !== "new" && order.status !== "preorder") {
    res.status(400);
    throw new Error("This order has already been accepted by the farmer and can no longer be cancelled");
  }

  // Nothing was taken off the stock yet - except by an order placed before
  // stock was only taken on completion, which gives it back.
  await giveStockBack(order);
  const previousStatus = order.status;
  order.status = "cancelled";
  order.cancelledAt = Date.now();
  await order.save();

  orderChanged(order, { action: "cancelled", by: "buyer", previousStatus, buyerName: req.user.name });
  productChanged({ _id: order.product, farmer: order.farmer }, "stock");

  res.json(await withDetails(order._id));
});

// @desc    Archive or unarchive one of the buyer's own completed orders
// @route   PATCH /api/orders/:id/archive
// @access  Private (buyer, owner only)
const archiveOrder = asyncHandler(async (req, res) => {
  const { archived } = req.body;
  if (typeof archived !== "boolean") {
    res.status(400);
    throw new Error("'archived' must be true or false");
  }

  const order = await Order.findById(req.params.id);
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
    throw new Error("Only a completed order can be archived");
  }

  order.archived = archived;
  await order.save();

  // Only the buyer keeps an archive, so this is for their other tabs.
  orderChanged(order, { action: "archived", by: "buyer", to: ["buyer"] });

  res.json(await withDetails(order._id));
});

// @desc    Get a single order's detail, for tracking
// @route   GET /api/orders/:id
// @access  Private (the buyer or farmer on that order only)
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate("farmer", "name farmName location phone")
    .populate("buyer", "name location phone")
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
  getFarmerAnalytics,
  getBuyerOrders,
  getOrderById,
  updateOrderStatus,
  undoOrderStatus,
  cancelOrder,
  archiveOrder,
};
