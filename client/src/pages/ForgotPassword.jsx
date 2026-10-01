import { useState } from "react";
import AuthShell from "../components/AuthShell";
import { AuthAlert, SubmitButton, authInput, authLabel, authLink } from "../components/auth/AuthParts";
import PasswordInput from "../components/PasswordInput";
import SmoothLink from "../components/SmoothLink";
import { useSmoothNavigate } from "../utils/pageTransition";
import { forgotPassword, resetPassword } from "../services/api";
import { getPasswordError } from "../utils/password";

const inputClass = authInput;
const labelClass = authLabel;

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
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay-500">
        {step === "request" ? "Password reset" : "Almost there"}
      </p>
      <h1 className="mt-2 text-[2rem] font-semibold leading-tight text-gray-900">
        {step === "request" ? "Forgot Password" : "Enter OTP"}
      </h1>

      <AuthAlert>{error}</AuthAlert>

      {step === "request" ? (
        <form onSubmit={handleRequestCode} className="mt-6 space-y-4">
          <div className="group">
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

          <SubmitButton busy={submitting} busyLabel="Sending...">
            Send OTP
          </SubmitButton>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
          <div className="group">
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

          <div className="group">
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

          <div className="group">
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

          <SubmitButton busy={submitting} busyLabel="Resetting...">
            Reset Password
          </SubmitButton>

          <button
            type="button"
            onClick={() => setStep("request")}
            className="w-full text-center text-xs text-gray-500 hover:text-brand hover:underline"
          >
            Use a different email
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-gray-500">
        <SmoothLink to="/login" className={authLink}>
          ← Back to log in
        </SmoothLink>
      </p>
    </AuthShell>
  );
}
