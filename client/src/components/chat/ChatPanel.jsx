import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import Avatar from "../Avatar";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import {
  getConversations,
  getConversation,
  markConversationRead,
  sendChatMessage,
} from "../../services/api";

const MAX_MESSAGE = 1000;

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

// Conversations down the side, the open one beside them. New messages arrive
// over the live connection (context/ChatContext.jsx) without a refresh.
export default function ChatPanel({ basePath, heightClass }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribe, setUnreadTotal, reconnects } = useChat();

  const [conversations, setConversations] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [thread, setThread] = useState({ id: null, conversation: null, messages: [], notice: null, error: "" });
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const scrollRef = useRef(null);
  // Which conversation is open, for a message that arrives while it is.
  const openId = useRef(id);
  useEffect(() => {
    openId.current = id;
  }, [id]);

  const isBuyer = user?.role === "buyer";
  const myId = user?._id;
  const threadLoading = Boolean(id) && thread.id !== id;
  const active = thread.id === id ? thread.conversation : null;

  // Reading a conversation clears its count, here and on the Messages link.
  const markRead = useCallback(
    (conversationId) =>
      markConversationRead(conversationId)
        .then(({ data }) => setUnreadTotal(data.unreadTotal))
        .catch(() => {}),
    [setUnreadTotal]
  );

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
        markRead(id);
      })
      .catch(() => {
        if (!cancelled) {
          setThread({ id, conversation: null, messages: [], notice: null, error: "This conversation isn't available." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, markRead, reconnects]);

  // A new message, from either side, the moment the server saves it.
  useEffect(
    () =>
      subscribe(({ message, conversation }) => {
        const isOpen = message.conversation === openId.current;
        setConversations((list) => upsert(list, isOpen ? { ...conversation, unread: 0 } : conversation));
        if (!isOpen) return;
        setThread((current) =>
          current.id !== message.conversation || current.messages.some((m) => m._id === message._id)
            ? current
            : { ...current, messages: [...current.messages, message] }
        );
        if (message.sender !== myId) markRead(message.conversation);
      }),
    [subscribe, myId, markRead]
  );

  // Always showing the newest message.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread.messages.length, thread.id]);

  const send = async (e) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean || !id || sending) return;
    setSending(true);
    setSendError("");
    try {
      const { data } = await sendChatMessage(id, clean);
      setText("");
      setThread((current) =>
        current.id !== id || current.messages.some((m) => m._id === data.message._id)
          ? current
          : { ...current, messages: [...current.messages, data.message] }
      );
      setConversations((list) => upsert(list, data.conversation));
    } catch (err) {
      setSendError(err.response?.data?.message || "Could not send that. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const other = active?.other;

  return (
    <div
      className={`grid overflow-hidden rounded-2xl bg-white shadow-sm md:grid-cols-[20rem_1fr] ${heightClass}`}
      data-testid="chat-panel"
    >
      <aside className={`${id ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-gray-200`}>
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
                  <Avatar
                    src={c.other.avatar}
                    alt={displayName(c.other)}
                    className="h-11 w-11 rounded-full bg-green-100 text-[#2f8f66]"
                    iconClass="h-6 w-6"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-sm ${unread ? "font-bold text-gray-900" : "font-semibold text-gray-900"}`}>
                        {displayName(c.other)}
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-400">{listTime(c.lastMessageAt)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className={`truncate text-xs ${unread ? "font-semibold text-gray-800" : "text-gray-500"}`}>
                        {c.lastMessage?.sender === user?._id ? "You: " : ""}
                        {c.lastMessage?.text}
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

      <section className={`${id ? "flex" : "hidden md:flex"} min-h-0 flex-col`}>
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
              <Avatar
                src={other.avatar}
                alt={displayName(other)}
                className="h-10 w-10 rounded-full bg-green-100 text-[#2f8f66]"
                iconClass="h-5 w-5"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-900" data-testid="chat-with">
                  {displayName(other)}
                </p>
                <p className="text-xs capitalize text-gray-500">{other.role}</p>
              </div>
              {isBuyer && other._id && (
                <Link
                  to={`/buyer/farmers/${other._id}`}
                  className="shrink-0 rounded-md border border-[#2f8f66] px-3 py-1.5 text-xs font-semibold text-[#2f8f66] transition hover:bg-green-50"
                >
                  View Shop
                </Link>
              )}
            </div>

            <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50 px-5 py-4" data-testid="chat-messages">
              {thread.messages.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-400">
                  {isBuyer ? `Say hello to ${displayName(other)}.` : "No messages yet."}
                </p>
              )}
              {thread.messages.map((m) => {
                const mine = m.sender === user?._id;
                return (
                  <div key={m._id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`} data-mine={mine}>
                    <div
                      className={`max-w-[75%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm ${
                        mine ? "rounded-br-sm bg-[#2f8f66] text-white" : "rounded-bl-sm bg-white text-gray-900 ring-1 ring-gray-200"
                      }`}
                    >
                      {m.text}
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400">
                      {mine ? "You" : displayName(other)} · {messageTime(m.createdAt)}
                    </p>
                  </div>
                );
              })}
            </div>

            {thread.notice ? (
              <p className="border-t border-gray-200 bg-gray-50 px-5 py-4 text-center text-sm text-gray-500">{thread.notice}</p>
            ) : (
              <form onSubmit={send} className="border-t border-gray-200 p-3">
                {sendError && <p className="mb-2 px-1 text-xs text-red-600">{sendError}</p>}
                <div className="flex items-center gap-2">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={MAX_MESSAGE}
                    placeholder="Type a message"
                    aria-label="Message"
                    className="min-w-0 flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-[#2f8f66] focus:outline-none focus:ring-1 focus:ring-[#2f8f66]"
                  />
                  <button
                    type="submit"
                    disabled={!text.trim() || sending}
                    className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#2f8f66] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#267a56] active:scale-95 disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </section>
    </div>
  );
}
