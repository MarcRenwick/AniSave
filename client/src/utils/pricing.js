// The price a buyer actually pays: the sale price while a Flash Sale is
// active, otherwise the regular price. Mirrors server/utils/pricing.js.
export function effectivePrice(product) {
  return product?.salePrice != null && product.salePrice < product.price
    ? product.salePrice
    : product?.price;
}

export function onFlashSale(product) {
  return product?.salePrice != null && product.salePrice < product.price;
}

export function discountPercent(product) {
  if (!onFlashSale(product) || !product.price) return 0;
  return Math.round(((product.price - product.salePrice) / product.price) * 100);
}
