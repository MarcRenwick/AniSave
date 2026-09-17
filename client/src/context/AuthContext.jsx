import { createContext, useContext, useState } from "react";
import { loginUser, registerUser } from "../services/api";
import { readStoredUser, writeSession, writeStoredUser, clearSession } from "../utils/session";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const persistSession = (data, remember = true) => {
    writeSession(data, remember);
    setUser(data);
  };

  const login = async (username, password, remember = true) => {
    const { data } = await loginUser({ username, password });
    persistSession(data, remember);
    return data;
  };

  const register = async (formData) => {
    const { data } = await registerUser(formData);
    persistSession(data);
    return data;
  };

  const logout = () => {
    clearSession();
    setUser(null);
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

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, setSession: persistSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
