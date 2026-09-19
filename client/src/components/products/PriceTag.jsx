import { effectivePrice, discountPercent, onFlashSale } from "../../utils/pricing";

// Shared "regular price, or was/now + discount badge" display, used
// everywhere a product's price is shown to a buyer or farmer. `tone` picks
// light text for a colored/photo background, dark text for a white one.
const sizes = {
  sm: { was: "text-[10px]", now: "text-xs font-semibold", badge: "px-1 text-[9px]" },
  md: { was: "text-xs", now: "text-sm font-semibold", badge: "px-1.5 py-0.5 text-[10px]" },
  lg: { was: "text-sm", now: "text-lg font-semibold", badge: "px-1.5 py-0.5 text-xs" },
};

export default function PriceTag({ product, tone = "dark", size = "md", suffix = "" }) {
  const light = tone === "light";
  const s = sizes[size];

  if (!onFlashSale(product)) {
    return (
      <span className={`${s.now} ${light ? "text-white" : "text-gray-900"}`}>
        ₱{product.price}
        {suffix}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-baseline gap-1.5">
      <span className={`${s.was} line-through ${light ? "text-white/60" : "text-gray-400"}`}>
        ₱{product.price}
      </span>
      <span className={`${s.now} ${light ? "text-white" : "text-red-600"}`}>
        ₱{effectivePrice(product)}
        {suffix}
      </span>
      <span className={`${s.badge} rounded bg-yellow-300 font-bold text-[#1f5c42]`}>
        -{discountPercent(product)}%
      </span>
    </span>
  );
}
