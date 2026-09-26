import { useState } from "react";
import { MailCheck } from "lucide-react";
import { verifyEmail, resendVerificationEmail } from "../services/api";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]";

// A new account's first sign-in: the 6-digit code emailed when it was made.
// Shown on the sign-up page straight after, and on the login page to someone
// who left before entering it. The right code verifies the email and hands
// the session to `onVerified`.
export default function VerifyEmailForm({ username, email, emailSent = true, message, onVerified, footer }) {
  const [code, setCode] = useState("");
  // The account was made but its email didn't go out: say so from the start.
  const [error, setError] = useState(emailSent ? "" : message);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const { data } = await verifyEmail(username, code);
      onVerified(data);
    } catch (err) {
      setError(err.response?.data?.message || "That code didn't work. Please try again.");
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setNotice("");
    setResending(true);
    try {
      const { data } = await resendVerificationEmail(username);
      setNotice(data.message);
      setCode("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send a new code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mt-6" data-testid="verify-email">
      <div className="flex items-start gap-3 rounded-xl bg-green-50 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#2f8f66] ring-1 ring-green-100">
          <MailCheck className="h-5 w-5" />
        </span>
        <p className="text-sm leading-relaxed text-[#1f5c42]">
          We sent a 6-digit code to <span className="break-all font-semibold">{email}</span>. Enter it below to
          verify your email and start using AniSave.
        </p>
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      {notice && !error && <div className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</div>}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="verifyCode" className="block text-sm font-medium text-gray-700">
            Verification code
          </label>
          <input
            id="verifyCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="------"
            className={`mt-1 ${inputClass} text-center text-lg tracking-[0.5em]`}
          />
          <p className="mt-1.5 text-xs text-gray-500">
            It expires in 15 minutes. Can&apos;t find it? Check your spam folder.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[#2f8f66] py-2.5 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60"
        >
          {submitting ? "Verifying..." : "Verify email"}
        </button>

        <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="hover:text-[#2f8f66] hover:underline disabled:opacity-60"
          >
            {resending ? "Sending..." : "Send a new code"}
          </button>
          {footer}
        </div>
      </form>
    </div>
  );
}
