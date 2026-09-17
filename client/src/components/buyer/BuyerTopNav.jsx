import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Search, ShoppingBasket } from "lucide-react";
import logo from "../../assets/logo.png";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

const linkClass = ({ isActive }) =>
  `rounded-full px-5 py-2 text-base font-medium transition duration-150 active:scale-95 ${
    isActive ? "bg-[#8ee6b0] text-[#1f5c42]" : "text-white/90 hover:bg-white/10"
  }`;

export default function BuyerTopNav() {
  const { user } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();

  const onHome = pathname === "/buyer/home";
  // Search always lands on Home; away from it the box starts empty and the
  // first keystroke takes the buyer there.
  const query = onHome ? params.get("q") || "" : "";

  const handleSearch = (value) => {
    const next = new URLSearchParams(onHome ? params : undefined);
    if (value) next.set("q", value);
    else next.delete("q");
    const suffix = next.toString();
    navigate(`/buyer/home${suffix ? `?${suffix}` : ""}`, { replace: onHome });
  };

  const navItems = [
    { to: "/buyer/home", label: "Home" },
    ...(user
      ? [
          { to: "/buyer/orders", label: "My Orders" },
          { to: "/buyer/settings", label: "Profile" },
        ]
      : []),
  ];

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between gap-6 bg-[#2f8f66] px-8 py-5 text-white">
      <Link to="/buyer/home" className="flex shrink-0 items-center gap-2.5">
        <img src={logo} alt="AniSave" className="h-10 w-10 rounded-full" />
        <span className="text-lg font-semibold">AniSave</span>
      </Link>

      <div className="flex flex-1 items-center justify-center gap-4">
        <nav className="flex items-center gap-1.5">
          {navItems.map(({ to, label }) => (
            <NavLink key={to} to={to} className={linkClass}>
              {label}
            </NavLink>
          ))}

          {!user && (
            <>
              <NavLink to="/login" className={linkClass}>
                Log In
              </NavLink>
              <NavLink
                to="/register"
                className="rounded-full bg-[#8ee6b0] px-5 py-2 text-base font-semibold text-[#1f5c42] transition duration-150 hover:bg-[#7ad89e] active:scale-95"
              >
                Sign Up
              </NavLink>
            </>
          )}
        </nav>

        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search products"
            aria-label="Search products"
            className="w-full rounded-full border border-transparent bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8ee6b0]"
          />
        </div>
      </div>

      <Link
        to="/buyer/cart"
        className="relative shrink-0 rounded-full p-2 text-white transition duration-150 hover:bg-white/10 active:scale-90"
        aria-label="Cart"
      >
        <ShoppingBasket className="h-7 w-7" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-semibold text-white">
            {count}
          </span>
        )}
      </Link>
    </div>
  );
}
