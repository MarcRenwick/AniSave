import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu,
  ArrowLeft,
  Search,
  ShoppingBasket,
  CircleUserRound,
  Store,
  Settings,
  LogIn,
  UserPlus,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import LogoutConfirmModal from "../components/LogoutConfirmModal";

export default function BuyerStoreLayout({ children, search, onSearchChange, onBack }) {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#cdeac3]">
      <div className="sticky top-0 z-20 grid grid-cols-[auto_1fr_auto] items-center gap-4 bg-[#2f8f66] px-4 py-3">
        <div>
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="rounded-full p-2 text-white hover:bg-white/10"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-full p-2 text-white hover:bg-white/10"
                aria-label="Menu"
              >
                <Menu className="h-6 w-6" />
              </button>

              {menuOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 rounded-xl bg-white py-2 text-base shadow-2xl">
                  <Link
                    to="/buyer/marketplace"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50"
                  >
                    <Store className="h-5 w-5" />
                    Marketplace
                  </Link>
                  {user ? (
                    <>
                      <Link
                        to="/buyer/settings"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50"
                      >
                        <Settings className="h-5 w-5" />
                        Settings
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setConfirmingLogout(true);
                        }}
                        className="flex w-full items-center gap-3 px-5 py-3 text-left text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-5 w-5" />
                        Log out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50"
                      >
                        <LogIn className="h-5 w-5" />
                        Log In
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-5 py-3 text-gray-700 hover:bg-gray-50"
                      >
                        <UserPlus className="h-5 w-5" />
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search ?? ""}
            onChange={(e) => onSearchChange?.(e.target.value)}
            readOnly={!onSearchChange}
            onFocus={() => {
              if (!onSearchChange) navigate("/buyer/marketplace");
            }}
            placeholder="Search"
            className="w-full rounded-full border-none bg-white py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/buyer/cart"
            className="relative rounded-full p-2 text-white hover:bg-white/10"
            aria-label="Cart"
          >
            <ShoppingBasket className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
                {count}
              </span>
            )}
          </Link>

          <Link
            to={user ? "/buyer/settings" : "/login"}
            className="shrink-0 rounded-full bg-white p-1 text-[#2f8f66]"
            aria-label={user ? "Settings" : "Log in"}
          >
            <CircleUserRound className="h-7 w-7" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl p-4">{children}</div>

      {confirmingLogout && (
        <LogoutConfirmModal onClose={() => setConfirmingLogout(false)} onConfirm={handleLogout} />
      )}
    </div>
  );
}
