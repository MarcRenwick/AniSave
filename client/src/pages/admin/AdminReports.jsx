import { useEffect, useState } from "react";
import { FileSearch, Paperclip } from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import AdminTopBar from "../../components/admin/AdminTopBar";
import ReportReviewModal from "../../components/admin/ReportReviewModal";
import { getAdminReports } from "../../services/api";
import usePreserveScroll from "../../hooks/usePreserveScroll";
import { REPORT_STATUSES, reasonLabel, statusMeta } from "../../utils/reports";

const filters = [{ key: "", label: "All" }, ...REPORT_STATUSES];

const formatDate = (date) => new Date(date).toLocaleDateString(undefined, { dateStyle: "medium" });

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [reviewing, setReviewing] = useState(null);
  usePreserveScroll(filter);

  useEffect(() => {
    getAdminReports()
      .then(({ data }) => setReports(data))
      .catch(() => setError("Could not load reports. Is the server running?"))
      .finally(() => setLoading(false));
  }, []);

  const replaceReport = (updated) =>
    setReports((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));

  const countOf = (key) => (key ? reports.filter((r) => r.status === key).length : reports.length);
  const shown = filter ? reports.filter((r) => r.status === filter) : reports;
  const pendingCount = countOf("pending");

  return (
    <AdminLayout>
      <AdminTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">Review what buyers have reported about farmers</p>
      </AdminTopBar>

      <div className="p-8">
        <div className="flex flex-wrap items-center gap-3">
          {filters.map(({ key, label }) => (
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
              {label} <span className="opacity-70">({countOf(key)})</span>
            </button>
          ))}

          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800">
              {pendingCount} report{pendingCount === 1 ? "" : "s"} waiting for review
            </span>
          )}
        </div>

        {loading && <p className="mt-6 text-sm text-gray-500">Loading reports...</p>}
        {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Farmer</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Reported by</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shown.map((report) => {
                  const status = statusMeta(report.status);
                  const open = report.status === "pending" || report.status === "reviewed";
                  return (
                    <tr key={report._id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">
                          {report.farmer?.farmName || report.farmer?.name || "Deleted account"}
                        </p>
                        <p className="text-xs text-gray-500">{report.farmer?.username}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {reasonLabel(report.reason)}
                        {report.evidence?.length > 0 && (
                          <span
                            title={`${report.evidence.length} photo${report.evidence.length === 1 ? "" : "s"} attached`}
                            className="ml-2 inline-flex items-center gap-0.5 text-xs text-gray-400"
                          >
                            <Paperclip className="h-3 w-3" />
                            {report.evidence.length}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{report.reporter?.name || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(report.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setReviewing(report)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[#2f8f66] px-3 py-1.5 text-xs font-semibold text-[#2f8f66] hover:bg-green-50"
                          >
                            <FileSearch className="h-3.5 w-3.5" />
                            {open ? "Review" : "View"}
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
                {reports.length === 0 ? "No reports yet." : "No reports with this status."}
              </p>
            )}
          </div>
        )}
      </div>

      {reviewing && (
        <ReportReviewModal report={reviewing} onClose={() => setReviewing(null)} onChanged={replaceReport} />
      )}
    </AdminLayout>
  );
}
