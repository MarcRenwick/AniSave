// What a new account's name and username are allowed to be. The server checks
// all of this again (server/utils/validate.js) - these are here so the form
// can say what is wrong before it is sent, in the same words.

// A first or last name: letters, with spaces between words allowed - "Maria
// Clara", "Dela Cruz". Spaces at either end and doubled spaces are tidied away
// (the server saves "Dela  Cruz" as "Dela Cruz"), so they aren't errors here.
export function getNameError(label, value) {
  const name = String(value ?? "").trim().replace(/\s+/g, " ");
  if (name === "") return `${label} is required`;
  if (/[0-9]/.test(name)) return `${label} can't contain numbers`;
  if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(name)) return `${label} can only use letters and spaces`;
  if (name.replace(/ /g, "").length < 2) return `${label} must be at least 2 letters`;
  if (name.length > 40) return `${label} must be 40 characters or fewer`;
  return "";
}

// A contact number: exactly 11 digits, nothing else (09171234567). Optional -
// an empty box is fine.
export function getPhoneError(value) {
  const phone = String(value ?? "").trim();
  if (phone === "") return "";
  if (!/^\d+$/.test(phone)) return "Contact number can only use numbers";
  if (phone.length !== 11) return "Contact number must be exactly 11 digits";
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
