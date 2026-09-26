import { createContext, useContext, useState } from "react";
import { loginUser, registerUser, logoutSession } from "../services/api";
import {
  readStoredUser,
  readToken,
  writeSession,
  writeStoredUser,
  replaceToken,
  clearSession,
} from "../utils/session";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const persistSession = (data, remember = true) => {
    writeSession(data, remember);
    setUser(data);
  };

  // An account with two-step sign-in, or one whose email was never verified,
  // doesn't get a session from its password: the reply says a code was emailed
  // (`mfaRequired` / `verificationRequired`) and the login page finishes the
  // job, so nothing is stored yet.
  const login = async (username, password, remember = true) => {
    const { data } = await loginUser({ username, password });
    if (!data.mfaRequired && !data.verificationRequired) persistSession(data, remember);
    return data;
  };

  // Signing up doesn't sign anyone in: it emails a code to verify the address,
  // and the session comes from entering it (see VerifyEmailForm).
  const register = async (formData) => {
    const { data } = await registerUser(formData);
    return data;
  };

  // The browser forgets the session at once; the server is told too, so the
  // token stops working everywhere, not just here. If that call can't be made
  // the person is still logged out on this device.
  const logout = () => {
    const token = readToken();
    clearSession();
    setUser(null);
    if (token) logoutSession(token).catch(() => {});
  };

  // Merges partial updates (e.g. from editing profile info) into the stored
  // user so the UI reflects them immediately, without touching the token.
  const updateUser = (updates) => {
    setUser((prev) => {
      const next = { ...prev, ...updates };
      writeStoredUser(next);
      return next;
    });
  };

  // After a password change every old token is dead and the server hands back a new one.
  const updateToken = (token) => {
    replaceToken(token);
    setUser((prev) => (prev ? { ...prev, token } : prev));
  };

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, updateUser, updateToken, setSession: persistSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
