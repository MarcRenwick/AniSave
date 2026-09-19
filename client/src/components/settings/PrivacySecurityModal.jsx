import { useState } from "react";
import { Link } from "react-router-dom";
import { Download, ShieldCheck } from "lucide-react";
import Modal from "../Modal";
import PasswordInput from "../PasswordInput";
import { useAuth } from "../../context/AuthContext";
import { exportMyData, setTwoStep } from "../../services/api";
import { saveBlob } from "../../utils/downloadFile";

const inputClass =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]";

// Two things a person controls about their own security and data: two-step
// sign-in (an emailed code after the password), and a copy of what AniSave
// holds about them.
export default function PrivacySecurityModal({ onClose }) {
  const { user, updateUser } = useAuth();
  const enabled = Boolean(user?.mfaEnabled);

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

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

  const handleDownload = async () => {
    setError("");
    setMessage("");
    setDownloading(true);
    try {
      const { data } = await exportMyData();
      saveBlob(data, "anisave-my-data.json");
      setMessage("Your data was downloaded.");
    } catch {
      setError("Couldn't download your data. Please try again.");
    } finally {
      setDownloading(false);
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

      <section className="mt-6 border-t border-gray-200 pt-5">
        <p className="text-sm font-semibold text-gray-900">Your data</p>
        <p className="mt-1 text-xs text-gray-500">
          Get a copy of what AniSave holds about you - your account details, orders, ratings and (for
          farmers) products - as a file. It never includes your password.
        </p>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border-2 border-[#2f8f66] py-2 text-sm font-semibold text-[#2f8f66] hover:bg-green-50 disabled:opacity-60"
        >
          <Download className="h-4 w-4" />
          {downloading ? "Preparing..." : "Download my data"}
        </button>
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
