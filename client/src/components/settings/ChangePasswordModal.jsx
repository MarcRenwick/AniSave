import { useState } from "react";
import { Check, CheckCircle2, Mail } from "lucide-react";
import Modal from "../Modal";
import PasswordInput from "../PasswordInput";
import { useAuth } from "../../context/AuthContext";
import { requestPasswordChange, resendPasswordChange, confirmPasswordChange } from "../../services/api";
import { getStrongPasswordError, STRONG_PASSWORD_RULES } from "../../utils/password";
import useCountdown, { clock } from "../../hooks/useCountdown";

const inputClass =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand";

const EMPTY_FORM = { currentPassword: "", newPassword: "", confirmNewPassword: "" };

const failure = (err) => err.response?.data?.message || "Something went wrong. Please try again.";

// Changing the password, confirmed by email (Privacy and Protection (MFA)):
//  1. the current password and the new one twice - checked here, and again by
//     the server, which then emails a 6-digit code;
//  2. that code, within five minutes. Another can be sent a minute after the
//     last; after five wrong ones the request is over and it starts again;
//  3. done - and every other device has been signed out.
// Nothing about the account changes until step 2 succeeds.
export default function ChangePasswordModal({ onClose }) {
  const { updateToken } = useAuth();
  const [step, setStep] = useState("form");
  const [form, setForm] = useState(EMPTY_FORM);
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [expiresIn, startExpiry] = useCountdown();
  const [resendIn, startResendWait] = useCountdown();
  const expired = step === "code" && expiresIn === 0;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const codeSent = (data) => {
    setStep("code");
    setCode("");
    if (data.email) setSentTo(data.email);
    setMessage(data.message);
    startExpiry(data.expiresIn);
    startResendWait(data.resendIn);
  };

  // The server has ended the request - the code ran out of time, or of
  // guesses - so it's back to the form. After too many wrong codes the
  // passwords go too, and are typed again from the start.
  const startOver = (data) => {
    setStep("form");
    setCode("");
    setMessage("");
    if (data.reason === "locked") setForm(EMPTY_FORM);
    setError(data.message);
  };

  const handleSendCode = async (e) => {
    e?.preventDefault();
    setError("");
    setMessage("");

    const passwordErr = getStrongPasswordError(form.newPassword);
    if (passwordErr) return setError(passwordErr);
    if (form.newPassword !== form.confirmNewPassword) return setError("New passwords do not match");
    if (form.newPassword === form.currentPassword) {
      return setError("Your new password must be different from your current password");
    }

    setBusy(true);
    try {
      const { data } = await requestPasswordChange(form.currentPassword, form.newPassword, form.confirmNewPassword);
      codeSent(data);
    } catch (err) {
      setError(failure(err));
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const { data } = await resendPasswordChange();
      codeSent(data);
    } catch (err) {
      const data = err.response?.data;
      if (data?.restart) startOver(data);
      else {
        if (data?.retryIn) startResendWait(data.retryIn);
        setError(failure(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const { data } = await confirmPasswordChange(code);
      // Every other session has ended; this one gets a fresh token so it stays signed in.
      if (data.token) updateToken(data.token);
      setForm(EMPTY_FORM);
      setCode("");
      setMessage(data.message);
      setStep("done");
    } catch (err) {
      const data = err.response?.data;
      if (data?.restart) startOver(data);
      else {
        setCode("");
        setError(failure(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const backToForm = () => {
    setStep("form");
    setCode("");
    setError("");
    setMessage("");
  };

  return (
    <Modal title="Change Password" onClose={onClose}>
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      {message && step !== "done" && (
        <div className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>
      )}

      {step === "form" && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <p className="flex items-start gap-2 text-xs text-gray-500">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            We&apos;ll email you a code to confirm it&apos;s you. Your password only changes once you enter it.
          </p>
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
              Current Password
            </label>
            <PasswordInput
              id="currentPassword"
              name="currentPassword"
              required
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              New Password
            </label>
            <PasswordInput
              id="newPassword"
              name="newPassword"
              required
              autoComplete="new-password"
              maxLength={12}
              value={form.newPassword}
              onChange={handleChange}
              className={inputClass}
            />
            <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs" aria-label="Password requirements">
              {STRONG_PASSWORD_RULES.map((rule) => {
                const met = rule.test(form.newPassword);
                return (
                  <li key={rule.label} className={`flex items-center gap-1.5 ${met ? "text-brand" : "text-gray-400"}`}>
                    <Check className={`h-3.5 w-3.5 shrink-0 ${met ? "" : "opacity-40"}`} />
                    {rule.label}
                    <span className="sr-only">{met ? " (done)" : " (still needed)"}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700">
              Confirm New Password
            </label>
            <PasswordInput
              id="confirmNewPassword"
              name="confirmNewPassword"
              required
              autoComplete="new-password"
              maxLength={12}
              value={form.confirmNewPassword}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-md bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {busy ? "Sending code..." : "Send Code"}
            </button>
          </div>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleConfirm} className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter the 6-digit code we sent to{" "}
            <span className="font-medium text-gray-800">{sentTo || "your registered email"}</span>. Your password
            won&apos;t change until you do.
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            required
            aria-label="Verification code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="------"
            disabled={expired}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-center text-lg tracking-[0.5em] text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:bg-gray-50"
          />
          <div className="flex items-center justify-between gap-3 text-xs">
            <span role="timer" className={expired ? "font-semibold text-red-600" : "text-gray-500"}>
              {expired ? "This code has expired." : `Code expires in ${clock(expiresIn)}`}
            </span>
            {expired ? (
              <button
                type="button"
                onClick={handleSendCode}
                disabled={busy}
                className="font-semibold text-brand hover:underline disabled:opacity-60"
              >
                Send a new code
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={busy || resendIn > 0}
                className="font-semibold text-brand hover:underline disabled:cursor-not-allowed disabled:font-medium disabled:text-gray-400 disabled:no-underline"
              >
                {resendIn > 0 ? `Resend code in ${clock(resendIn)}` : "Resend code"}
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={backToForm}
              disabled={busy}
              className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={busy || expired || code.length !== 6}
              className="flex-1 rounded-md bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {busy ? "Confirming..." : "Change Password"}
            </button>
          </div>
        </form>
      )}

      {step === "done" && (
        <div className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-brand" />
          <div>
            <p className="font-semibold text-gray-900">Password changed</p>
            <p className="mt-1 text-sm text-gray-600">{message}</p>
            <p className="mt-1 text-xs text-gray-500">We&apos;ve also sent a confirmation to your email.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md bg-brand py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}
