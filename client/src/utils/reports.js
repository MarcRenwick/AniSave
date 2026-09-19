// What a buyer can report a farmer for, and how a report's status is shown.
// The keys are what the server stores (server/models/Report.js).
export const REPORT_REASONS = [
  { key: "prohibited_item", label: "Prohibited Item" },
  { key: "scam", label: "Scam" },
  { key: "inappropriate_behavior", label: "Inappropriate or Offensive Behavior" },
  { key: "misleading_photos", label: "Fake or Misleading Product Photos" },
  { key: "other", label: "Others" },
];

export const reasonLabel = (key) => REPORT_REASONS.find((r) => r.key === key)?.label || key;

export const MAX_REPORT_DESCRIPTION = 320;
export const MAX_REPORT_EVIDENCE = 5;

// Pending -> Reviewed (an admin has opened it) -> Dismissed or Suspended (the admin's decision).
export const REPORT_STATUSES = [
  { key: "pending", label: "Pending", color: "bg-amber-100 text-amber-800" },
  { key: "reviewed", label: "Reviewed", color: "bg-blue-100 text-blue-700" },
  { key: "dismissed", label: "Dismissed", color: "bg-gray-100 text-gray-600" },
  { key: "suspended", label: "Suspended", color: "bg-red-100 text-red-700" },
];

export const statusMeta = (key) => REPORT_STATUSES.find((s) => s.key === key) || REPORT_STATUSES[0];
