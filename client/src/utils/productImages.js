// Every photo a product has, in display order. Products listed before
// multi-photo support only have the single `image` field.
export function productImages(product) {
  if (product?.images?.length) return product.images;
  return product?.image ? [product.image] : [];
}
