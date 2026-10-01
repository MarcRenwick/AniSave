import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { KeyRound, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../components/AuthShell";
import { AuthAlert, SubmitButton, authInput, authLabel, authLink } from "../components/auth/AuthParts";
import PasswordInput from "../components/PasswordInput";
import SmoothLink from "../components/SmoothLink";
import VerifyEmailForm from "../components/VerifyEmailForm";
import { useSmoothNavigate } from "../utils/pageTransition";
import { requestLoginOtp, loginWithOtp, verifyLoginMfa, resendLoginMfa } from "../services/api";
import { EASE } from "../theme/harvest";

const inputClass = authInput;
const labelClass = authLabel;

// Each way of signing in (and each step of one) slides in as the last slides out.
const swap = {
  initial: { opacity: 0, x: 14 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.32, ease: EASE } },
  exit: { opacity: 0, x: -14, transition: { duration: 0.16 } },
};

export default function Login() {
  const { login, setSession } = useAuth();
  const navigate = useSmoothNavigate();
  const [searchParams] = useSearchParams();

  const [method, setMethod] = useState("password");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  // Sent here by an ended session (?expired=1): logged out elsewhere, a password change, a ban.
  const [notice, setNotice] = useState(() =>
    searchParams.get("expired") === "1" ? "Your session has ended. Please log in again." : ""
  );
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ username: "", password: "" });

  const [otpStep, setOtpStep] = useState("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  // Set once the password was right but the account signs in with two steps:
  // the emailed code is entered next.
  const [mfa, setMfa] = useState(null);
  const [mfaCode, setMfaCode] = useState("");

  // Set when the password was right but the account's email was never
  // verified: a fresh code has been emailed, and entering it signs them in.
  const [verify, setVerify] = useState(null);

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
    setNotice("");
    setSubmitting(true);
    try {
      const data = await login(form.username, form.password, remember);
      if (data.verificationRequired) {
        setVerify(data);
        return;
      }
      if (data.mfaRequired) {
        setMfa({ token: data.mfaToken, email: data.email });
        setMfaCode("");
        setNotice(data.message);
        return;
      }
      goToPortal(data);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyMfa = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await verifyLoginMfa(mfa.token, mfaCode);
      setSession(data, remember);
      goToPortal(data);
    } catch (err) {
      setError(err.response?.data?.message || "That code didn't work. Please try again.");
      // The sign-in itself timed out: nothing left to type a code into.
      if (err.response?.status === 401) setMfa(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendMfa = async () => {
    setError("");
    setNotice("");
    try {
      const { data } = await resendLoginMfa(mfa.token);
      setNotice(data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Could not send a new code. Please try again.");
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);
    try {
      await requestLoginOtp(email.trim());
      // The server's own message deliberately never confirms whether the
      // account exists (so this can't be used to test emails), but naming
      // the address back is safe - it's only repeating what was just typed.
      setNotice(`If ${email.trim()} is registered, a login code has been sent to it.`);
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
          className="h-4 w-4 rounded accent-brand"
        />
        Remember me
      </label>
      {method === "password" && !mfa && (
        <SmoothLink to="/forgot-password" className={`text-sm ${authLink}`}>
          Forgot password?
        </SmoothLink>
      )}
    </div>
  );

  const submitButton = (label, busyLabel) => (
    <SubmitButton busy={submitting} busyLabel={busyLabel}>
      {label}
    </SubmitButton>
  );

  // Which form is showing, for the slide between them.
  const showing = verify ? "verify" : mfa ? "mfa" : method === "password" ? "password" : `otp-${otpStep}`;

  return (
    <AuthShell
      tagline="Welcome back to AniSave."
      blurb="Log in to order fresh produce, or to manage the harvest you're selling."
    >
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay-500">Welcome</p>
      <h1 className="mt-2 text-[2rem] font-semibold leading-tight text-gray-900">{verify ? "Verify Your Email" : "Log In"}</h1>

      {!mfa && !verify && (
        <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-gray-100 p-1 ring-1 ring-gray-200">
          {[
            ["password", KeyRound, "Password"],
            ["otp", Mail, "Email code"],
          ].map(([key, Icon, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => switchMethod(key)}
              aria-pressed={method === key}
              className={`relative flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/25 ${
                method === key ? "text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {method === key && (
                <motion.span
                  layoutId="login-method-pill"
                  className="absolute inset-0 rounded-xl bg-brand shadow-sm"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className="relative h-4 w-4" />
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
      )}

      <AuthAlert>{error}</AuthAlert>
      <AuthAlert tone="notice">{!error && notice}</AuthAlert>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={showing} {...swap}>
          {verify ? (
            <VerifyEmailForm
              username={verify.username}
              email={verify.email}
              emailSent={verify.emailSent}
              message={verify.message}
              onVerified={(data) => {
                setSession(data, remember);
                goToPortal(data);
              }}
              footer={
                <button
                  type="button"
                  onClick={() => setVerify(null)}
                  className="hover:text-brand hover:underline"
                >
                  Use a different account
                </button>
              }
            />
          ) : mfa ? (
            <form onSubmit={handleVerifyMfa} className="mt-6 space-y-4">
              <div className="group">
                <label htmlFor="mfaCode" className={labelClass}>
                  Verification code
                </label>
                <input
                  id="mfaCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  autoFocus
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="------"
                  className={`mt-1 ${inputClass} text-center text-lg tracking-[0.5em]`}
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  Your password was correct. As a second step, enter the 6-digit code we sent to{" "}
                  <span className="font-medium text-gray-700">{mfa.email}</span>. It expires in 10 minutes.
                </p>
              </div>

              {rememberRow}
              {submitButton("Verify and log in", "Verifying...")}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <button type="button" onClick={handleResendMfa} className="hover:text-brand hover:underline">
                  Send a new code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMfa(null);
                    setMfaCode("");
                    setError("");
                    setNotice("");
                  }}
                  className="hover:text-brand hover:underline"
                >
                  Use a different account
                </button>
              </div>
            </form>
          ) : method === "password" ? (
            <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
              <div className="group">
                <label htmlFor="username" className={labelClass}>
                  Your Username
                </label>
                <input
                  id="username"
                  name="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="Your username"
                  className={`mt-1 ${inputClass}`}
                />
              </div>

              <div className="group">
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
                  We&apos;ll email you a 6-digit code - no password needed.
                </p>
              </div>

              {submitButton("Send login code", "Sending...")}
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
              <div className="group">
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
                className="w-full text-center text-xs text-gray-500 hover:text-brand hover:underline"
              >
                Use a different email
              </button>
            </form>
          )}
        </motion.div>
      </AnimatePresence>

      <p className="mt-8 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <SmoothLink to="/register" className={authLink}>
          Sign up
        </SmoothLink>
      </p>
      <p className="mt-2 text-center text-xs text-gray-400">
        <Link to="/terms" className="hover:text-brand hover:underline">
          Terms of Use
        </Link>
        {" · "}
        <Link to="/privacy" className="hover:text-brand hover:underline">
          Privacy Policy
        </Link>
      </p>
    </AuthShell>
  );
}
