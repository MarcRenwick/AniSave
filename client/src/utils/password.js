export function getPasswordError(password) {
  // Before the length rule: a password padded with spaces is long enough
  // without being usable, and "too short" would be the wrong thing to say.
  if (/\s/.test(password)) {
    return "Password can't contain spaces";
  }
  if (password.length < 6 || password.length > 12) {
    return "Password must be 6-12 characters long";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one capital letter";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least one special character";
  }
  return "";
}

// What a new password needs in Privacy and Protection (MFA) - more than
// signing up asks for. The form ticks each one off as it is typed; the server
// checks the same (server/utils/validate.js, strongPassword).
export const STRONG_PASSWORD_RULES = [
  { label: "8-12 characters", test: (p) => p.length >= 8 && p.length <= 12 },
  { label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "A number", test: (p) => /[0-9]/.test(p) },
  { label: "A symbol", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function getStrongPasswordError(password) {
  if (/\s/.test(password)) return "Password can't contain spaces";
  if (STRONG_PASSWORD_RULES.some((rule) => !rule.test(password))) {
    return "New password must be 8-12 characters, with an uppercase letter, a lowercase letter, a number and a symbol";
  }
  return "";
}
