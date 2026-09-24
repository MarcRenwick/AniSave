const path = require("path");
const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Order = require("../models/Order");
const User = require("../models/User");
const validate = require("../utils/validate");
const { hasBlocked } = require("../utils/blocks");
const { emitToUser, isOnline, onClientEvent } = require("../utils/realtime");
const { chatImagePath, deleteImageFile, sendStoredFile } = require("../utils/fileUtils");

// 1-on-1 chat between a buyer and a farmer. A buyer starts a conversation from
// a farmer's shop or one of their products; the farmer replies. Every route is
// for the two people in the conversation only: anyone else is told it doesn't
// exist, admins included.

const MAX_MESSAGE = 1000;
// How much of a conversation is loaded when it is opened: the newest messages.
const MESSAGE_PAGE = 200;
// What each side sees of the other. (blockedUsers is only read to tell whether
// the buyer has blocked the farmer - it is never sent.)
const PERSON = "name farmName avatar role isBanned lastActiveAt blockedUsers";
// How many of a buyer's orders from the farmer are shown in their conversation.
const ORDER_LIMIT = 20;

const otherSideOf = (side) => (side === "buyer" ? "farmer" : "buyer");
// A person in a conversation, whether it has been populated or not.
const idOf = (person) => person?._id ?? person;

const messageView = (message) => ({
  _id: message._id,
  conversation: message.conversation,
  sender: message.sender,
  text: message.text || "",
  image: message.image || null,
  deleted: Boolean(message.deletedAt),
  createdAt: message.createdAt,
});

// Deleting. A message can be deleted by its sender for everyone, which leaves
// "This message was deleted" in its place, or by either person for
// themselves only. A conversation is only ever deleted for the person who
// deletes it. What neither of them can see any more is deleted for good.

// The messages in a conversation one side can still see: not the ones they
// deleted for themselves, nor anything from before they deleted the whole
// conversation. (As a query - stillHas is the same for a message in hand.)
const visibleTo = (conversation, side) => {
  const clearedAt = conversation[`${side}ClearedAt`];
  return {
    conversation: conversation._id,
    hiddenFor: { $ne: idOf(conversation[side]) },
    ...(clearedAt ? { createdAt: { $gt: clearedAt } } : {}),
  };
};
const stillHas = (message, conversation, side) => {
  const clearedAt = conversation[`${side}ClearedAt`];
  const person = String(idOf(conversation[side]));
  return !(message.hiddenFor || []).some((id) => String(id) === person) && !(clearedAt && message.createdAt <= clearedAt);
};
// The opposite of visibleTo. Someone whose account is gone sees nothing.
const hiddenFrom = (conversation, side) => {
  const person = idOf(conversation[side]);
  if (!person) return {};
  const clearedAt = conversation[`${side}ClearedAt`];
  return { $or: [{ hiddenFor: person }, ...(clearedAt ? [{ createdAt: { $lte: clearedAt } }] : [])] };
};
// Picks out the conversation whose newest message this is.
const isLastMessage = (message) => ({ "lastMessage.sender": message.sender, "lastMessage.createdAt": message.createdAt });

// Deletes for good, photos and all, the messages that match - ones neither
// person can see any more.
async function purge(filter) {
  const gone = await Message.find(filter).select("image").lean();
  if (!gone.length) return;
  await Message.deleteMany({ _id: { $in: gone.map((m) => m._id) } });
  gone.forEach((m) => m.image && deleteImageFile(m.image));
}

// Has the buyer in this conversation blocked the farmer in it? Then neither
// sees when the other is active, on top of not being able to message.
const isBlockedPair = (conversation) =>
  Boolean(conversation.buyer && conversation.farmer) && hasBlocked(conversation.buyer, conversation.farmer._id);

