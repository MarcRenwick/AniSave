import Modal from "../../Modal";

export default function DeleteConfirmModal({ product, onClose, onConfirm }) {
  return (
    <Modal title="Delete Product?" onClose={onClose}>
      <p className="text-sm text-gray-600">
        Are you sure you want to delete <span className="font-medium">{product.title}</span>?
      </p>
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          No, keep it
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Yes, delete it!
        </button>
      </div>
    </Modal>
  );
}
