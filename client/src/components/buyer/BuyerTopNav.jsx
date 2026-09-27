import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Menu, Search, ShoppingBasket, X } from "lucide-react";
import logo from "../../assets/logo.png";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useChat } from "../../context/ChatContext";

const linkClass = ({ isActive }) =>
  `rounded-full px-5 py-2 text-base font-medium transition duration-150 active:scale-95 ${
    isActive ? "bg-[#8ee6b0] text-[#1f5c42]" : "text-white/90 hover:bg-white/10"
  }`;

export default function BuyerTopNav() {
  const { user } = useAuth();
  const { count } = useCart();
  const { unreadTotal } = useChat();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [params] = useSearchParams();

  // Phones: the links move into a menu that drops down under the bar.
  const [menuOpen, setMenuOpen] = useState(false);
  const barRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => {
      if (e.type === "keydown" ? e.key === "Escape" : !barRef.current?.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

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
          { to: "/buyer/messages", label: "Messages", badge: unreadTotal },
          { to: "/buyer/settings", label: "Profile" },
        ]
      : []),
  ];

  const links = (onClick) =>
    navItems.map(({ to, label, badge }) => (
      <NavLink key={to} to={to} onClick={onClick} className={(state) => `${linkClass(state)} ${badge ? "relative" : ""}`}>
        {label}
        {badge > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white"
            aria-label={`${badge} unread`}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </NavLink>
    ));
  const unread = navItems.some((item) => item.badge > 0);

  return (
    <div
      ref={barRef}
      className="sticky top-0 z-30 grid grid-cols-[auto_1fr_auto] items-center gap-6 bg-[#2f8f66] px-8 py-5 text-white max-md:grid-cols-[auto_1fr] max-md:gap-3 max-md:px-4 max-md:py-3"
    >
      <Link to="/buyer/home" className="flex shrink-0 items-center gap-2.5">
        <img src={logo} alt="AniSave" className="h-10 w-10 rounded-full" />
        <span className="text-lg font-semibold max-sm:hidden">AniSave</span>
      </Link>

      <div className="flex items-center justify-center gap-3 max-md:gap-1">
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

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="relative shrink-0 rounded-full p-2 text-white hover:bg-white/10 md:hidden"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          {unread && !menuOpen && (
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#2f8f66]" />
          )}
        </button>
      </div>

      <nav className="flex shrink-0 items-center justify-end gap-1.5 max-md:hidden">
        {links()}

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

      {menuOpen && (
        <nav
          className="absolute inset-x-0 top-full flex flex-col gap-1 border-t border-white/15 bg-[#2f8f66] px-4 pb-4 pt-2 shadow-lg md:hidden"
          data-testid="mobile-menu"
        >
          {links(() => setMenuOpen(false))}
          {!user && (
            <>
              <NavLink to="/login" onClick={() => setMenuOpen(false)} className={linkClass}>
                Log In
              </NavLink>
              <NavLink
                to="/register"
                onClick={() => setMenuOpen(false)}
                className="rounded-full bg-[#8ee6b0] px-5 py-2 text-base font-semibold text-[#1f5c42] transition duration-150 hover:bg-[#7ad89e] active:scale-95"
              >
                Sign Up
              </NavLink>
            </>
          )}
        </nav>
      )}
    </div>
  );
}
