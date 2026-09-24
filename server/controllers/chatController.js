const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const validate = require("../utils/validate");
const { hasBlocked } = require("../utils/blocks");
const { emitToUser } = require("../utils/realtime");

// 1-on-1 chat between a buyer and a farmer. A buyer starts a conversation from
// a farmer's shop or one of their products; the farmer replies. Every route is
// for the two people in the conversation only: anyone else is told it doesn't
// exist, admins included.

const MAX_MESSAGE = 1000;
// How much of a conversation is loaded when it is opened: the newest messages.
const MESSAGE_PAGE = 200;
// What each side sees of the other.
const PERSON = "name farmName avatar role isBanned";

const otherSideOf = (side) => (side === "buyer" ? "farmer" : "buyer");

const messageView = (message) => ({
  _id: message._id,
  conversation: message.conversation,
  sender: message.sender,
  text: message.text,
  createdAt: message.createdAt,
});

// What one person is shown about a conversation: who it is with, the newest
// message, and how many messages they haven't read.
const viewFor = (conversation, userId) => {
  const side = conversation.buyer?._id?.toString() === userId.toString() ? "buyer" : "farmer";
  const other = conversation[otherSideOf(side)];
  return {
    _id: conversation._id,
    other: other
      ? { _id: other._id, name: other.name, farmName: other.farmName || null, role: other.role, avatar: other.avatar || null }
      : { _id: null, name: "Deleted account", farmName: null, role: otherSideOf(side), avatar: null },
    lastMessage: conversation.lastMessage?.text ? conversation.lastMessage : null,
    lastMessageAt: conversation.lastMessageAt,
    unread: conversation[`${side}Unread`] || 0,
  };
};

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
  const conversations = await Conversation.find({ [req.user.role]: req.user._id, lastMessageAt: { $ne: null } })
    .sort({ lastMessageAt: -1 })
    .limit(100)
    .populate("buyer farmer", PERSON);
  res.json(conversations.map((c) => viewFor(c, req.user._id)));
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
  const messages = await Message.find({ conversation: conversation._id })
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
  }
  const total = await unreadTotal(req.user._id, side);
  // Their other open tabs update their count too.
  emitToUser(req.user._id, "chat:read", { conversationId: conversation._id, unreadTotal: total });
  res.json({ unreadTotal: total });
});

// @desc    Send a message
// @route   POST /api/chats/:id/messages   { text }
// @access  Private (the two people in it)
const sendMessage = asyncHandler(async (req, res) => {
  const conversation = await findMine(req, res);
  const text = validate.text(validate.plainBody(req.body).text, "Message", { max: MAX_MESSAGE });
  const problem = await sendProblem(conversation, req.user);
  if (problem) {
    res.status(403);
    throw new Error(problem);
  }

  const mySide = req.user.role;
  const otherSide = otherSideOf(mySide);
  const message = await Message.create({ conversation: conversation._id, sender: req.user._id, text });
  const updated = await Conversation.findByIdAndUpdate(
    conversation._id,
    {
      $set: { lastMessage: { text, sender: req.user._id, createdAt: message.createdAt }, lastMessageAt: message.createdAt },
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

module.exports = { getConversations, getUnreadCount, startConversation, getConversation, markRead, sendMessage };
