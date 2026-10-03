import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { SERVER_URL } from "../services/api";

// The live connection (Socket.IO) behind everything that updates without a
// refresh: chat, orders, the marketplace's listings, the farmer's dashboard and
// bell, and the admin's lists. While anyone is signed in, the server pushes to
// it the moment something they can see changes. Pages listen through
// `subscribe` - usually by way of useLiveRefresh, which fetches the page's data
// again from the API, the source of truth.
//
// It signs in with the same token as every API request, and closes when they
// log out. If it drops - a free Render server sleeps when idle, a phone loses
// signal - it reconnects by itself, and `reconnects` goes up so pages can fetch
// again whatever changed while it was down.
const RealtimeContext = createContext(null);

// When the server turns a connection away at the door (rather than it
// dropping), Socket.IO doesn't try again by itself - so this does, waiting a
// little longer each time. A session that has really ended is caught by the
// next API request, which sends the person back to the login page.
const RETRY_FIRST_MS = 2000;
const RETRY_MAX_MS = 30000;

export function RealtimeProvider({ children }) {
  const { user, updateUser } = useAuth();
  const [connected, setConnected] = useState(false);
  // Counts connections after a socket's first: the first one finds the page
  // freshly loaded, a later one may have missed things.
  const [reconnects, setReconnects] = useState(0);
  // Counts every connection, the first one included.
  const [connects, setConnects] = useState(0);
  const listeners = useRef(new Map());
  const socketRef = useRef(null);
  const token = user?.token || null;

  // updateUser changes on every render of AuthProvider; the socket shouldn't.
  const updateUserRef = useRef(updateUser);
  useEffect(() => {
    updateUserRef.current = updateUser;
  });

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SERVER_URL, { auth: { token } });
    socketRef.current = socket;

    let connectedBefore = false;
    let retryTimer = null;
    let retryDelay = RETRY_FIRST_MS;

    socket.on("connect", () => {
      retryDelay = RETRY_FIRST_MS;
      setConnected(true);
      setConnects((count) => count + 1);
      if (connectedBefore) setReconnects((count) => count + 1);
      connectedBefore = true;
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => {
      // Still trying by itself (the server was unreachable): leave it to that.
      if (socket.active) return;
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => socket.connect(), retryDelay);
      retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
    });

    socket.onAny((event, payload) => listeners.current.get(event)?.forEach((listener) => listener(payload)));

    // Their account changed somewhere else (an admin approved a farmer's
    // documents): the copy the pages read from is brought up to date.
    socket.on("account:updated", (fields) => updateUserRef.current(fields));

    // Leaving the site in this tab closes the connection, so the other person
    // in a chat sees when they left instead of "Active now". Without this, a
    // browser that keeps the page aside in case they press Back (the
    // back/forward cache) keeps the connection open too. Coming back opens it
    // again - as a reconnection, so the page catches up.
    const leave = () => socket.disconnect();
    const comeBack = (event) => {
      if (event.persisted) socket.connect();
    };
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", comeBack);

    return () => {
      clearTimeout(retryTimer);
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", comeBack);
      socketRef.current = null;
      socket.disconnect();
      setConnected(false);
    };
  }, [token]);

  // subscribe("order:changed", listener) - returns the function that stops it.
  const subscribe = useCallback((event, listener) => {
    if (!listeners.current.has(event)) listeners.current.set(event, new Set());
    listeners.current.get(event).add(listener);
    return () => listeners.current.get(event)?.delete(listener);
  }, []);

  // Sends an event over the connection, only while connected. `volatile`
  // drops it rather than queueing it if it can't go now (a typing indicator
  // is no use to anyone later).
  const emit = useCallback((event, payload, { volatile = false } = {}) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    (volatile ? socket.volatile : socket).emit(event, payload);
  }, []);

  return (
    <RealtimeContext.Provider value={{ connected: Boolean(token) && connected, connects, reconnects, subscribe, emit }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error("useRealtime must be used within a RealtimeProvider");
  return context;
}
