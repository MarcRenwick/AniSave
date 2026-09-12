import Modal from "../Modal";

export default function BanConfirmModal({ user, onClose, onConfirm }) {
  const willBan = !user.isBanned;

  return (
    <Modal title={willBan ? "Ban User?" : "Unban User?"} onClose={onClose}>
      <p className="text-sm text-gray-600">
        {willBan ? (
          <>
            Are you sure you want to ban <span className="font-medium">{user.name}</span> (
            {user.username})? They will not be able to log in until unbanned.
          </>
        ) : (
          <>
            Are you sure you want to unban <span className="font-medium">{user.name}</span> (
            {user.username})? They will be able to log in again.
          </>
        )}
      </p>
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`flex-1 rounded-md py-2 text-sm font-semibold text-white ${
            willBan ? "bg-red-600 hover:bg-red-700" : "bg-[#2f8f66] hover:bg-[#267a56]"
          }`}
        >
          {willBan ? "Yes, Ban" : "Yes, Unban"}
        </button>
      </div>
    </Modal>
  );
}
