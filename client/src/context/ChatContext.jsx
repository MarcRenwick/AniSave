import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { SERVER_URL, getUnreadMessages } from "../services/api";

// The live connection behind chat (Socket.IO). While a buyer or farmer is
// signed in, the server pushes every new message in their conversations here
// the moment it is saved; the Messages page listens through `subscribe`, and
// the navigation shows `unreadTotal`. The connection signs in with the same
// token as every API request, and closes when they log out.
const ChatContext = createContext(null);

const CHAT_ROLES = ["buyer", "farmer"];

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [unreadTotal, setUnreadTotal] = useState(0);
  // Counts reconnections: the Messages page reloads what it shows each time,
  // since anything sent while the connection was down never arrived live.
  // (A free Render server sleeps when idle, which drops the connection.)
  const [reconnects, setReconnects] = useState(0);
  const listeners = useRef(new Set());
  const token = CHAT_ROLES.includes(user?.role) ? user.token : null;

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SERVER_URL, { auth: { token } });
    const refresh = () =>
      getUnreadMessages()
        .then(({ data }) => setUnreadTotal(data.unreadTotal))
        .catch(() => {});

    // On every (re)connect, catch up on anything missed while disconnected.
    socket.on("connect", refresh);
    socket.io.on("reconnect", () => setReconnects((count) => count + 1));
    socket.on("chat:message", (payload) => {
      setUnreadTotal(payload.unreadTotal);
      listeners.current.forEach((listener) => listener(payload));
    });
    socket.on("chat:read", (payload) => setUnreadTotal(payload.unreadTotal));
    return () => socket.disconnect();
  }, [token]);

  const subscribe = useCallback((listener) => {
    listeners.current.add(listener);
    return () => listeners.current.delete(listener);
  }, []);

  return (
    <ChatContext.Provider value={{ unreadTotal: token ? unreadTotal : 0, setUnreadTotal, subscribe, reconnects }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within a ChatProvider");
  return context;
}
