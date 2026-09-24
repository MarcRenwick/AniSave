import { useState } from "react";
import Modal from "../Modal";

const MAX_REASON = 500;

// Banning asks why: the person is shown the reason when they try to log in.
// Unbanning needs no reason.
export default function BanConfirmModal({ user, onClose, onConfirm }) {
  const willBan = !user.isBanned;
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const confirm = () => {
    if (willBan && !reason.trim()) {
      setReasonError("Enter the reason for the ban - it is shown to them when they try to log in.");
      return;
    }
    onConfirm(willBan ? reason.trim() : undefined);
  };

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
      {willBan && (
        <div className="mt-4">
          <label htmlFor="ban-reason" className="block text-sm font-medium text-gray-700">
            Reason
          </label>
          <textarea
            id="ban-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setReasonError("");
            }}
            rows={3}
            maxLength={MAX_REASON}
            placeholder="e.g. Selling prohibited items"
            aria-invalid={Boolean(reasonError)}
            className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
              reasonError
                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-[#2f8f66] focus:ring-[#2f8f66]"
            }`}
          />
          {reasonError ? (
            <p role="alert" className="mt-1 text-xs text-red-600">
              {reasonError}
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500">They will see this when they try to log in.</p>
          )}
        </div>
      )}
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
          onClick={confirm}
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
