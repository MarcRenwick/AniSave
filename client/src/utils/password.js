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
