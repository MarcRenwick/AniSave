import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";
import { requestLoginOtp, loginWithOtp } from "../services/api";
import logo from "../assets/logo.png";
import fieldPhoto from "../assets/lndingpge.jpg";

const SLIDE_MS = 5000;

const slides = [
  {
    title: "Fresh from the farm.",
    text: "Order produce straight from local farmers, with no middleman markup.",
  },
  {
    title: "Know who you're buying from.",
    text: "Verified farms, rated only by buyers who actually completed an order.",
  },
  {
    title: "Reserve the next harvest.",
    text: "Pre-order produce before it's picked, then collect it once it's ready.",
  },
];

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]";

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

  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setSlide((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [slide]);

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
          Forgot Password?
        </Link>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="AniSave" className="h-10 w-10 rounded-full" />
            <span className="text-xl font-bold text-gray-900">AniSave</span>
          </Link>

          <h1 className="mt-8 text-2xl font-bold text-gray-900">Log in to your Account</h1>
          <p className="mt-1 text-sm text-gray-500">Welcome back! Select method to log in:</p>

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

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">
              {method === "password" ? "log in with your password" : "log in with an emailed code"}
            </span>
            <span className="h-px flex-1 bg-gray-200" />
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}
          {notice && !error && (
            <div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</div>
          )}

          {method === "password" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <input
                id="username"
                name="username"
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Username"
                aria-label="Username"
                className={inputClass}
              />
              <PasswordInput
                id="password"
                name="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Password"
                aria-label="Password"
                className={inputClass}
              />

              {rememberRow}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#2f8f66] py-2.5 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60"
              >
                {submitting ? "Logging in..." : "Log in"}
              </button>
            </form>
          ) : otpStep === "request" ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email you registered with"
                aria-label="Email"
                className={inputClass}
              />
              <p className="text-xs text-gray-500">
                We&apos;ll email you a 6-digit code - no password needed.
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#2f8f66] py-2.5 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60"
              >
                {submitting ? "Sending..." : "Send login code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-sm text-gray-600">
                Enter the code sent to <span className="font-medium text-gray-900">{email}</span>. It
                expires in 10 minutes.
              </p>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="------"
                aria-label="Login code"
                className={`${inputClass} text-center text-lg tracking-[0.5em]`}
              />

              {rememberRow}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-[#2f8f66] py-2.5 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60"
              >
                {submitting ? "Logging in..." : "Log in"}
              </button>

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
              Create an account
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden w-1/2 flex-col items-center justify-center bg-gradient-to-br from-[#2f8f66] to-[#1f5c42] p-12 text-white lg:flex">
        <div className="w-full max-w-md overflow-hidden rounded-2xl shadow-2xl">
          <img src={fieldPhoto} alt="" className="h-64 w-full object-cover" />
        </div>

        <div className="mt-10 text-center">
          <h2 className="text-2xl font-bold">{slides[slide].title}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/85">{slides[slide].text}</p>
        </div>

        <div className="mt-8 flex gap-2">
          {slides.map((s, i) => (
            <button
              key={s.title}
              type="button"
              onClick={() => setSlide(i)}
              aria-label={`Show slide ${i + 1}`}
              aria-current={i === slide}
              className={`h-2.5 rounded-full transition-all ${
                i === slide ? "w-6 bg-white" : "w-2.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
