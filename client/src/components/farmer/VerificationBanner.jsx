import { Link } from "react-router-dom";
import { Clock, FileUp, ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const variants = {
  missing: {
    Icon: FileUp,
    tone: "bg-amber-50 text-amber-900",
    button: "bg-amber-600 hover:bg-amber-700",
    title: "Documents needed",
    body: "Upload a government ID and at least one farm document so an administrator can verify your account. You can list products once approved.",
    action: "Submit documents",
  },
  pending: {
    Icon: Clock,
    tone: "bg-amber-50 text-amber-900",
    button: "bg-amber-600 hover:bg-amber-700",
    title: "Pending verification",
    body: "An administrator is reviewing your documents. You can list products once your account is approved.",
    action: "View documents",
  },
  rejected: {
    Icon: ShieldAlert,
    tone: "bg-red-50 text-red-800",
    button: "bg-red-600 hover:bg-red-700",
    title: "Verification rejected",
    body: "An administrator rejected your documents. Update them and resubmit.",
    action: "Resubmit documents",
  },
};

// Shows where a farmer stands in the verification flow. Renders nothing once
// they're approved, so an approved farmer sees no extra chrome.
export default function VerificationBanner() {
  const { user } = useAuth();
  if (user?.role !== "farmer") return null;

  const status = user.verificationStatus || (user.isVerified ? "approved" : "pending");
  if (status === "approved") return null;

  // Sessions from before logins carried the document fields don't have them
  // at all - only call documents missing when the session says so.
  const missingDocuments =
    "governmentId" in user && (!user.governmentId || !user.farmDocuments?.length);

  const variant = variants[status === "pending" && missingDocuments ? "missing" : status];
  const { Icon } = variant;

  return (
    <div className={`flex flex-wrap items-start gap-3 rounded-xl px-5 py-4 ${variant.tone}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{variant.title}</p>
        <p className="mt-0.5 text-sm">
          {status === "rejected" ? user.verificationNote || variant.body : variant.body}
        </p>
      </div>
      <Link
        to="/farmer/settings?verification=1"
        className={`shrink-0 rounded-md px-4 py-2 text-sm font-semibold text-white ${variant.button}`}
      >
        {variant.action}
      </Link>
    </div>
  );
}
