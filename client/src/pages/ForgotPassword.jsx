import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import logo from "../assets/logo.png";
import { forgotPassword } from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      header={
        <>
          <img src={logo} alt="AniSave" className="mx-auto h-32 w-32 rounded-full" />
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Forgot Password</h1>
        </>
      }
    >
      {sent ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-white">
            If <span className="font-medium">{email}</span> is registered, a reset link has been sent.
            Check your inbox (and spam folder).
          </p>
          <Link to="/login" className="inline-block text-sm font-medium text-white hover:underline">
            ← Back to log in
          </Link>
        </div>
      ) : (
        <>
          <p className="text-center text-sm text-white/80">
            Enter your account email and we&apos;ll send you a link to reset your password.
          </p>

          {error && (
            <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white">
                Email
              </label>
              <input
                id="email"
                name="email"
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
              {submitting ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/80">
            <Link to="/login" className="font-medium text-white hover:underline">
              ← Back to log in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
