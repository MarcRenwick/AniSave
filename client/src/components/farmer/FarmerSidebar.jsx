import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
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
import logo from "../../assets/logo.png";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import LogoutConfirmModal from "../LogoutConfirmModal";
import { withPageTransition } from "../../utils/pageTransition";
import useMediaQuery, { PHONE } from "../../hooks/useMediaQuery";

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

export default function FarmerSidebar() {
  const { logout } = useAuth();
  const { unreadTotal } = useChat();
  const navigate = useNavigate();
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
      <div className="sticky top-0 z-30 flex items-center justify-between bg-[#2f8f66] px-4 py-3 text-white md:hidden">
        <div className="flex items-center gap-3">
          <img src={logo} alt="AniSave" className="h-9 w-9 shrink-0 rounded-full" />
          <div className="leading-tight">
            <p className="font-semibold">AniSave</p>
            <p className="text-xs text-white/80">Farmer Portal</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="relative rounded-md p-2 hover:bg-white/10"
        >
          <Menu className="h-6 w-6" />
          {unreadTotal > 0 && (
            <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-[#2f8f66]" />
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
        } farm-sidebar sticky top-0 h-screen shrink-0 flex-col overflow-y-auto px-4 py-6 text-white transition-all duration-200 max-md:fixed max-md:left-0 max-md:z-50 ${
          open ? "" : "max-md:invisible max-md:-translate-x-full"
        }`}
      >
        <div className={`flex items-center ${compact ? "flex-col gap-3" : "justify-between"}`}>
          <div className={`flex items-center gap-3 ${compact ? "" : "px-2"}`}>
            <img src={logo} alt="AniSave" className="h-10 w-10 shrink-0 rounded-full" />
            {!compact && (
              <div className="leading-tight">
                <p className="font-semibold">AniSave</p>
                <p className="text-xs text-white/80">Farmer Portal</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={phone ? closeDrawer : toggleCollapsed}
            className="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
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

        <nav className="mt-8 flex flex-col gap-2">
          {navItems.map(({ to, label, icon: Icon, showsUnread }) => {
            const badge = showsUnread ? unreadTotal : 0;
            return (
              <NavLink
                key={to}
                to={to}
                onClick={closeDrawer}
                title={compact ? label : undefined}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                    compact ? "justify-center px-2" : ""
                  } ${isActive ? "bg-[#8ee6b0] text-[#1f5c42]" : "text-white/90 hover:bg-white/10"}`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!compact && label}
                {badge > 0 && (
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white ${
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
          className={`mt-auto flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white/90 transition hover:bg-white/10 ${
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
