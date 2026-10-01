import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  LayoutGrid,
  Package,
  ShoppingBag,
  MessageCircle,
  CircleUserRound,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import logo from "../../assets/logo-192.webp";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import LogoutConfirmModal from "../LogoutConfirmModal";
import { withPageTransition } from "../../utils/pageTransition";
import useMediaQuery, { PHONE } from "../../hooks/useMediaQuery";
import { EASE, SPRING } from "../../theme/harvest";

const navItems = [
  { to: "/farmer/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/farmer/products", label: "Products", icon: Package },
  { to: "/farmer/orders", label: "Orders", icon: ShoppingBag },
  { to: "/farmer/messages", label: "Messages", icon: MessageCircle, showsUnread: true },
  { to: "/farmer/settings", label: "Profile", icon: CircleUserRound },
];

function readCollapsed() {
  try {
    return localStorage.getItem("anisave_farmer_sidebar_collapsed") === "true";
  } catch {
    return false;
  }
}

// Where the gold pill behind the current page's link was on the page before.
// Every farmer page draws its own sidebar, so this outlives them: on the next
// page the pill starts from there and glides to its new link.
let lastPill = null;

function ActivePill({ top, height }) {
  const from = useRef(lastPill);
  useEffect(() => {
    lastPill = { top, height };
  }, [top, height]);
  const start = from.current ?? { top, height };
  return (
    <motion.span
      aria-hidden="true"
      data-testid="nav-pill"
      className="absolute inset-x-0 top-0 rounded-xl bg-gold-400 shadow-glow-gold"
      initial={{ y: start.top, height: start.height }}
      animate={{ y: top, height }}
      transition={SPRING}
    />
  );
}

export default function FarmerSidebar() {
  const { logout } = useAuth();
  const { unreadTotal } = useChat();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  // On a phone the sidebar is a drawer that slides over the page from a menu
  // button, always full width - collapsing it is for wider screens. A drawer
  // left open doesn't follow onto a wider screen.
  const phone = useMediaQuery(PHONE);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const open = phone && drawerOpen;
  const compact = collapsed && !phone;
  const closeDrawer = () => setDrawerOpen(false);

  // The link for the page being shown - the same match NavLink makes, so a
  // product's own page lights up Products.
  const active = navItems.findIndex(({ to }) => pathname === to || pathname.startsWith(`${to}/`));
  const links = useRef([]);
  const [pill, setPill] = useState(null);
  useLayoutEffect(() => {
    const link = links.current[active];
    setPill(link ? { top: link.offsetTop, height: link.offsetHeight } : null);
  }, [active, compact, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("anisave_farmer_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // The dashboard eases out and the login page eases in, rather than one snapping to the other.
  const handleLogout = () =>
    withPageTransition(() => {
      logout();
      navigate("/login");
    });

  return (
    <>
      {/* Phones: the portal's name across the top, and the menu button. */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-cream/10 bg-night/95 px-4 py-3 text-cream backdrop-blur-md md:hidden">
        <div className="flex items-center gap-3">
          <img src={logo} alt="AniSave" className="h-9 w-9 shrink-0 rounded-full ring-2 ring-gold-400/40" />
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold">AniSave</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-300">Farmer Portal</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="relative rounded-xl p-2 hover:bg-cream/10"
        >
          <Menu className="h-6 w-6" />
          {unreadTotal > 0 && (
            <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-tomato-500 ring-2 ring-night" />
          )}
        </button>
      </div>
      {open && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={closeDrawer} aria-hidden="true" />}

      {/* h-screen, not min-h-screen + self-stretch: stretched to the whole
          page the nav was already as tall as everything it could scroll past,
          so there was nothing for sticky to do and it scrolled away with the
          content. Held to one screen it stays put, and overflow-y-auto keeps
          Log out reachable if the window is ever shorter than the menu. */}
      <aside
        className={`flex ${
          compact ? "w-20" : "w-64"
        } farm-sidebar sticky top-0 h-screen shrink-0 flex-col overflow-y-auto px-4 py-6 text-cream transition-[width,translate,visibility] duration-300 ease-harvest max-md:fixed max-md:left-0 max-md:z-50 ${
          open ? "" : "max-md:invisible max-md:-translate-x-full"
        }`}
        data-testid="farmer-sidebar"
      >
        <div className={`flex items-center ${compact ? "flex-col gap-3" : "justify-between"}`}>
          <div className={`flex items-center gap-3 ${compact ? "" : "px-2"}`}>
            <img src={logo} alt="AniSave" className="h-10 w-10 shrink-0 rounded-full ring-2 ring-gold-400/40" />
            {!compact && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="leading-tight"
              >
                <p className="font-display text-xl font-semibold tracking-tight">AniSave</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-300">Farmer Portal</p>
              </motion.div>
            )}
          </div>
          <button
            type="button"
            onClick={phone ? closeDrawer : toggleCollapsed}
            className="rounded-lg p-1.5 text-cream/70 hover:bg-cream/10 hover:text-cream"
            aria-label={phone ? "Close menu" : compact ? "Expand sidebar" : "Collapse sidebar"}
            title={phone ? "Close menu" : compact ? "Expand sidebar" : "Collapse sidebar"}
          >
            {phone ? (
              <X className="h-5 w-5" />
            ) : compact ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>
        </div>

        <nav className="relative mt-9 flex flex-col gap-1.5">
          {pill && <ActivePill top={pill.top} height={pill.height} />}
          {navItems.map(({ to, label, icon: Icon, showsUnread }, i) => {
            const badge = showsUnread ? unreadTotal : 0;
            return (
              <NavLink
                key={to}
                to={to}
                ref={(el) => {
                  links.current[i] = el;
                }}
                onClick={closeDrawer}
                title={compact ? label : undefined}
                className={({ isActive }) =>
                  `relative z-10 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors duration-200 ${
                    compact ? "justify-center px-2" : ""
                  } ${isActive ? "text-night" : "text-cream/75 hover:bg-cream/[0.07] hover:text-cream"}`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <AnimatePresence initial={false}>
                  {!compact && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {badge > 0 && (
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-tomato-600 px-1 text-[11px] font-bold text-white ${
                      compact ? "absolute right-1 top-1" : "ml-auto"
                    }`}
                    aria-label={`${badge} unread`}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setConfirmingLogout(true)}
          title={compact ? "Log out" : undefined}
          className={`mt-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-cream/75 transition-colors hover:bg-cream/[0.07] hover:text-cream ${
            compact ? "justify-center px-2" : ""
          }`}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!compact && "Log out"}
        </button>

        {confirmingLogout && (
          <LogoutConfirmModal onClose={() => setConfirmingLogout(false)} onConfirm={handleLogout} />
        )}
      </aside>
    </>
  );
}
