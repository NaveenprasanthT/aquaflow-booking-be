import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

// @desc    Get all conversations
// @route   GET /api/chat/conversations
// @access  Private (Admin)
export const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find()
      .populate("userId", "firstName lastName phone")
      .sort({ lastMessageAt: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get or create conversation + messages for a user
// @route   GET /api/chat/conversations/:userId
// @access  Private
export const getOrCreateConversation = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (req.user.role === "user" && req.user.id !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    let conversation = await Conversation.findOne({ userId }).populate(
      "userId",
      "firstName lastName phone",
    );

    if (!conversation) {
      conversation = await Conversation.create({ userId });
      await conversation.populate("userId", "firstName lastName phone");
    }

    const messages = await Message.find({ conversationId: conversation._id }).sort(
      { createdAt: 1 },
    );

    res.status(200).json({
      success: true,
      data: { conversation, messages },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark messages as read
// @route   POST /api/chat/conversations/:userId/read
// @access  Private
export const markRead = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const conversation = await Conversation.findOne({ userId });
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const senderRole = req.user.role === "admin" ? "user" : "admin";
    await Message.updateMany(
      { conversationId: conversation._id, senderRole, readAt: null },
      { readAt: new Date() },
    );

    if (req.user.role === "admin") {
      conversation.unreadAdmin = 0;
    } else {
      conversation.unreadUser = 0;
    }
    await conversation.save();

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
