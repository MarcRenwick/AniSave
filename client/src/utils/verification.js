// How a farmer's document check reads in the admin screens. The keys are the
// statuses the server sends (see server/utils/verification.js), plus "missing"
// for a farmer who is still pending only because they haven't uploaded
// anything - there is nothing to approve yet.
export const VERIFICATION_META = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-800" },
  approved: { label: "Approved", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
  missing: {
    label: "No documents",
    color: "bg-gray-100 text-gray-600",
    title: "This farmer hasn't uploaded a government ID and farm documents yet, so there is nothing to approve.",
  },
};

export const hasDocuments = (user) => Boolean(user.governmentId) && user.farmDocuments?.length > 0;

export const verificationKey = (user) =>
  user.verificationStatus === "pending" && !hasDocuments(user) ? "missing" : user.verificationStatus;

// Approving or rejecting settles the documents in front of the administrator,
// and that is the end of it - the same submission is never judged twice, and
// the server refuses a second decision as well. A farmer who sends new
// documents goes back to pending and is reviewed again from scratch; an
// account that needs restricting after it was approved is banned instead.
export const isVerificationDecided = (user) =>
  user.verificationStatus === "approved" || user.verificationStatus === "rejected";
