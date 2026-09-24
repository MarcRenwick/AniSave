import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { SERVER_URL, getUnreadMessages } from "../services/api";

// The live connection behind chat (Socket.IO). While a buyer or farmer is
// signed in, the server pushes to it the moment something happens in their
// conversations: a new message, their message being seen, the other person
// typing, or coming online and going offline. The Messages page listens
// through `subscribe`, and the navigation shows `unreadTotal`. The connection
// signs in with the same token as every API request, and closes when they log
// out.
const ChatContext = createContext(null);

const CHAT_ROLES = ["buyer", "farmer"];
// What the Messages page can listen for.
const EVENTS = ["chat:message", "chat:seen", "chat:typing", "chat:presence"];

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [unreadTotal, setUnreadTotal] = useState(0);
  // Counts reconnections: the Messages page reloads what it shows each time,
  // since anything sent while the connection was down never arrived live.
  // (A free Render server sleeps when idle, which drops the connection.)
  const [reconnects, setReconnects] = useState(0);
  const listeners = useRef(new Map());
  const socketRef = useRef(null);
  const token = CHAT_ROLES.includes(user?.role) ? user.token : null;

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SERVER_URL, { auth: { token } });
    socketRef.current = socket;
    const refresh = () =>
      getUnreadMessages()
        .then(({ data }) => setUnreadTotal(data.unreadTotal))
        .catch(() => {});

    // On every (re)connect, catch up on anything missed while disconnected.
    let connectedBefore = false;
    socket.on("connect", () => {
      refresh();
      if (connectedBefore) setReconnects((count) => count + 1);
      connectedBefore = true;
    });
    // Leaving the site in this tab closes the connection, so the other person
    // sees when they left instead of "Active now". Without this, a browser
    // that keeps the page aside in case they press Back (the back/forward
    // cache) keeps the connection open too. Coming back opens it again.
    const leave = () => socket.disconnect();
    const comeBack = (event) => {
      if (event.persisted) socket.connect();
    };
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", comeBack);
    EVENTS.forEach((event) =>
      socket.on(event, (payload) => {
        if (event === "chat:message") setUnreadTotal(payload.unreadTotal);
        listeners.current.get(event)?.forEach((listener) => listener(payload));
      })
    );
    socket.on("chat:read", (payload) => setUnreadTotal(payload.unreadTotal));
    return () => {
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", comeBack);
      socketRef.current = null;
      socket.disconnect();
    };
  }, [token]);

  // subscribe("chat:message", listener) - returns the function that stops it.
  const subscribe = useCallback((event, listener) => {
    if (!listeners.current.has(event)) listeners.current.set(event, new Set());
    listeners.current.get(event).add(listener);
    return () => listeners.current.get(event).delete(listener);
  }, []);

  // Tells the other person in a conversation that this one is (or has stopped)
  // typing. Only while connected: "typing" is no use to anyone later.
  const sendTyping = useCallback((conversation, typing) => {
    const socket = socketRef.current;
    if (socket?.connected) socket.volatile.emit("chat:typing", { conversation, typing });
  }, []);

  return (
    <ChatContext.Provider value={{ unreadTotal: token ? unreadTotal : 0, setUnreadTotal, subscribe, sendTyping, reconnects }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within a ChatProvider");
  return context;
}
