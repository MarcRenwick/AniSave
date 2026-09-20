import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import Modal from "../../Modal";
import Avatar from "../../Avatar";
import { getBlockedUsers, unblockUser } from "../../../services/api";

// Profile > Blocked Users: every shop this buyer has blocked, most recent
// first, each with the way back. Unblocking here is all it takes for the shop
// and its listings to start showing up again.
export default function BlockedUsersModal({ onClose, onUnblocked }) {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState(null);

  useEffect(() => {
    getBlockedUsers()
      .then(({ data }) => setBlocked(data))
      .catch(() => setError("Could not load your blocked users."))
      .finally(() => setLoading(false));
  }, []);

  const handleUnblock = async (farmer) => {
    setError("");
    setPendingId(farmer._id);
    try {
      await unblockUser(farmer._id);
      setBlocked((prev) => prev.filter((f) => f._id !== farmer._id));
      onUnblocked?.(farmer);
    } catch (err) {
      setError(err.response?.data?.message || "Could not unblock them. Please try again.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Modal title="Blocked Users" onClose={onClose} maxWidth="max-w-md">
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : blocked.length === 0 ? (
        <p className="text-sm text-gray-500">
          You haven&apos;t blocked anyone. Blocking a shop hides it from you and stops it selling to
          you - you can do it from the shop&apos;s page.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {blocked.map((farmer) => (
            <li key={farmer._id} className="flex items-center gap-3 py-3">
              <Avatar
                src={farmer.avatar}
                alt={farmer.farmName || farmer.name}
                className="h-10 w-10 shrink-0 rounded-full bg-green-100 text-[#2f8f66]"
                iconClass="h-5 w-5"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {farmer.farmName || farmer.name}
                </p>
                {farmer.location && (
                  <p className="flex items-center gap-1 truncate text-xs text-gray-500">
                    <MapPin className="h-3 w-3 shrink-0 text-gray-400" />
                    {farmer.location}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleUnblock(farmer)}
                disabled={pendingId === farmer._id}
                className="shrink-0 rounded-md border-2 border-[#2f8f66] px-4 py-1.5 text-xs font-semibold text-[#2f8f66] transition hover:bg-green-50 disabled:opacity-60"
              >
                {pendingId === farmer._id ? "Unblocking..." : "Unblock"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
