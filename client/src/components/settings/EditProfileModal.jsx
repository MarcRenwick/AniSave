import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import Modal from "../Modal";
import Avatar from "../Avatar";
import ImageCropperModal from "../ImageCropperModal";
import AddressPicker from "../AddressPicker";
import { updateProfile, uploadAvatar } from "../../services/api";
import { addressFromUser, isAddressComplete, sameAddress } from "../../utils/address";

const inputClass =
  "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]";

export default function EditProfileModal({ user, onClose, onSaved, onAvatarChanged }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    farmName: user?.farmName || "",
    farmDescription: user?.farmDescription || "",
  });
  // The address is picked from the Province > Municipality/City lists,
  // starting from what's saved. It is only sent if it was changed.
  const [savedAddress] = useState(() => addressFromUser(user));
  const [address, setAddress] = useState(savedAddress);
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [cropping, setCropping] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setCropping(file);
  };

  // The cropped photo is saved on its own, so it sticks even if the rest of
  // the form is cancelled.
  const handleCropped = async (blob) => {
    setCropping(null);
    setError("");
    setUploading(true);
    try {
      const data = new FormData();
      data.append("avatar", blob, "avatar.jpg");
      const { data: updated } = await uploadAvatar(data);
      setAvatar(updated.avatar);
      onAvatarChanged?.(updated);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save that photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const addressChanged = !sameAddress(address, savedAddress);
    if (addressChanged && !isAddressComplete(address)) {
      setError("Finish choosing your address - province and municipality/city.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await updateProfile(addressChanged ? { ...form, ...address } : form);
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

      <div className="mb-5 flex flex-col items-center">
        <Avatar
          src={avatar}
          alt={user?.name || "Profile photo"}
          className="h-24 w-24 rounded-full border-4 border-white bg-green-100 text-[#2f8f66] shadow-sm"
          iconClass="h-12 w-12"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="mt-3 flex items-center gap-2 rounded-full border-2 border-[#2f8f66] px-4 py-1.5 text-sm font-semibold text-[#2f8f66] hover:bg-green-50 disabled:opacity-60"
        >
          <Camera className="h-4 w-4" />
          {uploading ? "Saving..." : avatar ? "Change photo" : "Add photo"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePick} className="hidden" />
      </div>

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
          <p className="block text-sm font-medium text-gray-700">Address</p>
          {/* Accounts from before addresses were picked from lists only have text. */}
          {!user?.address?.cityCode && user?.location && (
            <p className="mt-1 text-xs text-gray-500">
              Currently saved as &ldquo;{user.location}&rdquo;. Pick your province and municipality/city
              below so buyers and sellers near you can be found.
            </p>
          )}
          <div className="mt-2">
            <AddressPicker
              value={address}
              onChange={setAddress}
              className="space-y-3"
              idPrefix="profile-address"
            />
          </div>
          {user?.role === "farmer" && (
            <p className="mt-2 text-xs text-gray-500">
              Your products are picked up here, so this address shows on all of your listings.
            </p>
          )}
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

      {cropping && (
        <ImageCropperModal
          file={cropping}
          onCancel={() => setCropping(null)}
          onCropped={handleCropped}
        />
      )}
    </Modal>
  );
}
