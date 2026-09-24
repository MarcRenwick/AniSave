import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Ban, Check, CheckCheck, Image as ImageIcon, ImagePlus, MessageCircle, Send, Trash2, X } from "lucide-react";
import Avatar from "../Avatar";
import Modal from "../Modal";
import ChatOrders from "./ChatOrders";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { useDocumentUrl } from "../../utils/documents";
import { activeStatus } from "../../utils/activity";
import { MAX_PHOTO_BYTES, PHOTO_TYPES, shrinkPhoto } from "../../utils/photos";
import {
  getConversations,
  getConversation,
  markConversationRead,
  sendChatMessage,
  sendChatPhoto,
  unsendChatMessage,
  deleteChatMessage,
  deleteConversation,
} from "../../services/api";

const MAX_MESSAGE = 1000;
// "Typing": said again every few seconds while they keep typing, taken back a
// few seconds after the last keystroke - and, on the other side, dropped if it
// isn't renewed (a laptop lid closed mid-sentence).
const TYPING_REPEAT = 2500;
const TYPING_IDLE = 4000;
const TYPING_SHOWN_FOR = 6000;
// How often "Active 5 minutes ago" is worked out again.
const ACTIVITY_REFRESH = 30 * 1000;

// A farmer goes by their farm's name, the way buyers know them.
const displayName = (person) =>
  person?.role === "farmer" ? person.farmName || person.name : person?.name || "Unknown";

const isToday = (date) => new Date(date).toDateString() === new Date().toDateString();
const clock = (date) => new Date(date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
const day = (date) => new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
// Under a message: the time today, the date and time before that.
const messageTime = (date) => (isToday(date) ? clock(date) : `${day(date)}, ${clock(date)}`);
// In the list: just the time today, just the date before that.
const listTime = (date) => (date ? (isToday(date) ? clock(date) : day(date)) : "");

// The newest conversation first, without the same one twice.
const upsert = (list, conversation) => [conversation, ...list.filter((c) => c._id !== conversation._id)];
// A conversation back in its place after a message in it was deleted: in
// order of its newest message, or out of the list when none is left.
const place = (list, conversation) => {
  const rest = list.filter((c) => c._id !== conversation._id);
  if (!conversation.lastMessageAt) return rest;
  return [...rest, conversation].sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
};

const photoForm = (file, caption) => {
  const form = new FormData();
  form.append("image", file, file.name);
  if (caption) form.append("text", caption);
  return form;
};

// A green dot on someone's picture while they have AniSave open.
function OnlineDot({ online }) {
  if (!online) return null;
  return (
    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white" data-testid="online-dot" />
  );
}

// Under the name: their role, then "Active now" or how long ago they were
// active - worked out again every half minute, so it doesn't go stale.
function ActivityLine({ person }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), ACTIVITY_REFRESH);
    return () => clearInterval(timer);
  }, []);
  const status = activeStatus(person.online, person.lastActiveAt);
  return (
    <p className="truncate text-xs text-gray-500" data-testid="chat-status">
      <span className="capitalize">{person.role}</span>
      {status && (
        <>
          {" · "}
          <span className={person.online ? "font-medium text-[#2f8f66]" : ""}>{status}</span>
        </>
      )}
    </p>
  );
}

// A photo in a message. It is private, so it is fetched with the login token
// (see utils/documents.js). Always the same height, so the conversation
// doesn't jump about as photos arrive.
function ChatPhoto({ path, onOpen }) {
  const { url, failed } = useDocumentUrl(path);
  if (!url) {
    return (
      <div
        role="img"
        aria-label={failed ? "Photo unavailable" : "Loading photo"}
        className="flex h-52 w-52 items-center justify-center rounded-xl bg-black/5 text-xs text-gray-400"
      >
        {failed ? "Photo unavailable" : ""}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(url)}
      aria-label="View photo"
      className="block overflow-hidden rounded-xl hover:transform-none"
    >
      <img src={url} alt="Photo" className="h-52 w-auto min-w-24 max-w-64 object-cover" />
    </button>
  );
}

