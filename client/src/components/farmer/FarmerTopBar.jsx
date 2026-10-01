import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Bell, X } from "lucide-react";
import { useFarmerNotifications } from "../../hooks/useFarmerNotifications";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../Avatar";
import { EASE } from "../../theme/harvest";

// "JR" for Jonvic Remulla - what the account button shows until there's a photo.
const initialsOf = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "?";

// Every farmer page's header, as the dashboard first had it: on white, with a
// bell that counts what's new and an account button that says what it is.
export default function FarmerTopBar({ children, showActions = true }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const { notifications } = useFarmerNotifications();

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Each notification opens what it is about: the order, or the product.
  const openNote = (note) => {
    setOpen(false);
    navigate(note.to || "/farmer/notifications");
  };

  const count = notifications.length;

  return (
    <div
      className="relative z-20 flex items-center justify-between gap-3 border-b border-gray-200/70 bg-white/60 px-4 py-4 backdrop-blur-sm sm:px-8 sm:py-5"
    >
      <div className="min-w-0">{children}</div>

      {showActions && (
        <div ref={panelRef} className="relative">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="Notifications"
              aria-expanded={open}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              <Bell className="h-5 w-5" />
              {count > 0 && (
                <span
                  data-testid="bell-count"
                  className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-tomato-600 px-1 text-[11px] font-bold text-white ring-2 ring-white"
                >
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </button>
            <Link
              to="/farmer/settings"
              aria-label="My account"
              className="flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-1 text-sm font-semibold text-gray-800 shadow-sm transition hover:bg-gray-50 sm:pr-4"
            >
              {user?.avatar ? (
                <Avatar src={user.avatar} alt="" className="h-9 w-9 rounded-full bg-green-100" iconClass="h-5 w-5" />
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                  {initialsOf(user?.name)}
                </span>
              )}
              <span className="max-sm:hidden">My account</span>
            </Link>
          </div>

          <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.28, ease: EASE }}
              style={{ originX: 1, originY: 0 }}
              className="absolute right-0 top-full z-20 mt-2 w-80 overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-black/5"
              data-testid="bell-panel"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <p className="font-semibold text-gray-900">Notifications</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close notifications"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
                {notifications.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-gray-400">You&apos;re all caught up!</p>
                )}
                {notifications.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => openNote(note)}
                    data-testid="bell-note"
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50"
                  >
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${note.color}`}>
                      <note.icon className="h-4 w-4" />
                    </span>
                    <div className="text-sm">
                      <p className="font-semibold text-gray-900">{note.title}</p>
                      <p className="text-gray-500">{note.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              <Link
                to="/farmer/notifications"
                onClick={() => setOpen(false)}
                className="block border-t border-gray-100 px-4 py-2.5 text-center text-xs font-semibold text-brand hover:bg-gray-50"
              >
                See all notifications
              </Link>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
