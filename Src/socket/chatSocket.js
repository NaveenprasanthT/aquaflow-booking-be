import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";

export const setupSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("Authentication required"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (!user) return next(new Error("User not found"));
      socket.user = user;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    const role = socket.user.role;

    // User auto-joins their own room
    if (role === "user") {
      socket.join(`user_${userId}`);
    }

    // Admin joins a user's room when opening their chat
    socket.on("join_chat", ({ userId: targetUserId }) => {
      if (role === "admin") {
        socket.join(`user_${targetUserId}`);
      }
    });

    socket.on("leave_chat", ({ userId: targetUserId }) => {
      if (role === "admin") {
        socket.leave(`user_${targetUserId}`);
      }
    });

    socket.on("send_message", async ({ conversationId, text }) => {
      try {
        if (!text?.trim()) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const message = await Message.create({
          conversationId: conversation._id,
          senderId: socket.user._id,
          senderRole: role,
          text: text.trim(),
        });

        conversation.lastMessage = text.trim();
        conversation.lastMessageAt = new Date();
        if (role === "user") {
          conversation.unreadAdmin += 1;
        } else {
          conversation.unreadUser += 1;
        }
        await conversation.save();

        const targetRoom = `user_${conversation.userId.toString()}`;
        io.to(targetRoom).emit("receive_message", message.toObject());

        io.to(targetRoom).emit("conversation_updated", {
          conversationId: conversation._id.toString(),
          lastMessage: conversation.lastMessage,
          unreadAdmin: conversation.unreadAdmin,
          unreadUser: conversation.unreadUser,
        });
      } catch (err) {
        console.error("Socket send_message error:", err.message);
      }
    });

    socket.on("mark_read", async ({ conversationId }) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const senderRole = role === "admin" ? "user" : "admin";
        const now = new Date();

        await Message.updateMany(
          { conversationId: conversation._id, senderRole, readAt: null },
          { readAt: now },
        );

        if (role === "admin") {
          conversation.unreadAdmin = 0;
        } else {
          conversation.unreadUser = 0;
        }
        await conversation.save();

        const targetRoom = `user_${conversation.userId.toString()}`;
        io.to(targetRoom).emit("conversation_updated", {
          conversationId: conversation._id.toString(),
          unreadAdmin: conversation.unreadAdmin,
          unreadUser: conversation.unreadUser,
        });
      } catch (err) {
        console.error("Socket mark_read error:", err.message);
      }
    });
  });
};
