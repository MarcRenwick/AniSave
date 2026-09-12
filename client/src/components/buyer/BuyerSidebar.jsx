import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Store, Settings, LogIn, UserPlus, LogOut } from "lucide-react";
import logo from "../../assets/logo.png";
import { useAuth } from "../../context/AuthContext";
import LogoutConfirmModal from "../LogoutConfirmModal";

export default function BuyerSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const navItems = [
    { to: "/buyer/marketplace", label: "Marketplace", icon: Store },
    ...(user ? [{ to: "/buyer/settings", label: "Settings", icon: Settings }] : []),
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-[#2f8f66] px-4 py-6 text-white">
      <div className="flex items-center gap-3 px-2">
        <img src={logo} alt="AniSave" className="h-10 w-10 rounded-full" />
        <div className="leading-tight">
          <p className="font-semibold">AniSave</p>
          <p className="text-xs text-white/80">{user ? "Buyer" : "Browsing as Guest"}</p>
        </div>
      </div>

      <nav className="mt-8 flex flex-col gap-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                isActive ? "bg-[#8ee6b0] text-[#1f5c42]" : "text-white/90 hover:bg-white/10"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        {user ? (
          <button
            type="button"
            onClick={() => setConfirmingLogout(true)}
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white/90 transition hover:bg-white/10"
          >
            <LogOut className="h-5 w-5" />
            Log out
          </button>
        ) : (
          <>
            <NavLink
              to="/login"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white/90 transition hover:bg-white/10"
            >
              <LogIn className="h-5 w-5" />
              Log In
            </NavLink>
            <NavLink
              to="/register"
              className="flex items-center gap-3 rounded-lg bg-[#8ee6b0] px-4 py-3 text-sm font-medium text-[#1f5c42] transition hover:bg-[#7ad89e]"
            >
              <UserPlus className="h-5 w-5" />
              Sign Up
            </NavLink>
          </>
        )}
      </div>

      {confirmingLogout && (
        <LogoutConfirmModal onClose={() => setConfirmingLogout(false)} onConfirm={handleLogout} />
      )}
    </aside>
  );
}
