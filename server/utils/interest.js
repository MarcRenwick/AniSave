const ProductInterest = require("../models/ProductInterest");

// Counting how often buyers look for a crop must never slow browsing down or
// break it: every write here is sent off and forgotten. If one fails, a
// dashboard number is a little out of date, and nothing else happens.
//
// Only what buyers do counts. A farmer opening their own listing, or an
// administrator moderating one, is not demand - and neither is a sale, which
// is why nothing in here reads an order.

// One search can match a lot of listings. Counting every one of them would let
// a single broad search ("a") swamp the ranking, so only the first handful of
// results a buyer actually sees are counted.
const MAX_SEARCH_HITS = 12;

const isBuyerOrGuest = (user) => !user || user.role === "buyer";

// One look, one count. A page that asks for the same listing twice in the same
// breath - React mounting a screen, discarding it and mounting it again while
// developing, a double-click, a re-render - is one buyer looking once, and
// counting it twice would say two people were interested when one was. So the
// same viewer meeting the same listing again within a few seconds is ignored.
// Longer than that is a fresh look and counts again.
const SAME_LOOK_MS = 5000;
const MAX_REMEMBERED = 5000;
const lastLook = new Map();

// Who is looking: the account when there is one, otherwise where the request
// came from, which is all a guest offers. It only has to tell two people apart
// for a few seconds.
const viewerKey = (req) => String(req?.user?._id || req?.ip || "guest");

// True the first time this viewer meets this listing, false while the same
// look is still going on. Stale entries are dropped as we go, so the map is
// a short-lived memory rather than something that grows all day.
function firstLook(key) {
  const now = Date.now();
  if (lastLook.size > MAX_REMEMBERED) {
    for (const [seenKey, at] of lastLook) {
      if (now - at >= SAME_LOOK_MS) lastLook.delete(seenKey);
    }
  }
  const before = lastLook.get(key);
  lastLook.set(key, now);
  return before === undefined || now - before >= SAME_LOOK_MS;
}

function add(products, field, who) {
  const rows = products.filter(
    (product) =>
      product?._id && product.farmer && firstLook(`${who}:${field}:${product._id}`)
  );
  if (rows.length === 0) return;

  ProductInterest.bulkWrite(
    rows.map((product) => ({
      updateOne: {
        filter: { product: product._id },
        update: {
          $inc: { [field]: 1 },
          $set: {
            farmer: product.farmer?._id || product.farmer,
            title: product.title,
            lastAt: new Date(),
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  ).catch(() => {});
}

// A buyer opened this listing.
function recordView(product, req) {
  if (!isBuyerOrGuest(req?.user)) return;
  add([product], "views", viewerKey(req));
}

// A buyer searched, and these listings came back.
function recordSearchHits(products, req) {
  if (!isBuyerOrGuest(req?.user)) return;
  add(products.slice(0, MAX_SEARCH_HITS), "searches", viewerKey(req));
}

// A listing that no longer exists shouldn't keep a place in the ranking.
function forgetProducts(productIds) {
  return ProductInterest.deleteMany({ product: { $in: productIds } });
}

module.exports = { recordView, recordSearchHits, forgetProducts, MAX_SEARCH_HITS };
