import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import logo from "../assets/logo.png";

const initialForm = {
  name: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  location: "",
  farmName: "",
  farmDescription: "",
};

function getPasswordError(password) {
  if (password.length < 6 || password.length > 12) {
    return "Password must be 6-12 characters long";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one capital letter";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one special character";
  }
  return "";
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const changeRole = () => {
    setError("");
    setForm(initialForm);
    setRole(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

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
      const { confirmPassword: _confirmPassword, ...payload } = form;
      await register({ ...payload, role });
      navigate(role === "farmer" ? "/farmer/dashboard" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 1: pick a role before showing any form fields
  if (!role) {
    return (
      <AuthLayout
        header={
          <>
            <img src={logo} alt="AniSave" className="mx-auto h-32 w-32 rounded-full" />
            <h1 className="mt-2 text-2xl font-bold text-gray-900">How will you use AniSave?</h1>
          </>
        }
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setRole("buyer")}
            className="w-full rounded-lg border border-transparent bg-white p-4 text-left transition hover:bg-green-50"
          >
            <span className="block font-semibold text-gray-900">I&apos;m a Buyer</span>
            <span className="block text-sm text-gray-500">
              Browse and order fresh produce from local farmers
            </span>
          </button>
          <button
            type="button"
            onClick={() => setRole("farmer")}
            className="w-full rounded-lg border border-transparent bg-white p-4 text-left transition hover:bg-green-50"
          >
            <span className="block font-semibold text-gray-900">I&apos;m a Farmer</span>
            <span className="block text-sm text-gray-500">
              List your crops and sell directly to buyers
            </span>
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-white/80">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-white hover:underline">
            Log in
          </Link>
        </p>
      </AuthLayout>
    );
  }

  // Step 2: fill up the form for the chosen role
  return (
    <AuthLayout
      maxWidth="max-w-lg"
      header={
        <>
          <img src={logo} alt="AniSave" className="mx-auto h-24 w-24 rounded-full" />
          <h1 className="mt-2 text-2xl font-bold text-gray-900">AniSave</h1>
          <p className="text-sm text-gray-700">
            Signing up as a <span className="font-semibold capitalize">{role}</span>{" "}
            <button type="button" onClick={changeRole} className="underline hover:text-gray-900">
              (Change)
            </button>
          </p>
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
            minLength={3}
            value={form.username}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-transparent bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3a7d38]"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-white">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-transparent bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3a7d38]"
          />
          <p className="mt-1 text-xs text-white/70">Used for account recovery, not for logging in.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
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
              Confirm
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={6}
              maxLength={12}
              value={form.confirmPassword}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-transparent bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3a7d38]"
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-white/70">
          6-12 characters, with at least 1 capital letter and 1 special character.
        </p>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-white">
            Location
          </label>
          <input
            id="location"
            name="location"
            type="text"
            required
            placeholder="e.g. Dagupan City"
            value={form.location}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-transparent bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3a7d38]"
          />
        </div>

        {role === "farmer" && (
          <div className="space-y-4 rounded-md border border-white/30 bg-white/10 p-4">
            <div>
              <label htmlFor="farmName" className="block text-sm font-medium text-white">
                Farm Name
              </label>
              <input
                id="farmName"
                name="farmName"
                type="text"
                required
                value={form.farmName}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-transparent bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3a7d38]"
              />
            </div>
            <div>
              <label htmlFor="farmDescription" className="block text-sm font-medium text-white">
                Farm Details
              </label>
              <textarea
                id="farmDescription"
                name="farmDescription"
                rows={2}
                value={form.farmDescription}
                onChange={handleChange}
                placeholder="Crops you grow, farm size, etc."
                className="mt-1 w-full rounded-md border border-transparent bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3a7d38]"
              />
            </div>
            <p className="text-xs text-white/80">
              Farmer accounts are reviewed by an admin before you can list products.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-white py-2 text-sm font-semibold text-[#54b04f] transition hover:bg-green-50 disabled:opacity-60"
        >
          {submitting ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/80">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-white hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
