import { Link } from "react-router-dom";
import { Clock, ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// Shows where a farmer stands in the verification flow. Renders nothing once
// they're approved, so an approved farmer sees no extra chrome.
export default function VerificationBanner() {
  const { user } = useAuth();
  if (user?.role !== "farmer") return null;

  const status = user.verificationStatus || (user.isVerified ? "approved" : "pending");
  if (status === "approved") return null;

  const rejected = status === "rejected";
  const Icon = rejected ? ShieldAlert : Clock;

  return (
    <div
      className={`flex flex-wrap items-start gap-3 rounded-xl px-5 py-4 ${
        rejected ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"
      }`}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {rejected ? "Verification rejected" : "Pending verification"}
        </p>
        <p className="mt-0.5 text-sm">
          {rejected
            ? user.verificationNote ||
              "An administrator rejected your documents. Update them and resubmit."
            : "An administrator is reviewing your documents. You can list products once your account is approved."}
        </p>
      </div>
      <Link
        to="/farmer/settings"
        className={`shrink-0 rounded-md px-4 py-2 text-sm font-semibold text-white ${
          rejected ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
        }`}
      >
        {rejected ? "Resubmit documents" : "View documents"}
      </Link>
    </div>
  );
}
