import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingBasket, CircleUserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

export default function BuyerTopBar({ children, search, onSearchChange }) {
  const { user } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-8 py-6">
      <div className="min-w-0 flex-1">{children}</div>

      {search !== undefined && (
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            readOnly={!onSearchChange}
            onFocus={() => {
              if (!onSearchChange) navigate("/buyer/marketplace");
            }}
            placeholder="Search"
            className="w-full rounded-full border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
          />
        </div>
      )}

      <div className="flex shrink-0 items-center gap-3">
        <Link
          to="/buyer/cart"
          className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100"
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
          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-[#2f8f66]"
        >
          <CircleUserRound className="h-7 w-7" />
        </Link>
      </div>
    </div>
  );
}
