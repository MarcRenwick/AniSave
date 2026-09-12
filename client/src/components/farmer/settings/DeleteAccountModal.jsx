import { useState } from "react";
import Modal from "../../Modal";
import { requestAccountDeletion, confirmAccountDeletion } from "../../../services/api";

export default function DeleteAccountModal({ onClose, onDeleted }) {
  const [step, setStep] = useState("warn"); // "warn" | "otp"
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSendOtp = async () => {
    setError("");
    setSubmitting(true);
    try {
      await requestAccountDeletion();
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await confirmAccountDeletion(code);
      onDeleted();
    } catch (err) {
      setError(err.response?.data?.message || "That OTP is invalid or has expired.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Delete Account" onClose={onClose}>
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      {step === "warn" ? (
        <>
          <p className="text-sm text-gray-700">
            This will <span className="font-semibold text-red-600">permanently delete</span> your
            account, all your product listings, and your order history. This cannot be undone.
          </p>
          <p className="mt-3 text-sm text-gray-600">
            To confirm, we&apos;ll send a one-time OTP to your registered email.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={submitting}
              className="flex-1 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {submitting ? "Sending..." : "Send OTP"}
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleConfirm} className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter the OTP sent to your email to permanently delete your account.
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="------"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg tracking-[0.5em] text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
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
              disabled={submitting}
              className="flex-1 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {submitting ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
