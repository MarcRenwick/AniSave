import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, animate, motion } from "motion/react";
import { Menu, Search, ShoppingBasket, X } from "lucide-react";
import logo from "../../assets/logo-192.webp";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useChat } from "../../context/ChatContext";
import { EASE } from "../../theme/harvest";
import { FLIGHT_LANDS_MS, flyToCart } from "./cartFlight";

const linkClass = ({ isActive }) =>
  `relative rounded-full px-5 py-2 text-base font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 ${
    isActive ? "text-night" : "text-cream/85 hover:bg-cream/10 hover:text-cream"
  }`;

const PILL_SPRING = { type: "spring", stiffness: 420, damping: 34 };

// Where the gold pill was on the page before. Every buyer page draws its own
// bar, so this outlives them: on the next page the pill starts from there
// and glides to its new link.
let lastPill = null;

// The gold behind the page you're on, gliding from link to link.
function ActivePill({ id }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const now = el.getBoundingClientRect();
    const from = id === "buyer-nav-pill" ? lastPill : null;
    if (from && Math.abs(from.left - now.left) > 1 && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      animate(el, { x: [from.left - now.left, 0], scaleX: [from.width / now.width, 1] }, PILL_SPRING);
    }
    if (id === "buyer-nav-pill") lastPill = { left: now.left, width: now.width };
  }, [id]);
  return (
    <motion.span
      ref={ref}
      layoutId={id}
      data-testid={id}
      style={{ originX: 0 }}
      className="absolute inset-0 -z-10 rounded-full bg-gold-300 shadow-[0_8px_20px_-10px_rgb(242_193_78/0.9)]"
      transition={PILL_SPRING}
    />
  );
}

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

  // When the cart's count goes up, a photo flies in from the page (if it
  // marked one) and the count bumps as it lands.
  const cartRef = useRef(null);
  const lastCount = useRef(count);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (count > lastCount.current) {
      const flew = flyToCart(cartRef.current);
      const timer = setTimeout(() => setBump((b) => b + 1), flew ? FLIGHT_LANDS_MS : 0);
      lastCount.current = count;
      return () => clearTimeout(timer);
    }
    lastCount.current = count;
    return undefined;
  }, [count]);

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

  const links = (onClick, pillId) =>
    navItems.map(({ to, label, badge }) => (
      <NavLink key={to} to={to} onClick={onClick} className={linkClass}>
        {({ isActive }) => (
          <>
            {isActive && <ActivePill id={pillId} />}
            {label}
            {badge > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-tomato-600 px-1 text-[11px] font-semibold text-white ring-2 ring-night"
                aria-label={`${badge} unread`}
              >
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    ));
  const unread = navItems.some((item) => item.badge > 0);

  const signUpClass =
    "rounded-full bg-gold-400 px-5 py-2 text-base font-semibold text-night shadow-[0_10px_24px_-12px_rgb(242_193_78/0.9)] transition-colors duration-200 hover:bg-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream";

  return (
    <div
      ref={barRef}
      className="sticky top-0 z-30 grid grid-cols-[auto_1fr_auto] items-center gap-6 border-b border-gold-300/10 bg-night/95 px-8 py-4 text-cream shadow-[0_12px_30px_-22px_rgb(0_0_0/0.8)] backdrop-blur-md max-md:grid-cols-[auto_1fr] max-md:gap-3 max-md:px-4 max-md:py-3"
      data-testid="buyer-nav"
    >
      <Link to="/buyer/home" className="flex shrink-0 items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300">
        <img src={logo} alt="AniSave" className="h-10 w-10 rounded-full ring-2 ring-gold-300/50" />
        <span className="font-display text-xl font-semibold max-sm:hidden">AniSave</span>
      </Link>

      <div className="flex items-center justify-center gap-3 max-md:gap-1">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search products"
            aria-label="Search products"
            className="w-full rounded-full border border-transparent bg-paper py-2.5 pl-10 pr-4 text-sm text-gray-900 shadow-inner placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-gold-300/40"
          />
        </div>

        <Link
          ref={cartRef}
          to="/buyer/cart"
          className="relative shrink-0 rounded-full p-2 text-cream transition-colors duration-200 hover:bg-cream/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
          aria-label="Cart"
          data-cart-icon
        >
          <motion.span
            key={`basket-${bump}`}
            className="block"
            initial={bump ? { rotate: -14, scale: 1.18 } : false}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 14 }}
          >
            <ShoppingBasket className="h-7 w-7" />
          </motion.span>
          {count > 0 && (
            <motion.span
              key={`count-${bump}`}
              initial={bump ? { scale: 1.6 } : false}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 520, damping: 15 }}
              className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-tomato-600 px-1 text-[11px] font-semibold text-white ring-2 ring-night"
              data-testid="cart-count"
            >
              {count}
            </motion.span>
          )}
        </Link>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="relative shrink-0 rounded-full p-2 text-cream hover:bg-cream/10 md:hidden"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          {unread && !menuOpen && (
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-tomato-600 ring-2 ring-night" />
          )}
        </button>
      </div>

      <nav className="isolate flex shrink-0 items-center justify-end gap-1.5 max-md:hidden">
        {links(undefined, "buyer-nav-pill")}

        {!user && (
          <>
            <NavLink to="/login" className={linkClass}>
              {({ isActive }) => (
                <>
                  {isActive && <ActivePill id="buyer-nav-pill" />}
                  Log In
                </>
              )}
            </NavLink>
            <NavLink to="/register" className={signUpClass}>
              Sign Up
            </NavLink>
          </>
        )}
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
            transition={{ duration: 0.28, ease: EASE }}
            className="absolute inset-x-0 top-full isolate flex flex-col gap-1 border-t border-cream/10 bg-night px-4 pb-4 pt-2 shadow-lift md:hidden"
            data-testid="mobile-menu"
          >
            {links(() => setMenuOpen(false), "buyer-menu-pill")}
            {!user && (
              <>
                <NavLink to="/login" onClick={() => setMenuOpen(false)} className={linkClass}>
                  {({ isActive }) => (
                    <>
                      {isActive && <ActivePill id="buyer-menu-pill" />}
                      Log In
                    </>
                  )}
                </NavLink>
                <NavLink to="/register" onClick={() => setMenuOpen(false)} className={signUpClass}>
                  Sign Up
                </NavLink>
              </>
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