// What one person is shown about a conversation: who it is with and whether
// they are active, the newest message, how many messages they haven't read,
// and whether the other person has seen what they sent. `latest` stands in
// for the newest message when that one isn't theirs to see (listViewFor).
const viewFor = (conversation, userId, { latest } = {}) => {
  const side = conversation.buyer?._id?.toString() === userId.toString() ? "buyer" : "farmer";
  const otherSide = otherSideOf(side);
  const other = conversation[otherSide];
  const showsActivity = Boolean(other) && !isBlockedPair(conversation);
  const newest = latest === undefined ? conversation.lastMessage : latest && { ...latest, deleted: Boolean(latest.deletedAt) };
  return {
    _id: conversation._id,
    other: other
      ? {
          _id: other._id,
          name: other.name,
          farmName: other.farmName || null,
          role: other.role,
          avatar: other.avatar || null,
          online: showsActivity && isOnline(other._id),
          lastActiveAt: showsActivity ? other.lastActiveAt || null : null,
        }
      : { _id: null, name: "Deleted account", farmName: null, role: otherSide, avatar: null, online: false, lastActiveAt: null },
    lastMessage:
      newest && (newest.text || newest.image || newest.deleted)
        ? {
            text: newest.text || "",
            image: Boolean(newest.image),
            deleted: Boolean(newest.deleted),
            sender: newest.sender,
            createdAt: newest.createdAt,
          }
        : null,
    lastMessageAt: latest === undefined ? conversation.lastMessageAt : latest?.createdAt || null,
    unread: conversation[`${side}Unread`] || 0,
    // The other side's unread count only ever holds this person's messages,
    // so when it is 0 they have seen everything this person sent.
    seen: !conversation[`${otherSide}Unread`],
  };
};

// viewFor, for the conversation list. When the newest message is one this
// person deleted for themselves, the newest one they still have is shown
// instead - and with nothing left, lastMessageAt is null and the list leaves
// the conversation out.
async function listViewFor(conversation, userId) {
  const hidden = (conversation.lastMessage?.hiddenFor || []).some((id) => String(id) === String(userId));
  if (!hidden) return viewFor(conversation, userId);
  const side = conversation.buyer?._id?.toString() === userId.toString() ? "buyer" : "farmer";
  const latest = await Message.findOne(visibleTo(conversation, side)).sort({ createdAt: -1 }).lean();
  return viewFor(conversation, userId, { latest });
}

const reload = (conversation) => Conversation.findById(conversation._id).populate("buyer farmer", PERSON);

// Everything one person hasn't read, across all their conversations - the
// number on the Messages link.
const unreadTotal = async (userId, side) => {
  const [row] = await Conversation.aggregate([
    { $match: { [side]: new mongoose.Types.ObjectId(String(userId)) } },
    { $group: { _id: null, total: { $sum: `$${side}Unread` } } },
  ]);
  return row?.total || 0;
};

// A conversation the signed-in person is in, or "not found" - the same answer
// whether it doesn't exist or belongs to someone else.
async function findMine(req, res) {
  const { id } = req.params;
  const conversation = mongoose.isValidObjectId(id)
    ? await Conversation.findOne({ _id: id, [req.user.role]: req.user._id }).populate("buyer farmer", PERSON)
    : null;
  if (!conversation) {
    res.status(404);
    throw new Error("Conversation not found");
  }
  return conversation;
}

// A message in that conversation the signed-in person can still see, or "not
// found" - the same answer for one that doesn't exist, is in another
// conversation, or they have already deleted.
async function findVisibleMessage(req, res, conversation) {
  const { messageId } = req.params;
  const message = mongoose.isValidObjectId(messageId)
    ? await Message.findOne({ _id: messageId, ...visibleTo(conversation, req.user.role) })
    : null;
  if (!message) {
    res.status(404);
    throw new Error("Message not found");
  }
  return message;
}

// Why this person can't send a message here right now, if they can't. Blocking
// works both ways: a buyer who blocked a farmer can't message them, and the
// farmer can't message that buyer either.
async function sendProblem(conversation, user) {
  const other = conversation[otherSideOf(user.role)];
  if (!other || other.isBanned) return "This account isn't available right now.";
  if (user.role === "buyer" && hasBlocked(user, conversation.farmer._id)) {
    return "You blocked this farmer. Unblock them to send a message.";
  }
  if (user.role === "farmer" && (await User.exists({ _id: conversation.buyer._id, blockedUsers: user._id }))) {
    return "You can't message this buyer.";
  }
  return null;
}

// @desc    The signed-in person's conversations, newest first
// @route   GET /api/chats
// @access  Private (buyer, farmer)
const getConversations = asyncHandler(async (req, res) => {
  const side = req.user.role;
  const conversations = await Conversation.find({
    [side]: req.user._id,
    lastMessageAt: { $ne: null },
    // Not one they deleted, unless something has been sent since.
    $or: [{ [`${side}ClearedAt`]: null }, { $expr: { $gt: ["$lastMessageAt", `$${side}ClearedAt`] } }],
  })
    .sort({ lastMessageAt: -1 })
    .limit(100)
    .populate("buyer farmer", PERSON);
  const views = await Promise.all(conversations.map((c) => listViewFor(c, req.user._id)));
  res.json(views.filter((v) => v.lastMessageAt).sort((a, b) => b.lastMessageAt - a.lastMessageAt));
});

