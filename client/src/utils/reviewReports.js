// What someone can report a review for, and how a review report's status is
// shown. The keys are what the server stores (server/models/ReviewReport.js).
export const REVIEW_REPORT_REASONS = [
  { key: "adult_content", label: "Adult or Sexual Content" },
  { key: "spam", label: "Spam Review" },
  { key: "rude_abusive", label: "Rude or Abusive Review" },
  { key: "personal_info", label: "Exposing Personal Information" },
  {
    key: "fake_review",
    label: "Suspected Fake Review (e.g. paid for, inauthentic or exaggerated product features)",
  },
  {
    key: "misleading_review",
    label: "Misleading or Inaccurate Review (e.g. review does not match product)",
  },
  { key: "other", label: "Other Violations" },
];

export const reviewReasonLabel = (key) => REVIEW_REPORT_REASONS.find((r) => r.key === key)?.label || key;

// The label without its "(e.g. ...)" hint - for tables, where the hint only adds width.
export const reviewReasonShort = (key) => reviewReasonLabel(key).replace(/\s*\(e\.g\..*\)$/, "");

export const MAX_REVIEW_REPORT_DETAIL = 320;

// Pending -> Reviewed (an admin has opened it) -> Dismissed, Removed or Suspended (the admin's decision).
export const REVIEW_REPORT_STATUSES = [
  { key: "pending", label: "Pending", color: "bg-amber-100 text-amber-800" },
  { key: "reviewed", label: "Reviewed", color: "bg-blue-100 text-blue-700" },
  { key: "dismissed", label: "Dismissed", color: "bg-gray-100 text-gray-600" },
  { key: "removed", label: "Removed", color: "bg-orange-100 text-orange-700" },
  { key: "suspended", label: "Suspended", color: "bg-red-100 text-red-700" },
];

export const reviewStatusMeta = (key) =>
  REVIEW_REPORT_STATUSES.find((s) => s.key === key) || REVIEW_REPORT_STATUSES[0];

// Stepping back to the ratings page cannot carry anything with it, so a report
// just sent leaves the time behind here and the page reads it while rendering.
// It is forgotten when the thank-you is closed, and when the app is reloaded.
let sentAt = 0;
const JUST_NOW_MS = 10000;
export const markReviewReportSent = () => {
  sentAt = Date.now();
};
export const reviewReportJustSent = () => Date.now() - sentAt < JUST_NOW_MS;
export const forgetReviewReportSent = () => {
  sentAt = 0;
};
