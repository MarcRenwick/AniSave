import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, ArrowLeft, Search, ShoppingBasket, CircleUserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import LogoutConfirmModal from "../components/LogoutConfirmModal";

export default function BuyerStoreLayout({ children, search, onSearchChange, onBack }) {
  const { user, logout } = useAuth();
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
      <div className="sticky top-0 z-20 flex items-center gap-3 bg-[#2f8f66] px-4 py-3">
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
              <Menu className="h-5 w-5" />
            </button>

            {menuOpen && (
              <div className="absolute left-0 top-full mt-2 w-56 rounded-lg bg-white py-2 text-sm shadow-xl">
                <Link
                  to="/buyer/marketplace"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Marketplace
                </Link>
                {user ? (
                  <>
                    <Link
                      to="/buyer/settings"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setConfirmingLogout(true);
                      }}
                      className="block w-full px-4 py-2 text-left text-red-600 hover:bg-red-50"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      Log In
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div className="relative max-w-xl flex-1">
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

        <button type="button" className="rounded-full p-2 text-white hover:bg-white/10" aria-label="Cart">
          <ShoppingBasket className="h-5 w-5" />
        </button>

        {user ? (
          <CircleUserRound className="h-9 w-9 shrink-0 rounded-full bg-white text-[#2f8f66]" />
        ) : (
          <Link to="/login" className="shrink-0 rounded-full bg-white p-1 text-[#2f8f66]">
            <CircleUserRound className="h-7 w-7" />
          </Link>
        )}
      </div>

      <div className="mx-auto max-w-5xl p-4">{children}</div>

      {confirmingLogout && (
        <LogoutConfirmModal onClose={() => setConfirmingLogout(false)} onConfirm={handleLogout} />
      )}
    </div>
  );
}