// @desc    How many messages the signed-in person hasn't read
// @route   GET /api/chats/unread
// @access  Private (buyer, farmer)
const getUnreadCount = asyncHandler(async (req, res) => {
  res.json({ unreadTotal: await unreadTotal(req.user._id, req.user.role) });
});

// @desc    Open the conversation with a farmer - the one already there, or a new one
// @route   POST /api/chats   { farmerId }
// @access  Private (buyer)
const startConversation = asyncHandler(async (req, res) => {
  const { farmerId } = validate.plainBody(req.body);
  const farmer =
    typeof farmerId === "string" && mongoose.isValidObjectId(farmerId)
      ? await User.findOne({ _id: farmerId, role: "farmer", isBanned: { $ne: true } }).select("_id")
      : null;
  if (!farmer) {
    res.status(404);
    throw new Error("Farmer not found");
  }
  if (hasBlocked(req.user, farmer._id)) {
    res.status(403);
    throw new Error("You blocked this farmer. Unblock them to send a message.");
  }

  const pair = { buyer: req.user._id, farmer: farmer._id };
  let conversation;
  try {
    conversation = await Conversation.findOneAndUpdate(pair, { $setOnInsert: pair }, { upsert: true, new: true });
  } catch (err) {
    // Two presses at the same moment: the other one made it, so use that.
    if (err.code !== 11000) throw err;
    conversation = await Conversation.findOne(pair);
  }
  await conversation.populate("buyer farmer", PERSON);
  res.json(viewFor(conversation, req.user._id));
});

// @desc    One conversation and its newest messages
// @route   GET /api/chats/:id
// @access  Private (the two people in it)
const getConversation = asyncHandler(async (req, res) => {
  const conversation = await findMine(req, res);
  const messages = await Message.find(visibleTo(conversation, req.user.role))
    .sort({ createdAt: -1 })
    .limit(MESSAGE_PAGE)
    .lean();
  res.json({
    conversation: viewFor(conversation, req.user._id),
    messages: messages.reverse().map(messageView),
    // Shown in place of the message box when this person can't write here.
    notice: await sendProblem(conversation, req.user),
  });
});

// @desc    Mark a conversation as read by the signed-in person
// @route   PATCH /api/chats/:id/read
// @access  Private (the two people in it)
const markRead = asyncHandler(async (req, res) => {
  const conversation = await findMine(req, res);
  const side = req.user.role;
  if (conversation[`${side}Unread`] > 0) {
    await Conversation.updateOne({ _id: conversation._id }, { $set: { [`${side}Unread`]: 0 } });
    // What the other person sent has now been seen: their "Sent" turns to "Seen".
    const other = conversation[otherSideOf(side)];
    if (other) emitToUser(other._id, "chat:seen", { conversationId: conversation._id });
  }
  const total = await unreadTotal(req.user._id, side);
  // Their other open tabs update their count too.
  emitToUser(req.user._id, "chat:read", { conversationId: conversation._id, unreadTotal: total });
  res.json({ unreadTotal: total });
});

// Runs before a photo is accepted at all: the conversation has to be theirs,
// and they have to be able to write in it - so nothing is stored for a
// message that would be refused anyway.
const checkCanSend = asyncHandler(async (req, res, next) => {
  const conversation = await findMine(req, res);
  const problem = await sendProblem(conversation, req.user);
  if (problem) {
    res.status(403);
    throw new Error(problem);
  }
  req.conversation = conversation;
  next();
});

