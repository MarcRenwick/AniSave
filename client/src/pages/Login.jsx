import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import PasswordInput from "../components/PasswordInput";
import logo from "../assets/logo.png";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login(form.username, form.password);
      if (user.role === "farmer") navigate("/farmer/dashboard");
      else if (user.role === "buyer") navigate("/buyer/home");
      else if (user.role === "admin") navigate("/admin/users");
      else navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      variant="white"
      header={
        <>
          <img src={logo} alt="AniSave" className="mx-auto h-32 w-32 rounded-full" />
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Log In</h1>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            value={form.username}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3a7d38]"
            placeholder="username"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            required
            value={form.password}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3a7d38]"
            placeholder="••••••••••"
          />
          <div className="mt-1 text-right">
            <Link to="/forgot-password" className="text-xs font-medium text-gray-500 hover:text-[#2f8f66] hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-[#2f8f66] py-2 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60"
        >
          {submitting ? "Logging in..." : "Log In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="font-medium text-[#2f8f66] hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
