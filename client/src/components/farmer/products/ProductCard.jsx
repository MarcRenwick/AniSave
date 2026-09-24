import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, ImageOff, Package, RefreshCw } from "lucide-react";
import { SERVER_URL } from "../../../services/api";
import { onFlashSale, discountPercent } from "../../../utils/pricing";

// One of a farmer's listings on My Products: the photo (opens the listing),
// its name and stock, and Restock; Edit and Delete sit in the ... menu.
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
    <div className="relative rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-black/5 transition hover:shadow-md">
      {/* The photo zooms a little inside its frame on hover, rather than the
          frame growing out of the card. */}
      <button
        type="button"
        onClick={() => onViewDetails(product)}
        className="group flex aspect-[16/7] w-full items-center justify-center overflow-hidden rounded-lg bg-gray-50 text-gray-300 hover:transform-none"
        title="View details"
      >
        {product.image ? (
          <img
            src={`${SERVER_URL}${product.image}`}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <ImageOff className="h-10 w-10" />
        )}
      </button>

      {isNew && (
        <span className="absolute left-4 top-4 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          New
        </span>
      )}
      {onFlashSale(product) && (
        <span
          className={`absolute left-4 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white ${isNew ? "top-10" : "top-4"}`}
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

        {menuOpen && (
          <div className="absolute right-4 top-12 z-10 w-28 rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEdit(product);
              }}
              className="block w-full px-3 py-1.5 text-left text-gray-700 hover:bg-gray-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete(product);
              }}
              className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="px-1.5 pb-1 pt-3">
        <p className="truncate text-base font-bold text-gray-900">{product.title}</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-gray-600">
          <Package className="h-4 w-4 shrink-0 text-[#2f8f66]" />
          <span>
            Current stock: <span className="font-semibold text-gray-900">{product.stock} kg</span>
          </span>
        </p>
        <button
          type="button"
          onClick={() => onRestock(product)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-[#2f8f66] py-2 text-sm font-semibold text-white transition hover:bg-[#267a56]"
        >
          <RefreshCw className="h-4 w-4" />
          Restock
        </button>
      </div>
    </div>
  );
}
