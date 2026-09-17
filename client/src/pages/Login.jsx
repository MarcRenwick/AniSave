import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../components/AuthShell";
import PasswordInput from "../components/PasswordInput";
import { requestLoginOtp, loginWithOtp } from "../services/api";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]";

const labelClass = "block text-sm font-medium text-gray-700";

export default function Login() {
  const { login, setSession } = useAuth();
  const navigate = useNavigate();

  const [method, setMethod] = useState("password");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ username: "", password: "" });

  const [otpStep, setOtpStep] = useState("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const goToPortal = (user) => {
    if (user.role === "farmer") navigate("/farmer/dashboard");
    else if (user.role === "buyer") navigate("/buyer/home");
    else if (user.role === "admin") navigate("/admin/users");
    else navigate("/dashboard");
  };

  const switchMethod = (next) => {
    setMethod(next);
    setError("");
    setNotice("");
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login(form.username, form.password, remember);
      goToPortal(user);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      const { data } = await requestLoginOtp(email.trim());
      setNotice(data.message);
      setOtpStep("verify");
    } catch (err) {
      setError(err.response?.data?.message || "Could not send a code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await loginWithOtp(email.trim(), code);
      setSession(data, remember);
      goToPortal(data);
    } catch (err) {
      setError(err.response?.data?.message || "That code didn't work. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const rememberRow = (
    <div className="flex items-center justify-between">
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="h-4 w-4 rounded accent-[#2f8f66]"
        />
        Remember me
      </label>
      {method === "password" && (
        <Link to="/forgot-password" className="text-sm font-medium text-[#2f8f66] hover:underline">
          Forgot password?
        </Link>
      )}
    </div>
  );

  const submitButton = (label, busyLabel) => (
    <button
      type="submit"
      disabled={submitting}
      className="w-full rounded-lg bg-[#2f8f66] py-2.5 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60"
    >
      {submitting ? busyLabel : label}
    </button>
  );

  return (
    <AuthShell
      tagline="Welcome back to AniSave."
      blurb="Log in to order fresh produce, or to manage the harvest you're selling."
    >
      <p className="text-sm text-gray-500">Welcome</p>
      <h1 className="mt-1 text-3xl font-bold text-gray-900">Log In</h1>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => switchMethod("password")}
          className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition ${
            method === "password"
              ? "border-[#2f8f66] bg-green-50 text-[#2f8f66]"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <KeyRound className="h-4 w-4" />
          Password
        </button>
        <button
          type="button"
          onClick={() => switchMethod("otp")}
          className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition ${
            method === "otp"
              ? "border-[#2f8f66] bg-green-50 text-[#2f8f66]"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          <Mail className="h-4 w-4" />
          Email code
        </button>
      </div>

      {error && (
        <div className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}
      {notice && !error && (
        <div className="mt-5 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</div>
      )}

      {method === "password" ? (
        <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
          <div>
            <label htmlFor="username" className={labelClass}>
              Your Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Your username"
              className={`mt-1 ${inputClass}`}
            />
          </div>

          <div>
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <PasswordInput
              id="password"
              name="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Your password"
              className={`mt-1 ${inputClass}`}
            />
          </div>

          {rememberRow}
          {submitButton("Log in", "Logging in...")}
        </form>
      ) : otpStep === "request" ? (
        <form onSubmit={handleRequestOtp} className="mt-6 space-y-4">
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
              We&apos;ll email you a 6-digit code - no password needed.
            </p>
          </div>

          {submitButton("Send login code", "Sending...")}
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
          <div>
            <label htmlFor="code" className={labelClass}>
              Login code
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
              Sent to <span className="font-medium text-gray-700">{email}</span>. It expires in 10
              minutes.
            </p>
          </div>

          {rememberRow}
          {submitButton("Log in", "Logging in...")}

          <button
            type="button"
            onClick={() => {
              setOtpStep("request");
              setCode("");
              setError("");
              setNotice("");
            }}
            className="w-full text-center text-xs text-gray-500 hover:text-[#2f8f66] hover:underline"
          >
            Use a different email
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="font-semibold text-[#2f8f66] hover:underline">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
