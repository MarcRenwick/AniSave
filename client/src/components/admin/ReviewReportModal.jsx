import { useEffect, useState } from "react";
import { Check, EyeOff, ShieldOff, Star } from "lucide-react";
import Modal from "../Modal";
import { decideReviewReport, markReviewReportReviewed } from "../../services/api";
import { reviewReasonLabel, reviewStatusMeta } from "../../utils/reviewReports";

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

const accountStatus = (person) => {
  if (!person?.isBanned) return "Active";
  return person.suspendedAt ? "Suspended" : "Banned";
};

const roleLabel = (role) => (role === "farmer" ? "Farmer" : "Buyer");

const OUTCOMES = {
  dismissed: { title: "Report dismissed", color: "bg-gray-50 text-gray-700" },
  removed: { title: "Review removed", color: "bg-orange-50 text-orange-800" },
  suspended: { title: "Reviewer suspended and review removed", color: "bg-red-50 text-red-800" },
};

// One reported review, in full: who wrote it and what it said, who reported it and
// why - and, until it's settled, the admin's decision. Opening a Pending report
// marks it Reviewed.
export default function ReviewReportModal({ report, onClose, onChanged }) {
  const [current, setCurrent] = useState(report);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(null); // "remove" | "suspend" | null
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (report.status !== "pending") return undefined;
    let cancelled = false;
    markReviewReportReviewed(report._id)
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
      const { data } = await decideReviewReport(current._id, action, note.trim());
      setCurrent(data);
      onChanged(data);
      setConfirming(null);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save that. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const status = reviewStatusMeta(current.status);
  const outcome = OUTCOMES[current.status];
  const author = current.reviewAuthor;
  const reporter = current.reporter;
  const snapshot = current.reviewSnapshot;
  const authorName = author?.name || "this reviewer";

  return (
    <Modal title="Review report" onClose={onClose} maxWidth="max-w-lg">
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.color}`}>{status.label}</span>
        <span className="text-xs text-gray-500">Submitted {formatWhen(current.createdAt)}</span>
      </div>

      <p className="mt-5 text-xs font-semibold uppercase text-gray-400">Reported review</p>
      <div className="mt-2 rounded-md bg-gray-50 px-3 py-2.5">
        <p className="flex items-center gap-1 text-sm text-gray-700">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={`h-4 w-4 ${n <= (snapshot?.stars || 0) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
            />
          ))}
          <span className="ml-1 text-xs text-gray-500">on {current.product?.title || "a product that was removed"}</span>
        </p>
        <p className="mt-1.5 whitespace-pre-line text-sm text-gray-800">
          {snapshot?.comment || <span className="text-gray-400">No comment - stars only.</span>}
        </p>
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <Row label="Shown to buyers" value={current.rating?.removedAt ? "No - removed" : "Yes"} />
      </dl>

      <p className="mt-5 text-xs font-semibold uppercase text-gray-400">Written by</p>
      <dl className="mt-2 space-y-1.5 text-sm">
        <Row label="Name" value={author?.name} />
        <Row label="Username" value={author?.username} />
        <Row label="Account" value={accountStatus(author)} />
      </dl>

      <p className="mt-5 text-xs font-semibold uppercase text-gray-400">Reported by</p>
      <dl className="mt-2 space-y-1.5 text-sm">
        <Row label="Name" value={reporter?.name} />
        <Row label="Username" value={reporter?.username} />
        <Row label="Role" value={reporter?.role && roleLabel(reporter.role)} />
      </dl>

      <p className="mt-5 text-xs font-semibold uppercase text-gray-400">Reason</p>
      <p className="mt-2 text-sm font-medium text-gray-900">{reviewReasonLabel(current.reason)}</p>
      {current.description && (
        <p className="mt-2 whitespace-pre-line rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
          {current.description}
        </p>
      )}

      {outcome ? (
        <div className={`mt-6 rounded-lg px-4 py-3 text-sm ${outcome.color}`}>
          <p className="font-semibold">
            {outcome.title}
            {current.decidedAt && <span className="font-normal"> · {formatWhen(current.decidedAt)}</span>}
          </p>
          {current.decidedBy && <p className="mt-0.5 text-xs">Decided by {current.decidedBy.name}</p>}
          {current.decisionNote && <p className="mt-2 whitespace-pre-line">{current.decisionNote}</p>}
        </div>
      ) : (
        <div className="mt-6">
          {author?.isBanned && (
            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              This reviewer&apos;s account is already restricted.
            </p>
          )}

          <label htmlFor="review-decision-note" className="block text-sm font-medium text-gray-700">
            Decision note
          </label>
          <textarea
            id="review-decision-note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Required to suspend the reviewer; optional otherwise"
            className="mt-1 w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
          />

          {confirming ? (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3">
              <p className="text-sm text-red-800">
                {confirming === "suspend" ? (
                  <>
                    Suspend <span className="font-semibold">{authorName}</span>? They will be logged out at once and
                    can&apos;t log in again, and this review will be removed.
                  </>
                ) : (
                  <>Remove this review? It will be hidden and will no longer count towards the product&apos;s rating.</>
                )}
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  disabled={submitting}
                  className="flex-1 rounded-md border border-gray-300 bg-white py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => decide(confirming)}
                  disabled={submitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {submitting ? "Saving..." : confirming === "suspend" ? "Confirm suspend" : "Confirm remove"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => decide("dismiss")}
                disabled={submitting}
                className="flex min-w-32 flex-1 items-center justify-center gap-2 rounded-md border-2 border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => setConfirming("remove")}
                disabled={submitting}
                className="flex min-w-32 flex-1 items-center justify-center gap-2 rounded-md border-2 border-orange-300 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-60"
              >
                <EyeOff className="h-4 w-4" />
                Remove review
              </button>
              <button
                type="button"
                onClick={() => setConfirming("suspend")}
                disabled={submitting || !note.trim()}
                title={note.trim() ? undefined : "Write a note first - it's recorded with the suspension"}
                className="flex min-w-32 flex-1 items-center justify-center gap-2 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <ShieldOff className="h-4 w-4" />
                Suspend user
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
