const { Server } = require("socket.io");
const { userForToken } = require("../middleware/authMiddleware");

// Real-time delivery for chat (Socket.IO). A message is sent through the API
// like any other request - POST /api/chats/:id/messages, where it is checked
// and saved - and this only pushes it to the two people in that conversation
// the moment it is saved, so it appears without a refresh.
//
// A connection has to present the same login token an API request would, and
// each person only ever joins their own room, so an event sent to someone's
// room reaches that person's open tabs and nobody else's.
let io = null;

const roomOf = (userId) => `user:${userId}`;

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
      if (!["buyer", "farmer"].includes(user.role)) return next(new Error("Chat is for buyers and farmers"));
      socket.data.userId = user._id.toString();
      next();
    } catch {
      next(new Error("Not authorized"));
    }
  });

  io.on("connection", (socket) => socket.join(roomOf(socket.data.userId)));
  return io;
}

// Sends an event to every tab this person has open. Does nothing when there
// is no server listening (a script, say).
const emitToUser = (userId, event, payload) => {
  if (io) io.to(roomOf(userId)).emit(event, payload);
};

// Closes this person's live connections - when they are banned, log out,
// change their password or delete their account - so a connection opened with
// a login that no longer works doesn't go on receiving their messages.
const disconnectUser = (userId) => {
  if (io) io.in(roomOf(userId)).disconnectSockets(true);
};

module.exports = { attachRealtime, emitToUser, disconnectUser };
