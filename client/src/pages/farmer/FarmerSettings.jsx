import { useState } from "react";
import { useNavigate } from "react-router-dom";
import FarmerLayout from "../../layouts/FarmerLayout";
import FarmerTopBar from "../../components/farmer/FarmerTopBar";
import PasswordInput from "../../components/PasswordInput";
import DeleteAccountModal from "../../components/farmer/settings/DeleteAccountModal";
import { useAuth } from "../../context/AuthContext";
import { updateProfile, changePassword } from "../../services/api";
import { getPasswordError } from "../../utils/password";

const inputClass =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]";

function SettingsCard({ title, children }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="bg-[#2f8f66] px-4 py-2 text-sm font-semibold text-white">{title}</div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function FarmerSettings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name: user?.name || "",
    location: user?.location || "",
    farmName: user?.farmName || "",
    farmDescription: user?.farmDescription || "",
  });
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const handleProfileChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileMsg("");
    setSavingProfile(true);
    try {
      const { data } = await updateProfile(profile);
      updateUser(data);
      setProfileMsg("Profile updated.");
    } catch (err) {
      setProfileError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const handlePasswordChange = (e) =>
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordMsg("");

    const passwordErr = getPasswordError(passwordForm.newPassword);
    if (passwordErr) {
      setPasswordError(passwordErr);
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordMsg("Password changed successfully.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    } catch (err) {
      setPasswordError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSavingPassword(false);
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleAccountDeleted = () => {
    logout();
    navigate("/login");
  };

  return (
    <FarmerLayout>
      <FarmerTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage your profile, password, and account</p>
      </FarmerTopBar>

      <div className="mx-auto max-w-2xl space-y-6 p-8">
        <SettingsCard title="Profile Info">
          <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Username</p>
              <p className="font-medium text-gray-900">{user?.username}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-medium text-gray-900">{user?.email}</p>
            </div>
          </div>

          {profileError && (
            <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{profileError}</div>
          )}
          {profileMsg && (
            <div className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{profileMsg}</div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                value={profile.name}
                onChange={handleProfileChange}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                id="location"
                name="location"
                value={profile.location}
                onChange={handleProfileChange}
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
                    value={profile.farmName}
                    onChange={handleProfileChange}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="farmDescription" className="block text-sm font-medium text-gray-700">
                    Farm Details
                  </label>
                  <textarea
                    id="farmDescription"
                    name="farmDescription"
                    rows={2}
                    value={profile.farmDescription}
                    onChange={handleProfileChange}
                    className={inputClass}
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-md bg-[#2f8f66] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60"
            >
              {savingProfile ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </SettingsCard>

        <SettingsCard title="Change Password">
          {passwordError && (
            <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{passwordError}</div>
          )}
          {passwordMsg && (
            <div className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{passwordMsg}</div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                Current Password
              </label>
              <PasswordInput
                id="currentPassword"
                name="currentPassword"
                required
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
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
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
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
                value={passwordForm.confirmNewPassword}
                onChange={handlePasswordChange}
                className={inputClass}
              />
            </div>
            <p className="-mt-2 text-xs text-gray-400">
              6-12 characters, with at least 1 capital letter and 1 special character.
            </p>

            <button
              type="submit"
              disabled={savingPassword}
              className="rounded-md bg-[#2f8f66] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#267a56] disabled:opacity-60"
            >
              {savingPassword ? "Saving..." : "Change Password"}
            </button>
          </form>
        </SettingsCard>

        <SettingsCard title="Delete Account">
          <p className="text-sm text-gray-600">
            Permanently delete your account, all your product listings, and your order history. This
            cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="mt-4 rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Delete My Account
          </button>
        </SettingsCard>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal onClose={() => setShowDeleteModal(false)} onDeleted={handleAccountDeleted} />
      )}
    </FarmerLayout>
  );
}
