import { useState } from "react";
import { Check, X } from "lucide-react";
import Modal from "../Modal";
import { SERVER_URL, reviewFarmerVerification } from "../../services/api";

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value || "—"}</dd>
    </div>
  );
}

function DocumentLink({ path, label }) {
  return (
    <a
      href={`${SERVER_URL}${path}`}
      target="_blank"
      rel="noreferrer"
      title="Open full size"
      className="block"
    >
      <img
        src={`${SERVER_URL}${path}`}
        alt={label}
        className="h-28 w-28 rounded-lg border border-gray-300 object-cover transition hover:border-[#2f8f66]"
      />
    </a>
  );
}

export default function VerificationReviewModal({ farmer, onClose, onReviewed }) {
  const [note, setNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (approved) => {
    setError("");
    setSubmitting(true);
    try {
      const { data } = await reviewFarmerVerification(farmer._id, approved, note.trim());
      onReviewed(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save that. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Review verification" onClose={onClose} maxWidth="max-w-lg">
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <p className="text-xs font-semibold uppercase text-gray-400">Registration details</p>
      <dl className="mt-2 space-y-1.5 text-sm">
        <Row label="Full name" value={farmer.name} />
        <Row label="Username" value={farmer.username} />
        <Row label="Email" value={farmer.email} />
        <Row label="Address" value={farmer.location} />
        <Row label="Farm name" value={farmer.farmName} />
      </dl>

      <p className="mt-5 text-xs font-semibold uppercase text-gray-400">Government-issued ID</p>
      <p className="text-xs text-gray-500">Check the name and details match the registration above.</p>
      <div className="mt-2">
        {farmer.governmentId ? (
          <DocumentLink path={farmer.governmentId} label="Government ID" />
        ) : (
          <p className="text-sm text-gray-400">Not submitted.</p>
        )}
      </div>

      <p className="mt-5 text-xs font-semibold uppercase text-gray-400">Farm-related documents</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {farmer.farmDocuments?.length ? (
          farmer.farmDocuments.map((path) => (
            <DocumentLink key={path} path={path} label="Farm document" />
          ))
        ) : (
          <p className="text-sm text-gray-400">Not submitted.</p>
        )}
      </div>

      {rejecting && (
        <div className="mt-5">
          <label htmlFor="note" className="block text-sm font-medium text-gray-700">
            Reason for rejection
          </label>
          <textarea
            id="note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tell the farmer what to fix before resubmitting"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
          />
        </div>
      )}

      <div className="mt-6 flex gap-3">
        {rejecting ? (
          <>
            <button
              type="button"
              onClick={() => setRejecting(false)}
              disabled={submitting}
              className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => submit(false)}
              disabled={submitting || !note.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Confirm reject
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setRejecting(true)}
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-md border-2 border-red-600 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Reject
            </button>
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-[#2f8f66] py-2 text-sm font-semibold text-white hover:bg-[#267a56] disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              Approve
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
