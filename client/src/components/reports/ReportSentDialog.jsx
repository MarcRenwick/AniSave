import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Smile } from "lucide-react";

// Shown once a report about a review has been submitted.
export default function ReportSentDialog({ onClose }) {
  useEffect(() => {
    const closeOnEscape = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-30 overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-sent-message"
          className="w-full max-w-sm rounded-xl border border-gray-300 bg-white p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#2f8f66] text-white">
            <Smile className="h-6 w-6" />
          </span>
          <p id="report-sent-message" className="mt-4 text-base font-medium leading-snug text-gray-900">
            Thank you for helping us maintain a safe and trustworthy marketplace. Your report has been submitted and
            will be reviewed by our team.
          </p>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="mt-5 w-full rounded-md bg-[#2f8f66] py-2 text-sm font-semibold text-white outline-none hover:bg-[#267a56] focus-visible:ring-2 focus-visible:ring-[#2f8f66] focus-visible:ring-offset-2"
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
