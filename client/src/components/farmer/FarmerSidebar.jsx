import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Package,
  ShoppingBag,
  MessageCircle,
  CircleUserRound,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import logo from "../../assets/logo.png";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import LogoutConfirmModal from "../LogoutConfirmModal";
import { withPageTransition } from "../../utils/pageTransition";

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
    // h-screen, not min-h-screen + self-stretch: stretched to the whole page
    // the nav was already as tall as everything it could scroll past, so there
    // was nothing for sticky to do and it scrolled away with the content. Held
    // to one screen it stays put, and overflow-y-auto keeps Log out reachable
    // if the window is ever shorter than the menu.
    <aside
      className={`flex ${
        collapsed ? "w-20" : "w-64"
      } farm-sidebar sticky top-0 h-screen shrink-0 flex-col overflow-y-auto px-4 py-6 text-white transition-all duration-200`}
    >
      <div className={`flex items-center ${collapsed ? "flex-col gap-3" : "justify-between"}`}>
        <div className={`flex items-center gap-3 ${collapsed ? "" : "px-2"}`}>
          <img src={logo} alt="AniSave" className="h-10 w-10 shrink-0 rounded-full" />
          {!collapsed && (
            <div className="leading-tight">
              <p className="font-semibold">AniSave</p>
              <p className="text-xs text-white/80">Farmer Portal</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      <nav className="mt-8 flex flex-col gap-2">
        {navItems.map(({ to, label, icon: Icon, showsUnread }) => {
          const badge = showsUnread ? unreadTotal : 0;
          return (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                  collapsed ? "justify-center px-2" : ""
                } ${isActive ? "bg-[#8ee6b0] text-[#1f5c42]" : "text-white/90 hover:bg-white/10"}`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && label}
              {badge > 0 && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white ${
                    collapsed ? "absolute right-1 top-1" : "ml-auto"
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
        title={collapsed ? "Log out" : undefined}
        className={`mt-auto flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white/90 transition hover:bg-white/10 ${
          collapsed ? "justify-center px-2" : ""
        }`}
      >
        <LogOut className="h-5 w-5 shrink-0" />
        {!collapsed && "Log out"}
      </button>

      {confirmingLogout && (
        <LogoutConfirmModal onClose={() => setConfirmingLogout(false)} onConfirm={handleLogout} />
      )}
    </aside>
  );
}
