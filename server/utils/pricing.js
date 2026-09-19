// The price a buyer actually pays: the sale price while a Flash Sale is
// active, otherwise the regular price. Mirrors client/src/utils/pricing.js -
// keep both in sync.
const effectivePrice = (product) =>
  product.salePrice != null && product.salePrice < product.price ? product.salePrice : product.price;

module.exports = { effectivePrice };
