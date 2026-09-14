import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User as UserIcon, Pencil, KeyRound, Trash2 } from "lucide-react";
import BuyerLayout from "../../layouts/BuyerLayout";
import BuyerTopBar from "../../components/buyer/BuyerTopBar";
import DeleteAccountModal from "../../components/buyer/settings/DeleteAccountModal";
import EditProfileModal from "../../components/settings/EditProfileModal";
import ChangePasswordModal from "../../components/settings/ChangePasswordModal";
import { useAuth } from "../../context/AuthContext";
import { getCurrentUser } from "../../services/api";

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 rounded-md bg-gray-100 px-3 py-2.5 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

export default function BuyerSettings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then(({ data }) => updateUser(data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccountDeleted = () => {
    logout();
    navigate("/login");
  };

  return (
    <BuyerLayout>
      <BuyerTopBar>
        <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
      </BuyerTopBar>

      <div className="p-8">
        <div className="mx-auto max-w-lg">
          <div className="flex justify-center rounded-t-2xl bg-[#2f8f66] pb-14 pt-8">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-white/20 text-white">
              <UserIcon className="h-12 w-12" />
            </div>
          </div>

          <div className="-mt-10 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#2f8f66]">Personal Information</h2>

            <dl className="mt-4 space-y-4">
              <Field label="Full Name" value={user?.name} />
              <Field label="Contact Number" value={user?.phone || "Not set"} />
              <Field label="Email" value={user?.email} />
              <Field label="Address" value={user?.location || "Not set"} />
            </dl>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => setShowEdit(true)}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#2f8f66] py-2.5 text-sm font-semibold text-white transition duration-150 hover:bg-[#267a56] active:scale-[0.98]"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => setShowPassword(true)}
                className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-[#2f8f66] py-2.5 text-sm font-semibold text-[#2f8f66] transition duration-150 hover:bg-green-50 active:scale-[0.98]"
              >
                <KeyRound className="h-4 w-4" />
                Change Password
              </button>
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="flex w-full items-center justify-center gap-2 rounded-md border-2 border-red-600 py-2.5 text-sm font-semibold text-red-600 transition duration-150 hover:bg-red-50 active:scale-[0.98]"
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEdit(false)}
          onSaved={(data) => {
            updateUser(data);
            setShowEdit(false);
          }}
        />
      )}
      {showPassword && <ChangePasswordModal onClose={() => setShowPassword(false)} />}
      {showDelete && (
        <DeleteAccountModal onClose={() => setShowDelete(false)} onDeleted={handleAccountDeleted} />
      )}
    </BuyerLayout>
  );
}
