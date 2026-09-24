import { Box, ImageOff, Leaf, MapPin } from "lucide-react";
import { SERVER_URL } from "../../services/api";
import { discountPercent, effectivePrice, onFlashSale } from "../../utils/pricing";
import { formatDistance } from "../../utils/address";
import ProductImage from "./ProductImage";
import { categoryLabel } from "../../utils/categories";

const peso = (amount) => `₱${Number(amount ?? 0).toLocaleString()}`;

// One listing on the marketplace: its photo, what it is, what a kilo costs,
// where it is and how much there is. Nothing else - the rest of the listing is
// a click away.
//
// The photo is shown whole rather than filled to the frame: farmers upload
// pictures of every shape, and a cropped photo of produce can easily hide the
// produce. A fixed frame with the photo contained inside keeps every card the
// same size whatever was uploaded, and ProductImage takes the backdrop out so
// the produce sits on the card itself rather than in a box of its own.
export default function ProductCard({ product, onOpen }) {
  const place = product.location || product.farmer?.location || "Location not set";
  const away = formatDistance(product.farmer);
  const discounted = onFlashSale(product);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-sm transition duration-150 hover:border-gray-300 hover:shadow-md active:scale-[0.98]"
    >
      <div className="relative flex h-44 items-center justify-center px-2 pt-2">
        {product.image ? (
          <ProductImage
            src={`${SERVER_URL}${product.image}`}
            alt={product.title}
            // Rounded for the photos that keep their backdrop - a field or a
            // full crate has nothing to trace out, and a softened edge suits
            // the card better than a hard rectangle. Traced photos have
            // transparent corners, so it makes no difference to them.
            className="h-full w-full rounded-lg object-contain"
          />
        ) : (
          <ImageOff className="h-10 w-10 text-gray-300" />
        )}

        {product.productType === "preorder" && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white">
            Pre-order
          </span>
        )}
        {discounted && (
          <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
            -{discountPercent(product)}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-1 pb-1 pt-4">
        <p className="truncate text-base font-semibold text-gray-900">{product.title}</p>

        <p className="flex flex-wrap items-baseline gap-2">
          <span className="text-lg font-bold text-[#2f8f66]">
            {peso(effectivePrice(product))} / kilo
          </span>
          {/* A discounted listing still says what it was, or the price would
              be a claim nobody can check. */}
          {discounted && (
            <span className="text-sm text-gray-400 line-through">{peso(product.price)}</span>
          )}
        </p>

        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-[#2f8f66]">
          <Leaf className="h-3.5 w-3.5" />
          {categoryLabel(product.category)}
        </span>

        <p className="flex items-center gap-2 text-sm text-gray-500">
          <MapPin className="h-4 w-4 shrink-0 text-[#2f8f66]" />
          <span className="truncate">
            {place}
            {/* Only when the buyer has a registered address to measure from. */}
            {away && <span className="font-medium text-[#2f8f66]"> · {away}</span>}
          </span>
        </p>

        <p className="flex items-center gap-2 text-sm text-gray-500">
          <Box className="h-4 w-4 shrink-0 text-[#2f8f66]" />
          Available: {product.stock} kg
        </p>
      </div>
    </button>
  );
}
