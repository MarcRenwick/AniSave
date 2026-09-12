import Modal from "./Modal";

export default function LogoutConfirmModal({ onClose, onConfirm }) {
  return (
    <Modal title="Log Out?" onClose={onClose}>
      <p className="text-sm text-gray-600">Are you sure you want to logout?</p>
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          No
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Yes
        </button>
      </div>
    </Modal>
  );
}
