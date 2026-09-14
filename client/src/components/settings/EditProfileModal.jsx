import { useState } from "react";
import Modal from "../Modal";
import { updateProfile } from "../../services/api";

const inputClass =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]";

export default function EditProfileModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    location: user?.location || "",
    farmName: user?.farmName || "",
    farmDescription: user?.farmDescription || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const { data } = await updateProfile(form);
      onSaved(data);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Edit Profile" onClose={onClose} maxWidth="max-w-md">
      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input id="name" name="name" value={form.name} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Contact Number
          </label>
          <input
            id="phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="e.g. 09171234567"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">
            Address
          </label>
          <input
            id="location"
            name="location"
            value={form.location}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {user?.role === "farmer" && (
          <>
            <div>
              <label htmlFor="farmName" className="block text-sm font-medium text-gray-700">
                Farm Name
              </label>
              <input
                id="farmName"
                name="farmName"
                value={form.farmName}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="farmDescription" className="block text-sm font-medium text-gray-700">
                Shop Description
              </label>
              <textarea
                id="farmDescription"
                name="farmDescription"
                rows={3}
                value={form.farmDescription}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-md bg-[#2f8f66] py-2 text-sm font-semibold text-white hover:bg-[#267a56] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
