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

function add(products, field) {
  const rows = products.filter((product) => product?._id && product.farmer);
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
function recordView(product, viewer) {
  if (!isBuyerOrGuest(viewer)) return;
  add([product], "views");
}

// A buyer searched, and these listings came back.
function recordSearchHits(products, viewer) {
  if (!isBuyerOrGuest(viewer)) return;
  add(products.slice(0, MAX_SEARCH_HITS), "searches");
}

// A listing that no longer exists shouldn't keep a place in the ranking.
function forgetProducts(productIds) {
  return ProductInterest.deleteMany({ product: { $in: productIds } });
}

module.exports = { recordView, recordSearchHits, forgetProducts, MAX_SEARCH_HITS };
