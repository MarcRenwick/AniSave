export function getPasswordError(password) {
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
