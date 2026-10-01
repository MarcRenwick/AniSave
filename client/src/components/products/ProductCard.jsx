import { Box, MapPin } from "lucide-react";
import { SERVER_URL } from "../../services/api";
import { discountPercent, effectivePrice, onFlashSale } from "../../utils/pricing";
import { formatDistance } from "../../utils/address";
import ProductImage from "./ProductImage";
import { categoryLabel } from "../../utils/categories";
import { categoryPhoto } from "../../utils/categoryPhotos";
import { amountOf, unitOf, unitWord } from "../../utils/units";

const peso = (amount) => `₱${Number(amount ?? 0).toLocaleString()}`;

// One listing on the marketplace: its photo, what it is, what a kilo costs,
// where it is and how much there is. Nothing else - the rest of the listing is
// a click away. Under the pointer it lifts, its shadow deepens and the photo
// eases in a little closer.
//
// The photo is shown whole rather than filled to the frame: farmers upload
// pictures of every shape, and a cropped photo of produce can easily hide the
// produce. A fixed frame with the photo contained inside keeps every card the
// same size whatever was uploaded, and ProductImage takes the backdrop out so
// the produce sits on the card itself rather than in a box of its own. A
// listing with no photo yet shows a market photo of its category instead,
// marked as such.
export default function ProductCard({ product, onOpen }) {
  const place = product.location || product.farmer?.location || "Location not set";
  const away = formatDistance(product.farmer);
  const discounted = onFlashSale(product);
  const fallback = categoryPhoto(product.category);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex min-w-0 flex-col rounded-[1.4rem] border border-gray-200 bg-paper p-3 text-left shadow-soft transition-[translate,box-shadow,border-color] duration-300 ease-harvest hover:-translate-y-1.5 hover:border-gray-300 hover:shadow-lift focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30 active:scale-[0.98]"
      data-testid="product-card"
    >
      <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(120%_90%_at_50%_100%,#f3ebdc_0%,#faf7f0_70%)] px-2 pt-2">
        {product.image ? (
          <ProductImage
            src={`${SERVER_URL}${product.image}`}
            alt={product.title}
            // Rounded for the photos that keep their backdrop - a field or a
            // full crate has nothing to trace out, and a softened edge suits
            // the card better than a hard rectangle. Traced photos have
            // transparent corners, so it makes no difference to them.
            className="h-full w-full rounded-lg object-contain drop-shadow-[0_10px_14px_rgb(60_40_20/0.18)] transition-transform duration-500 ease-harvest group-hover:scale-[1.06]"
          />
        ) : (
          <>
            <img
              src={fallback.small}
              srcSet={fallback.srcSet}
              sizes="(min-width: 1024px) 18rem, 45vw"
              alt={fallback.alt}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-harvest group-hover:scale-[1.06]"
              data-testid="card-fallback-photo"
            />
            <span className="absolute bottom-2 left-2 rounded-full bg-night/60 px-2 py-0.5 text-[10px] font-semibold text-cream backdrop-blur-sm">
              No photo yet
            </span>
          </>
        )}

        {product.productType === "preorder" && (
          <span className="absolute left-2 top-2 rounded-full bg-gold-300 px-2 py-0.5 text-[10px] font-bold text-night shadow-sm">
            Pre-order
          </span>
        )}
        {discounted && (
          <span className="absolute right-2 top-2 rounded-full bg-tomato-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
            -{discountPercent(product)}%
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-1 pb-1 pt-4">
        <p className="truncate font-display text-[17px] font-semibold text-gray-900">{product.title}</p>

        <p className="flex flex-wrap items-baseline gap-2">
          <span className="text-lg font-bold text-forest-700">
            {peso(effectivePrice(product))} / {unitWord(unitOf(product))}
          </span>
          {/* A discounted listing still says what it was, or the price would
              be a claim nobody can check. */}
          {discounted && (
            <span className="text-sm text-gray-400 line-through">{peso(product.price)}</span>
          )}
        </p>

        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-forest-50 py-0.5 pl-0.5 pr-2.5 text-xs font-semibold text-forest-800 ring-1 ring-forest-100">
          <img src={fallback.small} alt="" loading="lazy" decoding="async" className="h-5 w-5 rounded-full object-cover" />
          {categoryLabel(product.category)}
        </span>

        <p className="flex items-center gap-2 text-sm text-gray-500">
          <MapPin className="h-4 w-4 shrink-0 text-clay-500" />
          <span className="truncate">
            {place}
            {/* Only when the buyer has a registered address to measure from. */}
            {away && <span className="font-semibold text-forest-700"> · {away}</span>}
          </span>
        </p>

        <p className="flex items-center gap-2 text-sm text-gray-500">
          <Box className="h-4 w-4 shrink-0 text-clay-500" />
          Available: {amountOf(product.stock, unitOf(product))}
        </p>
      </div>
    </button>
  );
}
