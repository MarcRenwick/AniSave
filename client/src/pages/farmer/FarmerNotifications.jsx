import { useState } from "react";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import { useFarmerNotifications } from "../../hooks/useFarmerNotifications";
import { categoryLabels } from "../../utils/notifications";

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

      <div className="p-8">
        <div className="flex flex-wrap gap-3">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === key
                  ? "bg-[#2f8f66] text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="bg-[#2f8f66] px-4 py-2 text-sm font-semibold text-white">Select</div>

          <div className="p-4">
            {loading && <p className="text-sm text-gray-500">Loading notifications...</p>}

            {!loading && visible.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {visible.map((note) => (
                  <div key={note.id} className="overflow-hidden rounded-lg border border-gray-200">
                    <div className={`px-3 py-1.5 text-sm font-semibold text-white ${note.color}`}>
                      {note.title}
                    </div>
                    <div className="flex flex-col items-center gap-3 p-4 text-center">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${note.color}`}>
                        <note.icon className="h-5 w-5" />
                      </span>
                      <p className="text-xs text-gray-600">{note.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && (
              <p className="mt-6 text-center text-sm text-gray-400">You&apos;re all caught up!</p>
            )}
          </div>
        </div>
      </div>
    </FarmerLayout>
  );
}
