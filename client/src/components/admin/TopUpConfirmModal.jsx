import Modal from "../Modal";

export default function TopUpConfirmModal({ request, action, onClose, onConfirm }) {
  const isApprove = action === "approve";

  return (
    <Modal title={isApprove ? "Approve Top-up?" : "Reject Top-up?"} onClose={onClose}>
      <p className="text-sm text-gray-600">
        {isApprove ? (
          <>
            Approve a top-up of{" "}
            <span className="font-medium">₱{request.amount}</span> for{" "}
            <span className="font-medium">
              {request.buyer?.name} ({request.buyer?.username})
            </span>
            ? Their wallet balance will be credited immediately.
          </>
        ) : (
          <>
            Reject the top-up request of{" "}
            <span className="font-medium">₱{request.amount}</span> from{" "}
            <span className="font-medium">
              {request.buyer?.name} ({request.buyer?.username})
            </span>
            ? No balance will be credited.
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
            isApprove ? "bg-[#2f8f66] hover:bg-[#267a56]" : "bg-red-600 hover:bg-red-700"
          }`}
        >
          {isApprove ? "Yes, Approve" : "Yes, Reject"}
        </button>
      </div>
    </Modal>
  );
}
