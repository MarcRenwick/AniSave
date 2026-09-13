import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import AdminTopBar from "../../components/admin/AdminTopBar";
import TopUpConfirmModal from "../../components/admin/TopUpConfirmModal";
import { getAdminTopUpRequests, approveTopUp, rejectTopUp } from "../../services/api";

const filters = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default function AdminTopUps() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("pending");
  const [action, setAction] = useState(null);

  useEffect(() => {
    setLoading(true);
    getAdminTopUpRequests(status)
      .then(({ data }) => setRequests(data))
      .catch(() => setError("Could not load top-up requests. Is the server running?"))
      .finally(() => setLoading(false));
  }, [status]);

  const handleConfirm = async () => {
    const { target, type } = action;
    const { data } = type === "approve" ? await approveTopUp(target._id) : await rejectTopUp(target._id);
    setRequests((prev) => prev.filter((r) => r._id !== data._id));
    setAction(null);
  };

  return (
    <AdminLayout>
      <AdminTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">Top-ups</h1>
        <p className="text-sm text-gray-500">Review and approve buyer wallet top-up requests</p>
      </AdminTopBar>

      <div className="p-8">
        <div className="flex gap-3">
          {filters.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                status === key
                  ? "bg-[#2f8f66] text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && <p className="mt-6 text-sm text-gray-500">Loading requests...</p>}
        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3">Status</th>
                  {status === "pending" && <th className="px-4 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((r) => (
                  <tr key={r._id}>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.buyer?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{r.buyer?.username || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">₱{r.amount}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(r.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "pending" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-600">
                          <Clock className="h-3.5 w-3.5" /> Pending
                        </span>
                      )}
                      {r.status === "approved" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                        </span>
                      )}
                      {r.status === "rejected" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                          <XCircle className="h-3.5 w-3.5" /> Rejected
                        </span>
                      )}
                    </td>
                    {status === "pending" && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setAction({ target: r, type: "reject" })}
                            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => setAction({ target: r, type: "approve" })}
                            className="inline-flex items-center gap-1.5 rounded-md bg-[#2f8f66] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#267a56]"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {requests.length === 0 && (
              <p className="p-6 text-center text-sm text-gray-400">No {status} top-up requests.</p>
            )}
          </div>
        )}
      </div>

      {action && (
        <TopUpConfirmModal
          request={action.target}
          action={action.type}
          onClose={() => setAction(null)}
          onConfirm={handleConfirm}
        />
      )}
    </AdminLayout>
  );
}
