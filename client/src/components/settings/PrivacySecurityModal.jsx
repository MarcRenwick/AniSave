import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import Modal from "../Modal";
import PasswordInput from "../PasswordInput";
import { useAuth } from "../../context/AuthContext";
import { setTwoStep } from "../../services/api";

const inputClass =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]";

// Two-step sign-in: after the password, a code is emailed to the address the
// account was registered with.
export default function PrivacySecurityModal({ onClose }) {
  const { user, updateUser } = useAuth();
  const enabled = Boolean(user?.mfaEnabled);

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const handleTwoStep = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const { data } = await setTwoStep(!enabled, password);
      updateUser({ mfaEnabled: data.mfaEnabled });
      setPassword("");
      setMessage(data.mfaEnabled ? "Two-step sign-in is now on." : "Two-step sign-in is now off.");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Privacy & Security" onClose={onClose} maxWidth="max-w-md">
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
      {message && <div className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>}

      <section>
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <ShieldCheck className="h-4 w-4 text-[#2f8f66]" />
            Two-step sign-in
          </p>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}
          >
            {enabled ? "On" : "Off"}
          </span>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          After your password, we email a 6-digit code to {user?.email}. Even if someone learns your
          password, they can&apos;t log in without that inbox.
        </p>

        <form onSubmit={handleTwoStep} className="mt-3 space-y-3">
          <div>
            <label htmlFor="twoStepPassword" className="block text-sm font-medium text-gray-700">
              Confirm with your password
            </label>
            <PasswordInput
              id="twoStepPassword"
              name="twoStepPassword"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className={`w-full rounded-md py-2 text-sm font-semibold disabled:opacity-60 ${
              enabled
                ? "border-2 border-red-600 text-red-600 hover:bg-red-50"
                : "bg-[#2f8f66] text-white hover:bg-[#267a56]"
            }`}
          >
            {saving ? "Saving..." : enabled ? "Turn off two-step sign-in" : "Turn on two-step sign-in"}
          </button>
        </form>
      </section>

      <p className="mt-5 text-center text-xs text-gray-400">
        <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-[#2f8f66] hover:underline">
          Privacy Policy
        </Link>
        {" · "}
        <Link to="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-[#2f8f66] hover:underline">
          Terms of Use
        </Link>
      </p>
    </Modal>
  );
}