// @desc    Send a message: text, or a photo with an optional caption
// @route   POST /api/chats/:id/messages   { text }, or multipart { image, text? }
// @access  Private (the two people in it)
const sendMessage = asyncHandler(async (req, res) => {
  const image = chatImagePath(req.file);
  let message;
  try {
    const { text } = validate.plainBody(req.body);
    message = await Message.create({
      conversation: req.conversation._id,
      sender: req.user._id,
      text: image
        ? validate.optionalText(text, "Message", { max: MAX_MESSAGE }) || ""
        : validate.text(text, "Message", { max: MAX_MESSAGE }),
      ...(image ? { image } : {}),
    });
  } catch (err) {
    // A message that isn't sent keeps no photo behind.
    if (image) deleteImageFile(image);
    throw err;
  }

  const mySide = req.user.role;
  const otherSide = otherSideOf(mySide);
  const updated = await Conversation.findByIdAndUpdate(
    req.conversation._id,
    {
      $set: {
        lastMessage: { text: message.text, image: Boolean(image), sender: req.user._id, createdAt: message.createdAt },
        lastMessageAt: message.createdAt,
        // Replying means they have read what came before it.
        [`${mySide}Unread`]: 0,
      },
      $inc: { [`${otherSide}Unread`]: 1 },
    },
    { new: true }
  ).populate("buyer farmer", PERSON);

  // Straight to both people's open tabs - the other person's so it appears
  // without a refresh, and this person's own other tabs too.
  const otherId = updated[otherSide]._id;
  const view = messageView(message);
  const [myTotal, otherTotal] = await Promise.all([unreadTotal(req.user._id, mySide), unreadTotal(otherId, otherSide)]);
  emitToUser(otherId, "chat:message", { message: view, conversation: viewFor(updated, otherId), unreadTotal: otherTotal });
  emitToUser(req.user._id, "chat:message", {
    message: view,
    conversation: viewFor(updated, req.user._id),
    unreadTotal: myTotal,
  });

  res.status(201).json({ message: view, conversation: viewFor(updated, req.user._id) });
});

// @desc    Delete one of your own messages for both people. "This message was
//          deleted" stays in its place, for both.
// @route   POST /api/chats/:id/messages/:messageId/unsend
// @access  Private (the two people in it)
const unsendMessage = asyncHandler(async (req, res) => {
  const conversation = await findMine(req, res);
  const message = await findVisibleMessage(req, res, conversation);
  if (!message.sender.equals(req.user._id)) {
    res.status(403);
    throw new Error("You can only delete your own messages for everyone.");
  }
  if (!message.deletedAt) {
    await Message.updateOne({ _id: message._id }, { $set: { deletedAt: new Date() }, $unset: { text: "", image: "" } });
    await Conversation.updateOne(
      { _id: conversation._id, ...isLastMessage(message) },
      { $set: { "lastMessage.text": "", "lastMessage.image": false, "lastMessage.deleted": true } }
    );
    if (message.image) deleteImageFile(message.image);
  }

  const [deleted, updated] = await Promise.all([Message.findById(message._id).lean(), reload(conversation)]);
  const view = messageView(deleted);
  const event = (conversationView) => ({
    conversationId: conversation._id,
    messageId: message._id,
    message: view,
    conversation: conversationView,
  });
  const mine = await listViewFor(updated, req.user._id);
  emitToUser(req.user._id, "chat:deleted", event(mine));
  // The other person's open tabs too - unless they had already deleted it.
  const otherSide = otherSideOf(req.user.role);
  const other = updated[otherSide];
  if (other && stillHas(deleted, updated, otherSide)) {
    emitToUser(other._id, "chat:deleted", event(await listViewFor(updated, other._id)));
  }

  res.json({ message: view, conversation: mine });
});

// @desc    Delete one message (either person's) for the signed-in person only
// @route   DELETE /api/chats/:id/messages/:messageId
// @access  Private (the two people in it)
const deleteMessageForMe = asyncHandler(async (req, res) => {
  const conversation = await findMine(req, res);
  const message = await findVisibleMessage(req, res, conversation);
  await Message.updateOne({ _id: message._id }, { $addToSet: { hiddenFor: req.user._id } });
  await Conversation.updateOne(
    { _id: conversation._id, ...isLastMessage(message) },
    { $addToSet: { "lastMessage.hiddenFor": req.user._id } }
  );
  // Had the other person deleted it already, nobody has it now.
  await purge({ _id: message._id, ...hiddenFrom(conversation, otherSideOf(req.user.role)) });

  const view = await listViewFor(await reload(conversation), req.user._id);
  // Their own other tabs.
  emitToUser(req.user._id, "chat:deleted", { conversationId: conversation._id, messageId: message._id, conversation: view });
  res.json({ conversation: view });
});

// @desc    Delete a conversation from the signed-in person's Messages. Only
//          theirs: the other person keeps it, and it comes back to this
//          person's list, with just the new messages, if a new one is sent.
// @route   DELETE /api/chats/:id
// @access  Private (the two people in it)
const deleteConversation = asyncHandler(async (req, res) => {
  const conversation = await findMine(req, res);
  const side = req.user.role;
  const clearedAt = new Date();
  await Conversation.updateOne({ _id: conversation._id }, { $set: { [`${side}ClearedAt`]: clearedAt, [`${side}Unread`]: 0 } });
  // Whatever the other person had deleted as well is gone for good.
  await purge({ conversation: conversation._id, createdAt: { $lte: clearedAt }, ...hiddenFrom(conversation, otherSideOf(side)) });

  const total = await unreadTotal(req.user._id, side);
  emitToUser(req.user._id, "chat:cleared", { conversationId: conversation._id });
  emitToUser(req.user._id, "chat:read", { conversationId: conversation._id, unreadTotal: total });
  res.json({ unreadTotal: total });
});

