import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, ImageOff } from "lucide-react";
import { SERVER_URL } from "../../../services/api";

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
    <div className="relative overflow-hidden rounded-xl bg-white shadow-sm">
      <button
        type="button"
        onClick={() => onViewDetails(product)}
        className="flex h-32 w-full items-center justify-center bg-gray-50 text-gray-300"
        title="View details"
      >
        {product.image ? (
          <img
            src={`${SERVER_URL}${product.image}`}
            alt={product.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageOff className="h-10 w-10" />
        )}
      </button>

      {isNew && (
        <span className="absolute left-2 top-2 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          New
        </span>
      )}

      <div ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="absolute right-2 top-2 rounded-full bg-white/80 p-1 text-gray-400 hover:bg-gray-100"
          aria-label="Product options"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>

        {menuOpen && (
          <div className="absolute right-2 top-10 z-10 w-28 rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg">
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

      <div className="space-y-2 bg-[#2f8f66] px-4 py-3 text-white">
        <p className="text-sm font-semibold">{product.title}</p>
        <p className="text-xs text-white/90">Current Stock: {product.stock} kg</p>
        <button
          type="button"
          onClick={() => onRestock(product)}
          className="w-full rounded-md bg-white py-1.5 text-sm font-semibold text-[#2f8f66] transition hover:bg-green-50"
        >
          Restock
        </button>
      </div>
    </div>
  );
}
