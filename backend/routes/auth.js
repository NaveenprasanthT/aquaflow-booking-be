import express from "express";
const router = express.Router();
import {
  register,
  login,
  getMe,
  updateProfile,
  logout,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

router.post("/register", register);
router.post("/login", login);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);

export default router;
