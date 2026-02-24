import express from "express";
const router = express.Router();
import {
  submitContact,
  getAllContacts,
  getContact,
  deleteContact,
} from "../controllers/contactController.js";
import { protect, authorize } from "../middleware/auth.js";

// Public route
router.post("/", submitContact);

// Admin routes
router.get("/", protect, authorize("admin"), getAllContacts);
router.get("/:id", protect, authorize("admin"), getContact);
router.delete("/:id", protect, authorize("admin"), deleteContact);

export default router;
