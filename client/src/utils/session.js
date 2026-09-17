// The signed-in session lives in localStorage when "Remember me" is ticked,
// and in sessionStorage otherwise - so it's gone once the browser closes.
// Reads check both, since only one of them holds it at a time.
const TOKEN_KEY = "anisave_token";
const USER_KEY = "anisave_user";

export function readStoredUser() {
  try {
    const stored = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeSession(data, remember) {
  clearSession();
  const store = remember ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, data.token);
  store.setItem(USER_KEY, JSON.stringify(data));
}

// Rewrites the user into whichever store currently holds the session, so a
// profile edit doesn't quietly move a "don't remember me" session into
// localStorage.
export function writeStoredUser(user) {
  const store = localStorage.getItem(USER_KEY) !== null ? localStorage : sessionStorage;
  store.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  [localStorage, sessionStorage].forEach((store) => {
    store.removeItem(TOKEN_KEY);
    store.removeItem(USER_KEY);
  });
}
