import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutGrid, Package, ShoppingBag, Settings, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import logo from "../../assets/logo.png";
import { useAuth } from "../../context/AuthContext";
import LogoutConfirmModal from "../LogoutConfirmModal";

const navItems = [
  { to: "/farmer/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/farmer/products", label: "Products", icon: Package },
  { to: "/farmer/orders", label: "Orders", icon: ShoppingBag },
  { to: "/farmer/settings", label: "Settings", icon: Settings },
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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      className={`flex ${
        collapsed ? "w-20" : "w-64"
      } shrink-0 flex-col bg-[#2f8f66] px-4 py-6 text-white transition-all duration-200`}
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
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                collapsed ? "justify-center px-2" : ""
              } ${isActive ? "bg-[#8ee6b0] text-[#1f5c42]" : "text-white/90 hover:bg-white/10"}`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}
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
