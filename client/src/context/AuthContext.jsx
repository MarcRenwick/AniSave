import { createContext, useContext, useState } from "react";
import { loginUser, registerUser } from "../services/api";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const stored = localStorage.getItem("anisave_user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const persistSession = (data) => {
    localStorage.setItem("anisave_token", data.token);
    localStorage.setItem("anisave_user", JSON.stringify(data));
    setUser(data);
  };

  const login = async (username, password) => {
    const { data } = await loginUser({ username, password });
    persistSession(data);
    return data;
  };

  const register = async (formData) => {
    const { data } = await registerUser(formData);
    persistSession(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("anisave_token");
    localStorage.removeItem("anisave_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
