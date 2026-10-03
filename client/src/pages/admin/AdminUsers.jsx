import { useEffect, useState } from "react";
import { ShieldOff, ShieldCheck, FileSearch } from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import AdminTopBar from "../../components/admin/AdminTopBar";
import BanConfirmModal from "../../components/admin/BanConfirmModal";
import VerificationReviewModal from "../../components/admin/VerificationReviewModal";
import { getAdminUsers, banUser, unbanUser } from "../../services/api";
import usePreserveScroll from "../../hooks/usePreserveScroll";
import useLiveRefresh from "../../hooks/useLiveRefresh";
import { activeAgo } from "../../utils/activity";
import {
  VERIFICATION_META,
  hasDocuments,
  isVerificationDecided,
  verificationKey,
} from "../../utils/verification";

const filters = [
  { key: "", label: "All" },
  { key: "farmer", label: "Farmers" },
  { key: "buyer", label: "Buyers" },
];

// Who is around changes by the minute, so the list is quietly fetched again
// this often while the page is open.
const REFRESH_MS = 30 * 1000;

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const [target, setTarget] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  // Only the people who have AniSave open right now.
  const [activeOnly, setActiveOnly] = useState(false);
  usePreserveScroll(role);

  useEffect(() => {
    setLoading(true);
    getAdminUsers(role)
      .then(({ data }) => setUsers(data))
      .catch(() => setError("Could not load users. Is the server running?"))
      .finally(() => setLoading(false));

    // Nothing on screen changes while this happens unless someone came or went.
    const timer = setInterval(() => {
      getAdminUsers(role)
        .then(({ data }) => setUsers(data))
        .catch(() => {});
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [role]);

  // A new account, a farmer sending documents, or another admin's decision
  // shows here as soon as it happens, not at the next quiet fetch.
  useLiveRefresh(["admin:changed"], () => getAdminUsers(role).then(({ data }) => setUsers(data)), {
    when: (change) => change.kind === "users",
  });

  const replaceUser = (updated) =>
    setUsers((prev) => prev.map((u) => (u._id === updated._id ? updated : u)));

  const handleConfirm = async (reason) => {
    const { data } = target.isBanned ? await unbanUser(target._id) : await banUser(target._id, reason);
    replaceUser(data);
    setTarget(null);
  };

  const pendingCount = users.filter(
    (u) => u.role === "farmer" && verificationKey(u) === "pending"
  ).length;
  const activeCount = users.filter((u) => u.online).length;
  const shown = activeOnly ? users.filter((u) => u.online) : users;

  return (
    <AdminLayout>
      <AdminTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500">Manage farmer and buyer accounts</p>
      </AdminTopBar>

      <div className="p-4 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setRole(key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                role === key
                  ? "bg-[#2f8f66] text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setActiveOnly((on) => !on)}
            aria-pressed={activeOnly}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              activeOnly
                ? "bg-[#2f8f66] text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${activeOnly ? "bg-white" : "bg-green-500"}`} aria-hidden="true" />
            Active now ({activeCount})
          </button>

          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800">
              {pendingCount} farmer{pendingCount === 1 ? "" : "s"} awaiting verification
            </span>
          )}
        </div>

        {loading && <p className="mt-6 text-sm text-gray-500">Loading users...</p>}
        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((u) => {
                  const meta = VERIFICATION_META[verificationKey(u)];
                  const decided = isVerificationDecided(u);
                  return (
                    <tr key={u._id}>
                      <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                      <td className="px-4 py-3 text-gray-600">{u.username}</td>
                      <td className="px-4 py-3 capitalize text-gray-600">{u.role}</td>
                      <td className="px-4 py-3 text-gray-600">{u.location || "—"}</td>
                      <td className="px-4 py-3">
                        {u.role === "farmer" ? (
                          <span
                            title={meta?.title}
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${meta?.color || "bg-gray-100 text-gray-600"}`}
                          >
                            {meta?.label || "—"}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Not required</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.isBanned ? (
                          <span
                            title={u.suspendedAt ? "Suspended after a report was reviewed" : undefined}
                            className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700"
                          >
                            {u.suspendedAt ? "Suspended" : "Banned"}
                          </span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3" data-testid="user-activity">
                        {u.online ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                            <span className="h-2 w-2 rounded-full bg-green-500 ring-2 ring-green-100" aria-hidden="true" />
                            Active now
                          </span>
                        ) : u.lastActiveAt ? (
                          <span className="text-xs text-gray-500">{activeAgo(u.lastActiveAt)}</span>
                        ) : (
                          <span className="text-xs text-gray-400">No activity yet</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {u.role === "farmer" && hasDocuments(u) && (
                            <button
                              type="button"
                              onClick={() => setReviewing(u)}
                              title={
                                decided
                                  ? "Already decided - the documents can still be looked at"
                                  : undefined
                              }
                              className="inline-flex items-center gap-1.5 rounded-md border border-[#2f8f66] px-3 py-1.5 text-xs font-semibold text-[#2f8f66] hover:bg-green-50"
                            >
                              <FileSearch className="h-3.5 w-3.5" />
                              {decided ? "View" : "Review"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setTarget(u)}
                            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                              u.isBanned
                                ? "bg-[#2f8f66] text-white hover:bg-[#267a56]"
                                : "bg-red-600 text-white hover:bg-red-700"
                            }`}
                          >
                            {u.isBanned ? (
                              <>
                                <ShieldCheck className="h-3.5 w-3.5" /> Unban
                              </>
                            ) : (
                              <>
                                <ShieldOff className="h-3.5 w-3.5" /> Ban
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {shown.length === 0 && (
              <p className="p-6 text-center text-sm text-gray-400">
                {activeOnly && users.length > 0 ? "Nobody is on AniSave right now." : "No users found."}
              </p>
            )}
          </div>
        )}
      </div>

      {target && (
        <BanConfirmModal user={target} onClose={() => setTarget(null)} onConfirm={handleConfirm} />
      )}

      {reviewing && (
        <VerificationReviewModal
          farmer={reviewing}
          onClose={() => setReviewing(null)}
          onReviewed={(updated) => {
            replaceUser(updated);
            setReviewing(null);
          }}
        />
      )}
    </AdminLayout>
  );
}
