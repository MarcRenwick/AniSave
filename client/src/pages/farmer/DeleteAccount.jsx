import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import OtpConfirmModal from "../../components/OtpConfirmModal";
import AccountDeletionTerms from "../../components/farmer/AccountDeletionTerms";
import { confirmAccountDeletion, requestAccountDeletion } from "../../services/api";
import { DELETION_REASONS, MAX_DELETION_DETAIL, deletionReasonLabel } from "../../utils/accountDeletion";
import { useSmoothBack, withPageTransition } from "../../utils/pageTransition";

// A farmer asking for their account to be deleted: choose a reason, then check
// the request (the reason, the address the code will go to, and agreeing to the
// deletion terms) and submit it. AniSave emails a one-time code, and the
// account is only deleted once it is entered - the same confirmation the app
// has always used, now at the end of the form.
export default function DeleteAccount() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const leaveToSettings = useSmoothBack("/farmer/settings");

  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const isOther = reason === "other";
  const ready = Boolean(reason) && (!isOther || detail.trim().length > 0) && agreed;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ready || sending) return;
    setError("");
    setSending(true);
    try {
      await requestAccountDeletion({
        reason,
        ...(isOther ? { description: detail.trim() } : {}),
        agreedToTerms: true,
      });
      setConfirming(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // The account is gone by the time this resolves, so the session goes with it.
  const handleConfirm = async (code) => {
    await confirmAccountDeletion(code);
    withPageTransition(() => {
      logout();
      navigate("/login");
    });
  };

  return (
    <div className="min-h-screen bg-[#eaf6ec]">
      <div className="flex items-center gap-3 bg-[#2f8f66] px-4 py-4 text-white">
        <button
          type="button"
          onClick={reason ? () => setReason("") : leaveToSettings}
          aria-label={reason ? "Back to the reasons" : "Back to settings"}
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <h1 className="flex-1 pr-6 text-center text-xl font-semibold">
          {reason ? "Request Account Deletion" : "Choose Deletion Reason"}
        </h1>
      </div>

      <div className="mx-auto max-w-3xl p-4 sm:p-8">
        {!reason ? (
          <div className="overflow-hidden rounded-2xl bg-[#bde8b9] shadow-sm" role="radiogroup" aria-label="Deletion reason">
            {DELETION_REASONS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked="false"
                onClick={() => setReason(key)}
                className="flex w-full items-center justify-between gap-3 border-b border-green-900/20 bg-[#7dd39b] px-5 py-3.5 text-left text-sm font-medium text-gray-900 transition hover:bg-[#6fc78f]"
              >
                {label}
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl bg-[#bde8b9] shadow-sm">
            <p className="px-5 py-3.5 text-sm font-medium text-gray-900">Please select reason for account deletion</p>

            <button
              type="button"
              onClick={() => setReason("")}
              className="flex w-full items-center justify-between gap-3 border-y border-green-900/20 bg-[#7dd39b] px-5 py-3 text-left transition hover:bg-[#6fc78f]"
            >
              <span>
                <span className="block text-xs text-gray-700">Reason</span>
                <span className="block text-sm font-medium text-gray-900">{deletionReasonLabel(reason)}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>

            {isOther && (
              <div className="bg-[#eaf6ec] px-5 py-3">
                <label htmlFor="deletion-detail" className="sr-only">
                  Tell us why you are deleting your account
                </label>
                <input
                  id="deletion-detail"
                  type="text"
                  autoFocus
                  value={detail}
                  maxLength={MAX_DELETION_DETAIL}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="Please tell us a little more. (Required)"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
                />
              </div>
            )}

            <div className="border-y border-green-900/20 bg-[#7dd39b] px-5 py-3">
              <p className="text-xs text-gray-700">Your Email Address</p>
              <p className="text-sm font-medium text-gray-900">{user?.email}</p>
              <p className="mt-0.5 text-xs text-gray-700">The confirmation code is sent here.</p>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 px-5 py-4 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#2f8f66]"
              />
              <span>
                I agree to the{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTerms(true);
                  }}
                  className="font-medium text-blue-700 underline"
                >
                  Terms &amp; Conditions
                </button>{" "}
                for account deletion
              </span>
            </label>

            <div className="px-5 pb-5">
              {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
              <button
                type="submit"
                disabled={!ready || sending}
                className="mx-auto block w-full max-w-56 rounded-md bg-[#2f8f66] py-2.5 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
              >
                {sending ? "Sending OTP..." : "Submit"}
              </button>
            </div>
          </form>
        )}
      </div>

      {showTerms && <AccountDeletionTerms onClose={() => setShowTerms(false)} />}

      {confirming && (
        <OtpConfirmModal
          title="Confirm Account Deletion"
          intro="This permanently deletes your farmer account. To confirm, enter the OTP we emailed to"
          confirmLabel="Confirm Delete"
          submittingLabel="Deleting..."
          danger
          onConfirm={handleConfirm}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
