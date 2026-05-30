import express from "express";
const router = express.Router();
import { protect, authorize } from "../middleware/auth.js";
import {
  getConversations,
  getOrCreateConversation,
  markRead,
} from "../controllers/chatController.js";

router.get("/conversations", protect, authorize("admin"), getConversations);
router.get("/conversations/:userId", protect, getOrCreateConversation);
router.post("/conversations/:userId/read", protect, markRead);

export default router;
