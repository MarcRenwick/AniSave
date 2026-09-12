import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import logo from "../assets/logo.png";
import { forgotPassword, resetPassword } from "../services/api";
import { getPasswordError } from "../utils/password";

export default function ForgotPassword() {
  const navigate = useNavigate();

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
      setError(err.response?.data?.message || "That verification code is invalid or has expired.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      header={
        <>
          <img src={logo} alt="AniSave" className="mx-auto h-32 w-32 rounded-full" />
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {step === "request" ? "Forgot Password" : "Enter Code"}
          </h1>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      {step === "request" ? (
        <>
          <p className="text-center text-sm text-white/80">
            Enter your account email and we&apos;ll send you a 6-digit verification code.
          </p>

          <form onSubmit={handleRequestCode} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-transparent bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3a7d38]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-white py-2 text-sm font-semibold text-[#54b04f] transition hover:bg-green-50 disabled:opacity-60"
            >
              {submitting ? "Sending..." : "Send Verification Code"}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="text-center text-sm text-white/80">
            We sent a code to <span className="font-medium">{email}</span>. Enter it below with your
            new password.
          </p>

          <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-white">
                Verification Code
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
                className="mt-1 w-full rounded-md border border-transparent bg-white px-3 py-2 text-center text-lg tracking-[0.5em] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3a7d38]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white">
                New Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                maxLength={12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-transparent bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3a7d38]"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={6}
                maxLength={12}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-transparent bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3a7d38]"
              />
            </div>
            <p className="-mt-2 text-xs text-white/70">
              6-12 characters, with at least 1 capital letter and 1 special character.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-white py-2 text-sm font-semibold text-[#54b04f] transition hover:bg-green-50 disabled:opacity-60"
            >
              {submitting ? "Resetting..." : "Reset Password"}
            </button>

            <button
              type="button"
              onClick={() => setStep("request")}
              className="w-full text-center text-xs text-white/70 hover:text-white hover:underline"
            >
              Use a different email
            </button>
          </form>
        </>
      )}

      <p className="mt-6 text-center text-sm text-white/80">
        <Link to="/login" className="font-medium text-white hover:underline">
          ← Back to log in
        </Link>
      </p>
    </AuthLayout>
  );
}
