import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingBasket, CircleUserRound, SlidersHorizontal, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

function SortDropdown({ sortOptions, sortValue, onSortChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition duration-150 hover:bg-gray-50 active:scale-95"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filter
      </button>

      <div
        className={`absolute right-0 top-full z-20 mt-2 w-56 origin-top-right overflow-hidden rounded-xl bg-white shadow-xl transition duration-150 ${
          open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <p className="border-b border-gray-100 px-4 py-2 text-xs font-semibold uppercase text-gray-400">
          Sort By
        </p>
        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => {
              onSortChange(opt.key);
              setOpen(false);
            }}
            className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition duration-100 hover:bg-gray-50 active:scale-[0.98] ${
              sortValue === opt.key ? "font-semibold text-[#2f8f66]" : "text-gray-700"
            }`}
          >
            {opt.label}
            {sortValue === opt.key && <Check className="h-4 w-4" />}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function BuyerTopBar({ children, search, onSearchChange, sortOptions, sortValue, onSortChange }) {
  const { user } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  const actions = (
    <div className="flex shrink-0 items-center gap-3">
      {sortOptions && (
        <SortDropdown sortOptions={sortOptions} sortValue={sortValue} onSortChange={onSortChange} />
      )}

      <Link
        to="/buyer/cart"
        className="relative rounded-full p-2 text-gray-500 transition duration-150 hover:bg-gray-100 active:scale-90"
        aria-label="Cart"
      >
        <ShoppingBasket className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
            {count}
          </span>
        )}
      </Link>

      <Link
        to={user ? "/buyer/settings" : "/login"}
        aria-label={user ? "Settings" : "Log in"}
        className="rounded-full p-1 text-gray-400 transition duration-150 hover:bg-gray-100 hover:text-[#2f8f66] active:scale-90"
      >
        <CircleUserRound className="h-7 w-7" />
      </Link>
    </div>
  );

  if (search !== undefined) {
    return (
      <div className="grid grid-cols-3 items-center gap-4 border-b border-gray-200 px-8 py-6">
        <div className="min-w-0">{children}</div>

        <div className="flex justify-center">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange?.(e.target.value)}
              readOnly={!onSearchChange}
              onFocus={() => {
                if (!onSearchChange) navigate("/buyer/home");
              }}
              placeholder="Search"
              className="w-full rounded-full border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm transition focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
            />
          </div>
        </div>

        {actions}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-8 py-6">
      <div className="min-w-0 flex-1">{children}</div>
      {actions}
    </div>
  );
}
