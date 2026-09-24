// What a new account's name and username are allowed to be. The server checks
// all of this again (server/utils/validate.js) - these are here so the form
// can say what is wrong before it is sent, in the same words.

// A first or last name: letters only. A space is called out rather than
// trimmed away, because typing "Dela Cruz" into First name is a mistake worth
// pointing out instead of quietly turning into "DelaCruz".
export function getNameError(label, value) {
  const name = String(value ?? "");
  if (name.trim() === "") return `${label} is required`;
  if (/\s/.test(name)) return `${label} can't contain spaces`;
  if (/[0-9]/.test(name)) return `${label} can't contain numbers`;
  if (!/^[A-Za-z]+$/.test(name)) return `${label} can only use letters`;
  if (name.length < 2) return `${label} must be at least 2 letters`;
  if (name.length > 40) return `${label} must be 40 letters or fewer`;
  return "";
}

// A username: letters and digits, at least seven of them. Accounts made before
// this rule keep their dots and underscores - signing in doesn't re-check the
// shape - but nothing new may be chosen that way.
export function getUsernameError(value) {
  const username = String(value ?? "");
  if (username.trim() === "") return "Username is required";
  if (/\s/.test(username)) return "Username can't contain spaces";
  if (username.length < 7) return "Username must be at least 7 characters";
  if (username.length > 30) return "Username must be 30 characters or fewer";
  if (!/^[A-Za-z0-9]+$/.test(username)) return "Username can only use letters and numbers";
  return "";
}
