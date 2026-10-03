import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { useRealtime } from "./RealtimeContext";
import { getUnreadMessages } from "../services/api";

// Chat, over the live connection (context/RealtimeContext.jsx). While a buyer
// or farmer is signed in, the server pushes to it the moment something happens
// in their conversations: a new message, a deleted one, their message being
// seen, the other person typing, or coming online and going offline. The
// Messages page listens through `subscribe`, and the navigation shows
// `unreadTotal`.
const ChatContext = createContext(null);

const CHAT_ROLES = ["buyer", "farmer"];

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const { subscribe, emit, connects, reconnects } = useRealtime();
  const [unreadTotal, setUnreadTotal] = useState(0);
  const inChat = CHAT_ROLES.includes(user?.role);

  // On every (re)connect, catch up on anything missed while disconnected.
  useEffect(() => {
    if (!inChat || !connects) return;
    getUnreadMessages()
      .then(({ data }) => setUnreadTotal(data.unreadTotal))
      .catch(() => {});
  }, [inChat, connects]);

  useEffect(() => {
    if (!inChat) return undefined;
    const stops = [
      subscribe("chat:message", (payload) => setUnreadTotal(payload.unreadTotal)),
      subscribe("chat:read", (payload) => setUnreadTotal(payload.unreadTotal)),
    ];
    return () => stops.forEach((stop) => stop());
  }, [inChat, subscribe]);

  // Tells the other person in a conversation that this one is (or has stopped)
  // typing. Only while connected: "typing" is no use to anyone later.
  const sendTyping = useCallback(
    (conversation, typing) => emit("chat:typing", { conversation, typing }, { volatile: true }),
    [emit]
  );

  return (
    <ChatContext.Provider value={{ unreadTotal: inChat ? unreadTotal : 0, setUnreadTotal, subscribe, sendTyping, reconnects }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within a ChatProvider");
  return context;
}
