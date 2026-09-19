import { useState } from "react";
import Modal from "../Modal";
import { useAuth } from "../../context/AuthContext";
import { createReviewReport } from "../../services/api";

// The last step of reporting a review: the OTP AniSave has just emailed to the
// reporter's address (the same kind of code that confirms deleting an account).
// `report` is what they chose - { ratingId, reason, description? } - and is only
// sent once the code is right.
export default function ReportOtpModal({ report, onClose, onSubmitted }) {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await createReviewReport(report, code);
      onSubmitted();
    } catch (err) {
      setError(err.response?.data?.message || "That OTP is invalid or has expired.");
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Confirm your report" onClose={onClose}>
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleConfirm} className="space-y-4">
        <p className="text-sm text-gray-600">
          To send your report, enter the OTP we emailed to{" "}
          {user?.email ? <span className="font-medium text-gray-800">{user.email}</span> : "your registered email"}. It
          expires in 15 minutes.
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          maxLength={6}
          required
          aria-label="OTP"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="------"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg tracking-[0.5em] text-gray-900 focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="flex-1 rounded-md bg-[#2f8f66] py-2 text-sm font-semibold text-white hover:bg-[#267a56] disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit report"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
