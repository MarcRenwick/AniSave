import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MoreHorizontal, ImageOff, Package, RefreshCw } from "lucide-react";
import { CATEGORY_COLORS, EASE } from "../../../theme/harvest";
import { categoryLabel } from "../../../utils/categories";
import { SERVER_URL } from "../../../services/api";
import { onFlashSale, discountPercent } from "../../../utils/pricing";
import { amountOf, unitOf } from "../../../utils/units";

// One of a farmer's listings on My Products: the photo (opens the listing),
// its category in its colour, its name and stock, and Restock; Edit and
// Delete sit in the ... menu. The card lifts a little under the pointer.
export default function ProductCard({ product, isNew, onViewDetails, onRestock, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div className="harvest-card harvest-card-hover relative h-full p-2.5" data-category={product.category}>
      {/* The photo zooms a little inside its frame on hover, rather than the
          frame growing out of the card. */}
      <button
        type="button"
        onClick={() => onViewDetails(product)}
        className="group relative flex aspect-[16/7] w-full items-center justify-center overflow-hidden rounded-[0.9rem] bg-gray-50 text-gray-300 hover:transform-none"
        title="View details"
      >
        {product.image ? (
          <img
            src={`${SERVER_URL}${product.image}`}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-700 ease-harvest group-hover:scale-110"
          />
        ) : (
          <ImageOff className="h-10 w-10" />
        )}
        <span
          className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-gray-800 shadow-sm backdrop-blur-sm"
          data-testid="category-chip"
        >
          <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[product.category] || CATEGORY_COLORS.vegetable }} />
          {categoryLabel(product.category)}
        </span>
      </button>

      {isNew && (
        <span className="absolute left-4 top-4 rounded-full bg-tomato-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          New
        </span>
      )}
      {onFlashSale(product) && (
        <span
          className={`absolute left-4 rounded-full bg-gold-400 px-2 py-0.5 text-[10px] font-bold text-night shadow-sm ${isNew ? "top-10" : "top-4"}`}
        >
          -{discountPercent(product)}% Sale
        </span>
      )}

      <div ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="absolute right-4 top-4 rounded-full bg-white/90 p-1 text-gray-500 shadow-sm hover:bg-white"
          aria-label="Product options"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>

        <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE }}
            style={{ originX: 1, originY: 0 }}
            className="absolute right-4 top-12 z-10 w-32 overflow-hidden rounded-xl bg-white py-1 text-sm shadow-lift ring-1 ring-black/5"
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEdit(product);
              }}
              className="block w-full px-3 py-2 text-left font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete(product);
              }}
              className="block w-full px-3 py-2 text-left font-medium text-tomato-700 hover:bg-tomato-50"
            >
              Delete
            </button>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      <div className="px-1.5 pb-1 pt-3">
        <p className="truncate font-display text-lg font-semibold text-gray-900">{product.title}</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-600">
          <Package className="h-4 w-4 shrink-0 text-brand" />
          <span>
            Current stock: <span className="font-semibold text-gray-900">{amountOf(product.stock, unitOf(product))}</span>
          </span>
        </p>
        <button
          type="button"
          onClick={() => onRestock(product)}
          className="group/restock mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          <RefreshCw className="h-4 w-4 transition-transform duration-500 ease-harvest group-hover/restock:rotate-180" />
          Restock
        </button>
      </div>
    </div>
  );
}
