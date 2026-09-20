import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft } from "lucide-react";

function Clause({ number, title, children }) {
  return (
    <section className="mt-5">
      <h2 className="text-sm font-semibold text-gray-900">
        {number}. {title}
      </h2>
      <p className="mt-1 text-sm leading-6 text-gray-600">{children}</p>
    </section>
  );
}

// What a farmer is asked to agree to before requesting deletion. It covers over
// the form rather than replacing it, so nothing they have filled in is lost.
export default function AccountDeletionTerms({ onClose }) {
  useEffect(() => {
    const closeOnEscape = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-30 overflow-y-auto bg-white">
      <div className="mx-auto max-w-3xl px-6 py-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Back to the deletion form"
          className="flex h-9 w-9 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>

        <h1 className="mt-3 text-2xl font-bold text-gray-900">Account Deletion Terms and Conditions</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Please review the following information before requesting the deletion of your farmer account.
        </p>

        <Clause number={1} title="Permanent Account Deletion">
          Deleting your account is a permanent action. Once the deletion process is completed, you may not be able to
          recover your farmer account or restore your previous account information.
        </Clause>
        <Clause number={2} title="Shop and Product Listings">
          Your shop profile, product listings, prices, stock information, and other seller-related content may no longer
          be accessible after account deletion.
        </Clause>
        <Clause number={3} title="Pending Orders">
          Please complete or resolve all pending, confirmed, and ready-for-pick-up orders before deleting your account.
          Any that are left are removed along with it, and the buyers who placed them are not notified.
        </Clause>
        <Clause number={4} title="Pre-Orders">
          If you have active pre-orders, make sure they are completed or cancelled before requesting deletion.
        </Clause>
        <Clause number={5} title="Your Information">
          Your government ID and farm documents, profile photo, the ratings you wrote and the reports you sent are
          deleted with the account. If you want a copy of your information, download it from Privacy &amp; Security
          before you continue.
        </Clause>
        <Clause number={6} title="Verification">
          Registering again later creates a new, unverified account. You would need to submit your ID and farm documents
          again for an administrator to review.
        </Clause>
        <Clause number={7} title="Confirming the Request">
          For your security, AniSave emails a one-time code to your registered address. The account is only deleted once
          that code is entered, and the request expires if it is not.
        </Clause>

        <button
          type="button"
          onClick={onClose}
          className="mt-8 w-full rounded-md bg-[#2f8f66] py-2.5 text-sm font-semibold text-white hover:bg-[#267a56] sm:w-48"
        >
          Back
        </button>
      </div>
    </div>,
    document.body
  );
}