// Beside each message. It shows while the pointer is over the message or it
// has keyboard focus - and all the time on a touch screen, which can't hover.
function DeleteMessageButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Delete message"
      title="Delete message"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

function TypingBubble({ name }) {
  return (
    <div className="flex flex-col items-start" data-testid="typing-indicator">
      <div
        role="status"
        aria-label={`${name} is typing`}
        className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-4 py-3 ring-1 ring-gray-200"
      >
        {[0, 150, 300].map((delay) => (
          <span key={delay} className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </div>
      <p className="mt-1 text-[11px] text-gray-400">{name} is typing...</p>
    </div>
  );
}

// Conversations down the side, the open one beside them. New messages,
// deleted ones, "Seen", "typing..." and who is active arrive over the live
// connection (context/ChatContext.jsx) without a refresh.
export default function ChatPanel({ basePath, heightClass }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribe, sendTyping, setUnreadTotal, reconnects } = useChat();

  const [conversations, setConversations] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [thread, setThread] = useState({ id: null, conversation: null, messages: [], notice: null, error: "" });
  const [text, setText] = useState("");
  // A photo waiting to be sent, with the conversation it was chosen in.
  const [photo, setPhoto] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  // The conversations where the other person is typing right now.
  const [typingIn, setTypingIn] = useState({});
  // A photo being looked at full size: { url, messageId, conversationId }.
  const [viewing, setViewing] = useState(null);
  // What the delete dialog is asking about - { message } or { conversation } -
  // and which way it is being deleted while that is under way.
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  // Which conversation is open, for a message that arrives while it is.
  const openId = useRef(id);
  useEffect(() => {
    openId.current = id;
  }, [id]);

  const isBuyer = user?.role === "buyer";
  const myId = user?._id;
  const threadLoading = Boolean(id) && thread.id !== id;
  const active = thread.id === id ? thread.conversation : null;
  const staged = photo?.conversation === id ? photo : null;
  const theyAreTyping = Boolean(id && typingIn[id]);

  // Reading a conversation clears its count, here and on the Messages link.
  const markRead = useCallback(
    (conversationId) =>
      markConversationRead(conversationId)
        .then(({ data }) => setUnreadTotal(data.unreadTotal))
        .catch(() => {}),
    [setUnreadTotal]
  );

  // "Seen" has to mean seen: while this tab is in the background, what arrives
  // is only marked read once they come back to it.
  const readWhenBack = useRef(null);
  const markReadWhenSeen = useCallback(
    (conversationId) => {
      if (document.visibilityState === "visible") markRead(conversationId);
      else readWhenBack.current = conversationId;
    },
    [markRead]
  );
  useEffect(() => {
    const onVisible = () => {
      const conversationId = readWhenBack.current;
      if (document.visibilityState !== "visible" || !conversationId) return;
      readWhenBack.current = null;
      if (conversationId === openId.current) markRead(conversationId);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markRead]);

  // Loaded on opening, and again after the live connection comes back.
  useEffect(() => {
    getConversations()
      .then(({ data }) => setConversations(data))
      .catch(() => {})
      .finally(() => setListLoading(false));
  }, [reconnects]);

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    getConversation(id)
      .then(({ data }) => {
        if (cancelled) return;
        setThread({ id, conversation: data.conversation, messages: data.messages, notice: data.notice, error: "" });
        setConversations((list) => list.map((c) => (c._id === id ? { ...c, unread: 0 } : c)));
        markReadWhenSeen(id);
      })
      .catch(() => {
        if (!cancelled) {
          setThread({ id, conversation: null, messages: [], notice: null, error: "This conversation isn't available." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, markReadWhenSeen, reconnects]);

  // The other person typing, shown until they stop, send, or go quiet.
  const typingTimers = useRef({});
  const showTyping = useCallback((conversationId, typing) => {
    clearTimeout(typingTimers.current[conversationId]);
    if (typing) {
      typingTimers.current[conversationId] = setTimeout(
        () => setTypingIn((current) => ({ ...current, [conversationId]: false })),
        TYPING_SHOWN_FOR
      );
    }
    setTypingIn((current) =>
      Boolean(current[conversationId]) === typing ? current : { ...current, [conversationId]: typing }
    );
  }, []);
  useEffect(() => {
    const timers = typingTimers.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  // When a "Seen" last arrived for each conversation (see send).
  const seenArrived = useRef({});

  // A message deleted - here, in another tab, or by the other person for
  // everyone. Deleted for everyone, `message` is what stands in its place;
  // otherwise it goes. `conversation` updates the list's preview.
  const applyDeleted = useCallback(({ conversationId, messageId, message, conversation }) => {
    setThread((current) =>
      current.id !== conversationId
        ? current
        : {
            ...current,
            messages: message
              ? current.messages.map((m) => (m._id === messageId ? message : m))
              : current.messages.filter((m) => m._id !== messageId),
            conversation:
              conversation && current.conversation ? { ...current.conversation, ...conversation, unread: 0 } : current.conversation,
          }
    );
    if (conversation) {
      setConversations((list) => place(list, conversation._id === openId.current ? { ...conversation, unread: 0 } : conversation));
    }
    setViewing((current) => (current?.messageId === messageId ? null : current));
  }, []);

  // A conversation this person deleted, here or in another tab.
  const applyCleared = useCallback((conversationId) => {
    setConversations((list) => list.filter((c) => c._id !== conversationId));
    setThread((current) => (current.id === conversationId ? { ...current, messages: [] } : current));
    setViewing((current) => (current?.conversationId === conversationId ? null : current));
  }, []);

  useEffect(() => {
    const stops = [
      // A new message, from either side, the moment the server saves it.
      subscribe("chat:message", ({ message, conversation }) => {
        const isOpen = message.conversation === openId.current;
        const fromThem = message.sender !== myId;
        setConversations((list) => upsert(list, isOpen ? { ...conversation, unread: 0 } : conversation));
        if (fromThem) showTyping(message.conversation, false);
        if (!isOpen) return;
        setThread((current) =>
          current.id !== message.conversation
            ? current
            : {
                ...current,
                messages: current.messages.some((m) => m._id === message._id)
                  ? current.messages
                  : [...current.messages, message],
                conversation: { ...current.conversation, ...conversation, unread: 0 },
              }
        );
        if (fromThem) markReadWhenSeen(message.conversation);
      }),
      // The other person has read what this one sent.
      subscribe("chat:seen", ({ conversationId }) => {
        seenArrived.current[conversationId] = Date.now();
        const seen = (c) => (c._id === conversationId ? { ...c, seen: true } : c);
        setConversations((list) => list.map(seen));
        setThread((current) => (current.conversation ? { ...current, conversation: seen(current.conversation) } : current));
      }),
      subscribe("chat:typing", ({ conversation, typing }) => showTyping(conversation, typing === true)),
      // Someone came online or went offline.
      subscribe("chat:presence", ({ userId, online, lastActiveAt }) => {
        const update = (c) => (c.other?._id === userId ? { ...c, other: { ...c.other, online, lastActiveAt } } : c);
        setConversations((list) => list.map(update));
        setThread((current) => (current.conversation ? { ...current, conversation: update(current.conversation) } : current));
      }),
      subscribe("chat:deleted", applyDeleted),
      subscribe("chat:cleared", ({ conversationId }) => applyCleared(conversationId)),
    ];
    return () => stops.forEach((stop) => stop());
  }, [subscribe, myId, markReadWhenSeen, showTyping, applyDeleted, applyCleared]);

  // Telling the other person this one is typing.
  const typingSent = useRef({ conversation: null, at: 0, idle: null });
  const stopTyping = useCallback(() => {
    const state = typingSent.current;
    clearTimeout(state.idle);
    if (state.conversation) sendTyping(state.conversation, false);
    typingSent.current = { conversation: null, at: 0, idle: null };
  }, [sendTyping]);
  const noteTyping = (value) => {
    if (!id || !value.trim()) {
      stopTyping();
      return;
    }
    if (typingSent.current.conversation !== id) stopTyping();
    const state = typingSent.current;
    if (!state.conversation || Date.now() - state.at > TYPING_REPEAT) {
      sendTyping(id, true);
      state.conversation = id;
      state.at = Date.now();
    }
    clearTimeout(state.idle);
    state.idle = setTimeout(stopTyping, TYPING_IDLE);
  };
  // Leaving a conversation, or the page, ends "typing..." there.
  useEffect(() => stopTyping, [id, stopTyping]);

  // Always showing the newest message.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread.messages.length, thread.id]);
  // "typing..." appearing, or a photo waiting to be sent, keeps the bottom in
  // view for anyone who was already there.
  useEffect(() => {
    const box = scrollRef.current;
    if (box && box.scrollHeight - box.scrollTop - box.clientHeight < 120) box.scrollTop = box.scrollHeight;
  }, [theyAreTyping, staged]);

  // A preview is let go of once it has been replaced, sent or removed.
  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.preview);
    },
    [photo]
  );

  useEffect(() => {
    if (!viewing) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setViewing(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [viewing]);

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !id) return;
    setSendError("");
    if (!PHOTO_TYPES.includes(file.type)) {
      setSendError("Choose a JPG, PNG, WebP or GIF photo.");
      return;
    }
    const ready = await shrinkPhoto(file);
    if (ready.size > MAX_PHOTO_BYTES) {
      setSendError("That photo is too big - photos must be 5 MB or smaller.");
      return;
    }
    setPhoto({ conversation: id, file: ready, preview: URL.createObjectURL(ready) });
  };

  const send = async (e) => {
    e.preventDefault();
    const clean = text.trim();
    if ((!clean && !staged) || !id || sending) return;
    setSending(true);
    setSendError("");
    stopTyping();
    const startedAt = Date.now();
    try {
      const { data } = staged
        ? await sendChatPhoto(id, photoForm(staged.file, clean))
        : await sendChatMessage(id, clean);
      setText("");
      if (staged) setPhoto(null);
      setThread((current) => {
        if (current.id !== id || !current.conversation) return current;
        // A "Seen" that arrived while this was on its way is newer news than
        // the answer to it.
        const seen = (seenArrived.current[id] || 0) >= startedAt ? current.conversation.seen : data.conversation.seen;
        return {
          ...current,
          messages: current.messages.some((m) => m._id === data.message._id)
            ? current.messages
            : [...current.messages, data.message],
          conversation: { ...current.conversation, ...data.conversation, seen },
        };
      });
      setConversations((list) => upsert(list, data.conversation));
    } catch (err) {
      setSendError(err.response?.data?.message || "Could not send that. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const askDelete = (target) => {
    setDeleteError("");
    setDeleting(target);
  };
  const closeDelete = () => {
    if (!deleteBusy) setDeleting(null);
  };

  const removeMessage = async (forEveryone) => {
    const { message } = deleting;
    setDeleteBusy(forEveryone ? "everyone" : "me");
    setDeleteError("");
    try {
      const { data } = forEveryone
        ? await unsendChatMessage(message.conversation, message._id)
        : await deleteChatMessage(message.conversation, message._id);
      applyDeleted({ conversationId: message.conversation, messageId: message._id, ...data });
      setDeleting(null);
    } catch (err) {
      // Already deleted for them in another tab: all that is left is to say so here.
      if (err.response?.status === 404) {
        applyDeleted({ conversationId: message.conversation, messageId: message._id });
        setDeleting(null);
      } else {
        setDeleteError(err.response?.data?.message || "Could not delete that. Please try again.");
      }
    } finally {
      setDeleteBusy(null);
    }
  };

  const removeConversation = async () => {
    const conversationId = id;
    setDeleteBusy("conversation");
    setDeleteError("");
    try {
      const { data } = await deleteConversation(conversationId);
      setUnreadTotal(data.unreadTotal);
      applyCleared(conversationId);
      setDeleting(null);
      navigate(basePath);
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Could not delete this conversation. Please try again.");
    } finally {
      setDeleteBusy(null);
    }
  };

  const other = active?.other;
  // "Sent" or "Seen" goes under the last message, when it is this person's
  // and hasn't been deleted.
  const last = thread.messages[thread.messages.length - 1];
  const receiptOn = active && last?.sender === myId && !last.deleted ? last._id : null;
  const deletingMessage = deleting?.message;
  const canUnsend = Boolean(deletingMessage && deletingMessage.sender === myId && !deletingMessage.deleted);

  return (
    <div
      className={`grid overflow-hidden rounded-2xl bg-white shadow-sm md:grid-cols-[20rem_1fr] ${heightClass}`}
      data-testid="chat-panel"
    >
      {/* min-w-0 on both columns: without it a long line (an order, a name)
          widens the column past a phone's screen and the edge is cut off. */}
      <aside className={`${id ? "hidden md:flex" : "flex"} min-h-0 min-w-0 flex-col border-r border-gray-200`}>
        <p className="border-b border-gray-100 px-5 py-4 text-sm font-semibold text-gray-900">Conversations</p>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {listLoading && <li className="px-5 py-4 text-sm text-gray-500">Loading...</li>}
          {!listLoading && conversations.length === 0 && (
            <li className="px-5 py-6 text-sm leading-relaxed text-gray-500">
              No messages yet.{" "}
              {isBuyer
                ? "Open a farmer's shop or one of their products and press Message Farmer to start a conversation."
                : "When a buyer messages you, the conversation appears here."}
            </li>
          )}
          {conversations.map((c) => {
            const unread = c.unread > 0;
            const typing = typingIn[c._id];
            const lastMessage = c.lastMessage;
            return (
              <li key={c._id}>
                <button
                  type="button"
                  onClick={() => navigate(`${basePath}/${c._id}`)}
                  data-conversation={c._id}
                  className={`flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-gray-50 ${
                    c._id === id ? "bg-green-50" : ""
                  }`}
                >
                  <span className="relative shrink-0">
                    <Avatar
                      src={c.other.avatar}
                      alt={displayName(c.other)}
                      className="h-11 w-11 rounded-full bg-green-100 text-[#2f8f66]"
                      iconClass="h-6 w-6"
                    />
                    <OnlineDot online={c.other.online} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-sm ${unread ? "font-bold text-gray-900" : "font-semibold text-gray-900"}`}>
                        {displayName(c.other)}
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-400">{listTime(c.lastMessageAt)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span
                        className={`truncate text-xs ${
                          typing ? "font-medium text-[#2f8f66]" : unread ? "font-semibold text-gray-800" : "text-gray-500"
                        }`}
                      >
                        {typing ? (
                          "typing..."
                        ) : lastMessage?.deleted ? (
                          <span className="italic">
                            {lastMessage.sender === myId ? "You deleted a message" : "This message was deleted"}
                          </span>
                        ) : (
                          <>
                            {lastMessage?.sender === myId ? "You: " : ""}
                            {lastMessage?.image && <ImageIcon className="mr-1 inline h-3.5 w-3.5 align-[-3px]" />}
                            {lastMessage?.text || (lastMessage?.image ? "Photo" : "")}
                          </>
                        )}
                      </span>
                      {unread && (
                        <span
                          className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white"
                          aria-label={`${c.unread} unread`}
                        >
                          {c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className={`${id ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col`}>
        {!id && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-gray-500">
            <MessageCircle className="h-10 w-10 text-gray-300" />
            Choose a conversation to read it.
          </div>
        )}

        {id && threadLoading && <p className="p-6 text-sm text-gray-500">Loading...</p>}
        {id && !threadLoading && thread.error && <p className="p-6 text-sm text-red-600">{thread.error}</p>}

        {id && !threadLoading && active && (
          <>
            <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-3">
              <Link to={basePath} className="text-gray-500 hover:text-gray-900 md:hidden" aria-label="Back to conversations">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <span className="relative shrink-0">
                <Avatar
                  src={other.avatar}
                  alt={displayName(other)}
                  className="h-10 w-10 rounded-full bg-green-100 text-[#2f8f66]"
                  iconClass="h-5 w-5"
                />
                <OnlineDot online={other.online} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-900" data-testid="chat-with">
                  {displayName(other)}
                </p>
                <ActivityLine person={other} />
              </div>
              {isBuyer && other._id && (
                <Link
                  to={`/buyer/farmers/${other._id}`}
                  className="shrink-0 rounded-md border border-[#2f8f66] px-3 py-1.5 text-xs font-semibold text-[#2f8f66] transition hover:bg-green-50"
                >
                  View Shop
                </Link>
              )}
              <button
                type="button"
                onClick={() => askDelete({ conversation: true })}
                aria-label="Delete conversation"
                title="Delete conversation"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>

            {isBuyer && other._id && <ChatOrders key={id} conversationId={id} reloadKey={reconnects} />}

            <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50 px-5 py-4" data-testid="chat-messages">
              {thread.messages.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-400">
                  {isBuyer ? `Say hello to ${displayName(other)}.` : "No messages yet."}
                </p>
              )}
              {thread.messages.map((m) => {
                const mine = m.sender === myId;
                const remove = <DeleteMessageButton onClick={() => askDelete({ message: m })} />;
                return (
                  <div key={m._id} className={`group flex flex-col ${mine ? "items-end" : "items-start"}`} data-mine={mine}>
                    <div className={`flex w-full items-center gap-1 ${mine ? "justify-end" : "justify-start"}`}>
                      {mine && remove}
                      {m.deleted ? (
                        <div
                          data-testid="deleted-message"
                          className={`flex max-w-[75%] items-center gap-1.5 rounded-2xl bg-white px-4 py-2 text-sm italic text-gray-400 ring-1 ring-gray-200 ${
                            mine ? "rounded-br-sm" : "rounded-bl-sm"
                          }`}
                        >
                          <Ban className="h-3.5 w-3.5 shrink-0" />
                          {mine ? "You deleted this message" : "This message was deleted"}
                        </div>
                      ) : (
                        <div
                          className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl text-sm ${m.image ? "p-1" : "px-4 py-2"} ${
                            mine ? "rounded-br-sm bg-[#2f8f66] text-white" : "rounded-bl-sm bg-white text-gray-900 ring-1 ring-gray-200"
                          }`}
                        >
                          {m.image && (
                            <ChatPhoto
                              path={m.image}
                              onOpen={(url) => setViewing({ url, messageId: m._id, conversationId: m.conversation })}
                            />
                          )}
                          {m.image ? m.text && <p className="px-3 pb-1.5 pt-1.5">{m.text}</p> : m.text}
                        </div>
                      )}
                      {!mine && remove}
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                      <span>
                        {mine ? "You" : displayName(other)} · {messageTime(m.createdAt)}
                      </span>
                      {m._id === receiptOn && (
                        <span
                          data-testid="receipt"
                          className={`flex items-center gap-0.5 ${active.seen ? "font-medium text-[#2f8f66]" : ""}`}
                        >
                          ·{" "}
                          {active.seen ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                          {active.seen ? "Seen" : "Sent"}
                        </span>
                      )}
                    </p>
                  </div>
                );
              })}
              {theyAreTyping && <TypingBubble name={displayName(other)} />}
            </div>

            {thread.notice ? (
              <p className="border-t border-gray-200 bg-gray-50 px-5 py-4 text-center text-sm text-gray-500">{thread.notice}</p>
            ) : (
              <form onSubmit={send} className="border-t border-gray-200 p-3">
                {sendError && <p className="mb-2 px-1 text-xs text-red-600">{sendError}</p>}
                {staged && (
                  <div className="mb-2 flex items-center gap-3 px-1" data-testid="photo-preview">
                    <span className="relative shrink-0">
                      <img src={staged.preview} alt="Photo to send" className="h-16 w-16 rounded-lg object-cover ring-1 ring-gray-200" />
                      <button
                        type="button"
                        onClick={() => setPhoto(null)}
                        aria-label="Remove photo"
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-white hover:bg-gray-900"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                    <span className="text-xs text-gray-500">Add a caption if you like, then press Send.</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept={PHOTO_TYPES.join(",")}
                    onChange={pickPhoto}
                    className="hidden"
                    data-testid="photo-input"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={sending}
                    aria-label="Send a photo"
                    title="Send a photo"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#2f8f66] transition hover:bg-green-50 disabled:opacity-60"
                  >
                    <ImagePlus className="h-5 w-5" />
                  </button>
                  <input
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      noteTyping(e.target.value);
                    }}
                    maxLength={MAX_MESSAGE}
                    placeholder={staged ? "Add a caption (optional)" : "Type a message"}
                    aria-label="Message"
                    className="min-w-0 flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
                  />
                  <button
                    type="submit"
                    disabled={(!text.trim() && !staged) || sending}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#2f8f66] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#267a56] active:scale-95 disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                    {sending && staged ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </section>

      {deletingMessage && (
        <Modal title="Delete Message?" onClose={closeDelete}>
          <p className="text-sm text-gray-600">
            {canUnsend
              ? `Delete for everyone removes it for you and ${displayName(other)}, who will see "This message was deleted" instead. Delete for me removes it only from your Messages.`
              : deletingMessage.deleted
                ? "It will be removed from your Messages."
                : `It will be removed from your Messages only. ${displayName(other)} will still have it.`}
          </p>
          {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}
          {canUnsend ? (
            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => removeMessage(true)}
                disabled={Boolean(deleteBusy)}
                className="rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteBusy === "everyone" ? "Deleting..." : "Delete for everyone"}
              </button>
              <button
                type="button"
                onClick={() => removeMessage(false)}
                disabled={Boolean(deleteBusy)}
                className="rounded-md border border-red-600 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                {deleteBusy === "me" ? "Deleting..." : "Delete for me"}
              </button>
              <button
                type="button"
                onClick={closeDelete}
                disabled={Boolean(deleteBusy)}
                className="rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                No, keep it
              </button>
            </div>
          ) : (
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={closeDelete}
                disabled={Boolean(deleteBusy)}
                className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                No, keep it
              </button>
              <button
                type="button"
                onClick={() => removeMessage(false)}
                disabled={Boolean(deleteBusy)}
                className="flex-1 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleteBusy === "me" ? "Deleting..." : "Delete for me"}
              </button>
            </div>
          )}
        </Modal>
      )}

      {deleting?.conversation && active && (
        <Modal title="Delete Conversation?" onClose={closeDelete}>
          <p className="text-sm text-gray-600">
            Delete your conversation with <span className="font-medium">{displayName(other)}</span>? It will be removed
            from your Messages, with every message and photo in it. {displayName(other)} will still have their copy.
          </p>
          {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={closeDelete}
              disabled={Boolean(deleteBusy)}
              className="flex-1 rounded-md border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              No, keep it
            </button>
            <button
              type="button"
              onClick={removeConversation}
              disabled={Boolean(deleteBusy)}
              className="flex-1 rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleteBusy === "conversation" ? "Deleting..." : "Yes, delete it!"}
            </button>
          </div>
        </Modal>
      )}

      {viewing &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Photo"
            data-testid="photo-viewer"
            onClick={() => setViewing(null)}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4"
          >
            <img
              src={viewing.url}
              alt="Photo"
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={() => setViewing(null)}
              aria-label="Close photo"
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            >
              <X className="h-6 w-6" />
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