// @desc    What the buyer has ordered from the farmer in this conversation, newest first
// @route   GET /api/chats/:id/orders
// @access  Private (the buyer in it)
const getConversationOrders = asyncHandler(async (req, res) => {
  const conversation = await findMine(req, res);
  if (!conversation.farmer) return res.json({ orders: [], total: 0 });
  const mine = { buyer: req.user._id, farmer: conversation.farmer._id };
  const [orders, total] = await Promise.all([
    Order.find(mine).sort({ createdAt: -1 }).limit(ORDER_LIMIT).populate("product", "image").lean(),
    Order.countDocuments(mine),
  ]);
  res.json({
    orders: orders.map((o) => ({
      _id: o._id,
      productTitle: o.productTitle,
      image: o.product?.image || null,
      quantity: o.quantity,
      total: o.total,
      status: o.status,
      createdAt: o.createdAt,
    })),
    total,
  });
});

// @desc    A photo sent in a conversation
// @route   GET /api/chat-images/:filename
// @access  Private (the two people in that conversation, while they still have it)
const getChatImage = asyncHandler(async (req, res) => {
  const side = req.user.role;
  const image = `/chat-images/${path.basename(String(req.params.filename))}`;
  const message = await Message.findOne({ image }).select("conversation createdAt hiddenFor").lean();
  const conversation =
    message &&
    (await Conversation.findOne({ _id: message.conversation, [side]: req.user._id })
      .select(`${side} ${side}ClearedAt`)
      .lean());
  const sent =
    Boolean(conversation) &&
    stillHas(message, conversation, side) &&
    (await sendStoredFile(res, image, {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    }));
  if (!sent) {
    res.status(404);
    throw new Error("Photo not found");
  }
});

// Typing. While someone types, their page sends "chat:typing" { conversation,
// typing: true } every few seconds, and { typing: false } when they stop or
// send. It goes straight on to the other person's open tabs and is never
// saved - and only to someone they could message right now, never across a
// block.
const TYPING_RECHECK_MS = 1000;
const TYPING_CHECK_GAP_MS = 250;

// Who hears that this person is typing in that conversation, if anyone.
async function typingPartner(userId, conversationId) {
  if (!mongoose.isValidObjectId(conversationId)) return null;
  const me = await User.findById(userId);
  if (!me || !["buyer", "farmer"].includes(me.role)) return null;
  const conversation = await Conversation.findOne({ _id: conversationId, [me.role]: me._id }).populate("buyer farmer", PERSON);
  if (!conversation || (await sendProblem(conversation, me))) return null;
  return String(conversation[otherSideOf(me.role)]._id);
}

onClientEvent("chat:typing", async (socket, payload) => {
  const conversation = typeof payload?.conversation === "string" ? payload.conversation : "";
  const typingTo = (socket.data.typingTo ??= new Map());
  const told = typingTo.get(conversation);

  if (payload?.typing !== true) {
    if (told) {
      typingTo.delete(conversation);
      emitToUser(told.to, "chat:typing", { conversation, typing: false });
    }
    return;
  }

  // However often a page sends it, the database is asked at most once a
  // second per conversation, and four times a second in all.
  const now = Date.now();
  if (told && now - told.checkedAt < TYPING_RECHECK_MS) return;
  if (now - (socket.data.typingCheckedAt || 0) < TYPING_CHECK_GAP_MS) return;
  socket.data.typingCheckedAt = now;

  const to = await typingPartner(socket.data.userId, conversation);
  if (!to) {
    typingTo.delete(conversation);
    return;
  }
  typingTo.set(conversation, { to, checkedAt: now });
  emitToUser(to, "chat:typing", { conversation, typing: true });
});

// A tab closed mid-sentence stops showing as typing straight away.
onClientEvent("disconnect", (socket) => {
  socket.data.typingTo?.forEach(({ to }, conversation) => emitToUser(to, "chat:typing", { conversation, typing: false }));
});

module.exports = {
  getConversations,
  getUnreadCount,
  startConversation,
  getConversation,
  markRead,
  checkCanSend,
  sendMessage,
  unsendMessage,
  deleteMessageForMe,
  deleteConversation,
  getConversationOrders,
  getChatImage,
};
