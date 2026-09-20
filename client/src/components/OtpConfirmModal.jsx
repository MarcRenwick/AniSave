import { useState } from "react";
import Modal from "./Modal";
import { useAuth } from "../context/AuthContext";

// The last step of anything confirmed by email: the six-digit code AniSave has
// just sent to the person's registered address. `onConfirm(code)` does the
// thing and throws if the code is wrong; on success the page it belongs to
// takes over, so this dialog stays busy until it goes away.
export default function OtpConfirmModal({
  title,
  intro,
  confirmLabel = "Confirm",
  submittingLabel = "Confirming...",
  danger = false,
  onConfirm,
  onClose,
}) {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onConfirm(code);
    } catch (err) {
      setError(err.response?.data?.message || "That OTP is invalid or has expired.");
      setSubmitting(false);
    }
  };

  const accent = danger
    ? "bg-red-600 hover:bg-red-700 focus:border-red-500 focus:ring-red-500"
    : "bg-[#2f8f66] hover:bg-[#267a56] focus:border-[#2f8f66] focus:ring-[#2f8f66]";

  return (
    <Modal title={title} onClose={onClose}>
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">
          {intro}{" "}
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
          className={`w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg tracking-[0.5em] text-gray-900 focus:outline-none focus:ring-1 ${accent.split(" ").filter((c) => c.startsWith("focus:")).join(" ")}`}
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
            className={`flex-1 rounded-md py-2 text-sm font-semibold text-white disabled:opacity-60 ${accent.split(" ").filter((c) => !c.startsWith("focus:")).join(" ")}`}
          >
            {submitting ? submittingLabel : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
