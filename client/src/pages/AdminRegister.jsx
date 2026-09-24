import { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import PasswordInput from "../components/PasswordInput";
import SmoothLink from "../components/SmoothLink";
import { useSmoothNavigate } from "../utils/pageTransition";
import logo from "../assets/logo.png";
import { requestAdminOtp, registerAdmin } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { getPasswordError } from "../utils/password";
import { getUsernameError } from "../utils/accountRules";

export default function AdminRegister() {
  const { setSession } = useAuth();
  const navigate = useSmoothNavigate();

  const [step, setStep] = useState("request"); // "request" | "register"
  const [email, setEmail] = useState("");
  const [form, setForm] = useState({ code: "", username: "", name: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await requestAdminOtp(email);
      setStep("register");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    // The same username rule the sign-up form uses - the server applies it to
    // every account, so saying so here beats a round trip to be told.
    const usernameError = getUsernameError(form.username);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    const passwordError = getPasswordError(form.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await registerAdmin({
        email,
        code: form.code,
        username: form.username,
        name: form.name,
        password: form.password,
      });
      setSession(data);
      navigate("/admin/users");
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
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            {step === "request" ? "Admin Registration" : "Verify & Create Admin"}
          </h1>
        </>
      }
    >
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      {step === "request" ? (
        <>
          <p className="text-center text-sm text-white/80">
            Enter the authorized admin email to receive a one-time OTP.
          </p>
          <form onSubmit={handleRequestOtp} className="mt-6 space-y-4">
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
              {submitting ? "Sending..." : "Send OTP"}
            </button>
          </form>
        </>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <p className="text-center text-sm text-white/80">
            Enter the OTP sent to <span className="font-medium">{email}</span>, plus your new admin
            account details.
          </p>

          <div>
            <label htmlFor="code" className="block text-sm font-medium text-white">
              OTP
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.replace(/\D/g, "") })}
              placeholder="------"
              className="mt-1 w-full rounded-md border border-transparent bg-white px-3 py-2 text-center text-lg tracking-[0.5em] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3a7d38]"
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-transparent bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3a7d38]"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-white">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              minLength={7}
              value={form.username}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-transparent bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3a7d38]"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white">
              Password
            </label>
            <PasswordInput
              id="password"
              name="password"
              required
              minLength={6}
              maxLength={12}
              value={form.password}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-transparent bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3a7d38]"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-white">
              Confirm Password
            </label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              required
              minLength={6}
              maxLength={12}
              value={form.confirmPassword}
              onChange={handleChange}
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
            {submitting ? "Creating account..." : "Create Admin Account"}
          </button>

          <button
            type="button"
            onClick={() => setStep("request")}
            className="w-full text-center text-xs text-white/70 hover:text-white hover:underline"
          >
            Use a different email
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-white/80">
        <SmoothLink to="/login" className="font-medium text-white hover:underline">
          ← Back to log in
        </SmoothLink>
      </p>
    </AuthLayout>
  );
}
