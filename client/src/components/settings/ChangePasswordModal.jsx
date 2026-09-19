import { useState } from "react";
import Modal from "../Modal";
import PasswordInput from "../PasswordInput";
import { useAuth } from "../../context/AuthContext";
import { changePassword } from "../../services/api";
import { getPasswordError } from "../../utils/password";

const inputClass =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]";

export default function ChangePasswordModal({ onClose }) {
  const { updateToken } = useAuth();
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const passwordErr = getPasswordError(form.newPassword);
    if (passwordErr) {
      setError(passwordErr);
      return;
    }
    if (form.newPassword !== form.confirmNewPassword) {
      setError("New passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const { data } = await changePassword(form.currentPassword, form.newPassword);
      // Changing the password ends every other session; this one gets a fresh token so it stays signed in.
      if (data.token) updateToken(data.token);
      setMessage("Password changed successfully.");
      setForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Change Password" onClose={onClose}>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}
      {message && (
        <div className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
            Current Password
          </label>
          <PasswordInput
            id="currentPassword"
            name="currentPassword"
            required
            value={form.currentPassword}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <PasswordInput
            id="newPassword"
            name="newPassword"
            required
            minLength={6}
            maxLength={12}
            value={form.newPassword}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700">
            Confirm New Password
          </label>
          <PasswordInput
            id="confirmNewPassword"
            name="confirmNewPassword"
            required
            minLength={6}
            maxLength={12}
            value={form.confirmNewPassword}
            onChange={handleChange}
            className={inputClass}
          />
        </div>
        <p className="-mt-2 text-xs text-gray-400">
          6-12 characters, with at least 1 capital letter and 1 special character.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Close
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-md bg-[#2f8f66] py-2 text-sm font-semibold text-white hover:bg-[#267a56] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Change Password"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
