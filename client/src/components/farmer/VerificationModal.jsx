import { useState } from "react";
import Modal from "../Modal";
import VerificationDocumentFields from "../verification/VerificationDocumentFields";
import { submitVerification } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const statusMeta = {
  pending: {
    label: "Pending verification",
    pill: "bg-amber-100 text-amber-800",
    blurb: "An administrator is reviewing your documents. You can list products once approved.",
  },
  approved: {
    label: "Approved",
    pill: "bg-green-100 text-green-700",
    blurb: "Your account is verified - you can list and sell products.",
  },
  rejected: {
    label: "Rejected",
    pill: "bg-red-100 text-red-700",
    blurb: "An administrator rejected your documents. Update them below and resubmit.",
  },
};

export default function VerificationModal({ onClose }) {
  const { user, updateUser } = useAuth();
  const [governmentId, setGovernmentId] = useState(null);
  const [farmDocuments, setFarmDocuments] = useState([]);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const status = user?.verificationStatus || (user?.isVerified ? "approved" : "pending");
  const meta = statusMeta[status];
  const hasDocuments = Boolean(user?.governmentId) && user?.farmDocuments?.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!governmentId && !user?.governmentId) {
      setError("A photo of a valid government-issued ID is required.");
      return;
    }
    if (farmDocuments.length === 0 && !user?.farmDocuments?.length) {
      setError("Add at least one farm-related document.");
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      if (governmentId) data.append("governmentId", governmentId);
      farmDocuments.forEach((file) => data.append("farmDocuments", file));
      const { data: updated } = await submitVerification(data);
      updateUser(updated);
      setGovernmentId(null);
      setFarmDocuments([]);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Could not submit those documents. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Account Verification" onClose={onClose} maxWidth="max-w-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">{meta.blurb}</p>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.pill}`}>
          {meta.label}
        </span>
      </div>

      {status === "rejected" && user?.verificationNote && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="font-semibold">Reason: </span>
          {user.verificationNote}
        </p>
      )}

      {!hasDocuments && status !== "approved" && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          You haven&apos;t submitted your documents yet.
        </p>
      )}

      {error && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      {editing ? (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <VerificationDocumentFields
            governmentId={governmentId}
            farmDocuments={farmDocuments}
            existingGovernmentId={user?.governmentId}
            existingFarmDocuments={user?.farmDocuments || []}
            onGovernmentIdChange={setGovernmentId}
            onFarmDocumentsChange={setFarmDocuments}
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setGovernmentId(null);
                setFarmDocuments([]);
                setError("");
              }}
              disabled={submitting}
              className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-md bg-[#2f8f66] py-2 text-sm font-semibold text-white hover:bg-[#267a56] disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit for review"}
            </button>
          </div>
        </form>
      ) : (
        <>
          {hasDocuments && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase text-gray-400">Documents on file</p>
              <div className="mt-2">
                <VerificationDocumentFields
                  readOnly
                  governmentId={null}
                  farmDocuments={[]}
                  existingGovernmentId={user.governmentId}
                  existingFarmDocuments={user.farmDocuments || []}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-5 w-full rounded-md border-2 border-[#2f8f66] py-2 text-sm font-semibold text-[#2f8f66] transition hover:bg-green-50"
          >
            {hasDocuments ? "Update documents" : "Submit documents"}
          </button>
        </>
      )}
    </Modal>
  );
}
