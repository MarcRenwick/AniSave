import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import { SproutLoader, Stagger, StaggerItem } from "../../components/motion";
import { useFarmerNotifications } from "../../hooks/useFarmerNotifications";
import { categoryLabels } from "../../utils/notifications";
import { SPRING } from "../../theme/harvest";

// Each kind of notification in its harvest colour: a new order in green, a
// product running low in gold, one sold out in tomato.
const LOOK = {
  order: { band: "bg-forest-700", tile: "bg-forest-50 text-forest-700 ring-forest-100" },
  "low-stock": { band: "bg-gold-500", tile: "bg-gold-50 text-gold-700 ring-gold-200" },
  "out-of-stock": { band: "bg-tomato-600", tile: "bg-tomato-50 text-tomato-700 ring-tomato-100" },
};

export default function FarmerNotifications() {
  const { notifications, loading } = useFarmerNotifications();
  const [filter, setFilter] = useState("all");

  const tabs = [
    { key: "all", label: "All" },
    ...Object.entries(categoryLabels).map(([key, label]) => ({
      key,
      label: `${label} (${notifications.filter((n) => n.category === key).length})`,
    })),
  ];

  const visible = filter === "all" ? notifications : notifications.filter((n) => n.category === filter);

  return (
    <FarmerLayout>
      <FarmerTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500">
          Stay updated with your orders, market trends, and important alerts
        </p>
      </FarmerTopBar>

      <div className="p-4 sm:p-8">
        {/* The chosen filter's green slides across to the next one picked. */}
        <div className="inline-flex flex-wrap gap-1.5 rounded-full bg-white/70 p-1.5 shadow-soft ring-1 ring-black/5">
          {tabs.map(({ key, label }) => {
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={active}
                className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active ? "text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {active && (
                  <motion.span layoutId="notification-filter-pill" className="absolute inset-0 rounded-full bg-forest-700 shadow-sm" transition={SPRING} />
                )}
                <span className="relative">{label}</span>
              </button>
            );
          })}
        </div>

        <div className="harvest-card mt-6 p-4 sm:p-5">
          {loading && <SproutLoader label="Loading notifications..." />}

          {!loading && visible.length > 0 && (
            <Stagger key={filter} on="mount" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
              {visible.map((note) => {
                const look = LOOK[note.kind] || LOOK.order;
                return (
                  <StaggerItem key={note.id} y={16}>
                    <Link
                      to={note.to}
                      className="harvest-card harvest-card-hover group relative flex h-full flex-col overflow-hidden p-4"
                      data-testid="notification-card"
                    >
                      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${look.band}`} />
                      <div className="flex items-center gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${look.tile}`}>
                          <note.icon className="h-5 w-5" />
                        </span>
                        <p className="font-display text-base font-semibold text-gray-900">{note.title}</p>
                      </div>
                      <p className="mt-3 flex-1 text-sm text-gray-600">{note.description}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand">
                        {note.action} →
                        <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                      </span>
                    </Link>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}

          {!loading && (
            <p className="mt-6 text-center text-sm text-gray-400">You&apos;re all caught up!</p>
          )}
        </div>
      </div>
    </FarmerLayout>
  );
}
