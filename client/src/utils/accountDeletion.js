// Why a farmer is deleting their account. The keys are what the server checks
// (the list in server/controllers/authController.js); nothing is stored, since
// the account is about to go.
export const DELETION_REASONS = [
  { key: "no_longer_use", label: "I no longer want to use AniSave" },
  { key: "change_username", label: "I want to change my username" },
  { key: "no_longer_need", label: "I no longer need the account" },
  { key: "found_another", label: "I found another marketplace" },
  { key: "other", label: "Others" },
];

export const deletionReasonLabel = (key) => DELETION_REASONS.find((r) => r.key === key)?.label || key;

export const MAX_DELETION_DETAIL = 320;
