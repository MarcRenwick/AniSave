import { useState } from "react";
import AuthShell from "../components/AuthShell";
import PasswordInput from "../components/PasswordInput";
import SmoothLink from "../components/SmoothLink";
import { useSmoothNavigate } from "../utils/pageTransition";
import { forgotPassword, resetPassword } from "../services/api";
import { getPasswordError } from "../utils/password";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]";

const labelClass = "block text-sm font-medium text-gray-700";

export default function ForgotPassword() {
  const navigate = useSmoothNavigate();

  const [step, setStep] = useState("request"); // "request" | "reset"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setStep("reset");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    const passwordError = getPasswordError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(email, code, password);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "That OTP is invalid or has expired.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      tagline="Locked out? It happens."
      blurb="We'll email a 6-digit code to the address on your account so you can set a new password."
    >
      <p className="text-sm text-gray-500">{step === "request" ? "Password reset" : "Almost there"}</p>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">
        {step === "request" ? "Forgot Password" : "Enter OTP"}
      </h1>

      {error && (
        <div className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      {step === "request" ? (
        <form onSubmit={handleRequestCode} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className={labelClass}>
              Your Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="The email you registered with"
              className={`mt-1 ${inputClass}`}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              We&apos;ll send you a 6-digit OTP to reset your password.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[#2f8f66] py-2.5 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60"
          >
            {submitting ? "Sending..." : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
          <div>
            <label htmlFor="code" className={labelClass}>
              OTP
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="------"
              className={`mt-1 ${inputClass} text-center text-lg tracking-[0.5em]`}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Sent to <span className="font-medium text-gray-700">{email}</span>.
            </p>
          </div>

          <div>
            <label htmlFor="password" className={labelClass}>
              New Password
            </label>
            <PasswordInput
              id="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your new password"
              className={`mt-1 ${inputClass}`}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className={labelClass}>
              Confirm New Password
            </label>
            <PasswordInput
              id="confirmPassword"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type your new password"
              className={`mt-1 ${inputClass}`}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[#2f8f66] py-2.5 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60"
          >
            {submitting ? "Resetting..." : "Reset Password"}
          </button>

          <button
            type="button"
            onClick={() => setStep("request")}
            className="w-full text-center text-xs text-gray-500 hover:text-[#2f8f66] hover:underline"
          >
            Use a different email
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-gray-500">
        <SmoothLink to="/login" className="font-semibold text-[#2f8f66] hover:underline">
          ← Back to log in
        </SmoothLink>
      </p>
    </AuthShell>
  );
}
