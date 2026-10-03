const { Server } = require("socket.io");
const { userForToken } = require("../middleware/authMiddleware");
const User = require("../models/User");
const Conversation = require("../models/Conversation");

// Real-time delivery (Socket.IO). Everything is still done through the API -
// a message is sent with POST /api/chats/:id/messages, an order accepted with
// PATCH /api/orders/:id/status, and that is where it is checked and saved.
// This only pushes the news to whoever it concerns the moment it is saved, so
// their pages catch up without a refresh: chat here, and orders, listings and
// the admin's lists through utils/liveUpdates.js.
//
// A connection has to present the same login token an API request would. Each
// person joins their own room, and one for everyone with their role (so a
// listing that changes can reach every buyer at once). Nobody can ask to join
// any other room, so an event sent to someone's room reaches that person's
// open tabs and nobody else's.
//
// It is also how "Active now" is known: someone with the site open has a live
// connection. When their first tab connects or their last one closes, the
// people they have conversations with are told, and the time is kept as when
// they were last active.
let io = null;

// What a browser may send over its connection, and what to do with it - set
// by the chat controller (see onClientEvent).
const clientEvents = new Map();

const roomOf = (userId) => `user:${userId}`;
const roleRoom = (role) => `role:${role}`;
const ROLES = ["buyer", "farmer", "admin"];

// Has this person got the site open right now?
const isOnline = (userId) => Boolean(io && userId && io.sockets.adapter.rooms.get(roomOf(userId))?.size);

// Tells everyone this person has a conversation with that they have just come
// online or gone offline - except across a block: neither side of one gets to
// see when the other is around.
async function announcePresence(userId, online) {
  const lastActiveAt = new Date();
  await User.updateOne({ _id: userId }, { lastActiveAt });
  const conversations = await Conversation.find({ $or: [{ buyer: userId }, { farmer: userId }] })
    .select("buyer farmer")
    .populate("buyer", "blockedUsers")
    .lean();
  const rooms = conversations
    .filter((c) => c.buyer && c.farmer && !(c.buyer.blockedUsers || []).some((id) => id.equals(c.farmer)))
    .map((c) => roomOf(String(c.buyer._id) === String(userId) ? c.farmer : c.buyer._id));
  if (io && rooms.length) io.to(rooms).emit("chat:presence", { userId: String(userId), online, lastActiveAt });
}

function attachRealtime(httpServer, isAllowedOrigin) {
  io = new Server(httpServer, {
    serveClient: false,
    // The same rule as the API's CORS: the website itself, or a caller that
    // isn't a browser. CORS covers long-polling; a WebSocket isn't covered by
    // CORS at all, so the handshake's origin is checked directly as well.
    cors: { origin: (origin, callback) => callback(null, isAllowedOrigin(origin)) },
    allowRequest: (req, callback) => callback(null, isAllowedOrigin(req.headers.origin)),
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || !token) return next(new Error("Not authorized, no token"));
    try {
      // The same checks as every API request: a real session token, still
      // current (not logged out or replaced), for an account that isn't banned.
      const { user, error } = await userForToken(token);
      if (error) return next(new Error(error));
      if (!ROLES.includes(user.role)) return next(new Error("Not authorized"));
      socket.data.userId = user._id.toString();
      socket.data.role = user.role;
      next();
    } catch {
      next(new Error("Not authorized"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, role } = socket.data;
    socket.join([roomOf(userId), roleRoom(role)]);
    // Only buyers and farmers have conversations to show "Active now" in.
    const inChat = role !== "admin";
    // Their first open tab: they have just come online.
    if (inChat && io.sockets.adapter.rooms.get(roomOf(userId))?.size === 1) {
      announcePresence(userId, true).catch(() => {});
    }

    clientEvents.forEach((handler, event) =>
      socket.on(event, (payload) => Promise.resolve().then(() => handler(socket, payload)).catch(() => {}))
    );

    socket.on("disconnect", () => {
      // Their last tab has closed: they went offline just now.
      if (inChat && !isOnline(userId)) announcePresence(userId, false).catch(() => {});
    });
  });
  return io;
}

// Handles an event a browser sends over its connection ("disconnect" too, for
// tidying up after it). The handler gets the socket - whose signed-in person
// is socket.data.userId - and whatever was sent, which is never trusted.
const onClientEvent = (event, handler) => clientEvents.set(event, handler);

// Sends an event to every tab this person has open. Does nothing when there
// is no server listening (a script, say).
const emitToUser = (userId, event, payload) => {
  if (io) io.to(roomOf(userId)).emit(event, payload);
};

// Sends an event to every open tab of everyone with this role ("buyer",
// "farmer" or "admin").
const emitToRole = (role, event, payload) => {
  if (io) io.to(roleRoom(role)).emit(event, payload);
};

// Closes this person's live connections - when they are banned, log out,
// change their password or delete their account - so a connection opened with
// a login that no longer works doesn't go on receiving their messages.
const disconnectUser = (userId) => {
  if (io) io.in(roomOf(userId)).disconnectSockets(true);
};

module.exports = { attachRealtime, emitToUser, emitToRole, disconnectUser, isOnline, onClientEvent };
