import { useEffect, useRef, useState } from "react";
import { Bell, CircleUserRound, X, FileText, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

const notifications = [
  {
    icon: FileText,
    color: "bg-blue-500",
    title: "New Order",
    description: "Marian Salcedo ordered 5kg of tomatoes",
  },
  {
    icon: AlertTriangle,
    color: "bg-red-500",
    title: "Presyo Tumaas",
    description: "The price of tomatoes increased by 10% this week",
  },
  {
    icon: CheckCircle2,
    color: "bg-green-500",
    title: "Done Order",
    description: "You've completed an order",
  },
  {
    icon: Clock,
    color: "bg-yellow-500",
    title: "Ready Order",
    description: "Your order is prepared and ready for pickup",
  },
  {
    icon: AlertTriangle,
    color: "bg-red-500",
    title: "Presyo Tumaas",
    description: "The price of cabbage increased by 5% this week",
  },
];

export default function FarmerTopBar({ children }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

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

  return (
    <div className="relative flex items-center justify-between border-b border-gray-200 px-8 py-6">
      <div>{children}</div>

      <div ref={panelRef} className="relative">
        <div className="flex items-center gap-3 rounded-full bg-[#2f8f66] py-1.5 pl-4 pr-1.5">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="relative"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-white" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
          </button>
          <CircleUserRound className="h-9 w-9 rounded-full bg-white text-[#2f8f66]" />
        </div>

        {open && (
          <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="font-semibold text-gray-900">🔔 Notifications</p>
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
              {notifications.map((note, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${note.color}`}>
                    <note.icon className="h-4 w-4" />
                  </span>
                  <div className="text-sm">
                    <p className="font-semibold text-gray-900">{note.title}</p>
                    <p className="text-gray-500">{note.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
