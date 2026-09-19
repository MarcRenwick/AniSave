import { useEffect, useState } from "react";
import { Check, ShieldOff, X } from "lucide-react";
import Modal from "../Modal";
import ProtectedImage from "../ProtectedImage";
import { openDocument } from "../../utils/documents";
import { decideReport, markReportReviewed } from "../../services/api";
import { reasonLabel, statusMeta } from "../../utils/reports";

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value || "—"}</dd>
    </div>
  );
}

const formatWhen = (date) =>
  date ? new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

const accountStatus = (farmer) => {
  if (!farmer?.isBanned) return "Active";
  return farmer.suspendedAt ? "Suspended" : "Banned";
};

// One report, in full: who sent it, who it's about, what they said and the
// photos they attached - and, until it's settled, the admin's decision. Opening
// a Pending report marks it Reviewed.
export default function ReportReviewModal({ report, onClose, onChanged }) {
  const [current, setCurrent] = useState(report);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (report.status !== "pending") return undefined;
    let cancelled = false;
    markReportReviewed(report._id)
      .then(({ data }) => {
        if (cancelled) return;
        setCurrent(data);
        onChanged(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Only when this report is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report._id]);

  const decide = async (action) => {
    setError("");
    setSubmitting(true);
    try {
      const { data } = await decideReport(current._id, action, note.trim());
      setCurrent(data);
      onChanged(data);
      setConfirming(false);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save that. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const status = statusMeta(current.status);
  const settled = current.status === "dismissed" || current.status === "suspended";
  const farmer = current.farmer;

  return (
    <Modal title="Review report" onClose={onClose} maxWidth="max-w-lg">
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.color}`}>{status.label}</span>
        <span className="text-xs text-gray-500">Submitted {formatWhen(current.createdAt)}</span>
      </div>

      <p className="mt-5 text-xs font-semibold uppercase text-gray-400">Reported farmer</p>
      <dl className="mt-2 space-y-1.5 text-sm">
        <Row label="Farm" value={farmer?.farmName} />
        <Row label="Owner" value={farmer?.name} />
        <Row label="Username" value={farmer?.username} />
        <Row label="Location" value={farmer?.location} />
        <Row label="Account" value={accountStatus(farmer)} />
      </dl>

      <p className="mt-5 text-xs font-semibold uppercase text-gray-400">Reported by</p>
      <dl className="mt-2 space-y-1.5 text-sm">
        <Row label="Buyer" value={current.reporter?.name} />
        <Row label="Username" value={current.reporter?.username} />
      </dl>

      <p className="mt-5 text-xs font-semibold uppercase text-gray-400">Reason</p>
      <p className="mt-2 text-sm font-medium text-gray-900">{reasonLabel(current.reason)}</p>

      <p className="mt-5 text-xs font-semibold uppercase text-gray-400">Description</p>
      <p className="mt-2 whitespace-pre-line rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
        {current.description}
      </p>

      <p className="mt-5 text-xs font-semibold uppercase text-gray-400">Evidence</p>
      {current.evidence?.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {current.evidence.map((path, i) => (
            <button
              key={path}
              type="button"
              onClick={() => openDocument(path).catch(() => {})}
              title="Open full size"
              className="block"
            >
              <ProtectedImage
                path={path}
                alt={`Evidence ${i + 1}`}
                className="h-24 w-24 rounded-lg border border-gray-300 object-cover transition hover:border-[#2f8f66]"
              />
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-gray-400">No evidence was attached.</p>
      )}

      {settled ? (
        <div
          className={`mt-6 rounded-lg px-4 py-3 text-sm ${
            current.status === "suspended" ? "bg-red-50 text-red-800" : "bg-gray-50 text-gray-700"
          }`}
        >
          <p className="font-semibold">
            {current.status === "suspended" ? "Farmer suspended" : "Report dismissed"}
            {current.decidedAt && <span className="font-normal"> · {formatWhen(current.decidedAt)}</span>}
          </p>
          {current.decidedBy && <p className="mt-0.5 text-xs">Decided by {current.decidedBy.name}</p>}
          {current.decisionNote && <p className="mt-2 whitespace-pre-line">{current.decisionNote}</p>}
        </div>
      ) : (
        <div className="mt-6">
          {farmer?.isBanned && (
            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              This farmer&apos;s account is already restricted.
            </p>
          )}

          <label htmlFor="decision-note" className="block text-sm font-medium text-gray-700">
            Decision note
          </label>
          <textarea
            id="decision-note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Required to suspend the farmer; optional if you dismiss the report"
            className="mt-1 w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
          />

          {confirming ? (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3">
              <p className="text-sm text-red-800">
                Suspend <span className="font-semibold">{farmer?.farmName || farmer?.name}</span>? They will be logged
                out at once, can&apos;t log in again, and their shop and products will be hidden from buyers.
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={submitting}
                  className="flex-1 rounded-md border border-gray-300 bg-white py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => decide("suspend")}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  <ShieldOff className="h-4 w-4" />
                  {submitting ? "Suspending..." : "Confirm suspend"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => decide("dismiss")}
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-md border-2 border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                Dismiss report
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={submitting || !note.trim()}
                title={note.trim() ? undefined : "Write a note first - it's recorded with the suspension"}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Suspend farmer
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
