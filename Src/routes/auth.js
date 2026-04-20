import express from "express";
const router = express.Router();
import {
  register,
  login,
  getMe,
  updateProfile,
  logout,
} from "../controllers/authController.js";
import {
  forgotPassword,
  resendOtp,
  verifyOtp,
  resetPassword,
} from "../controllers/otpController.js";
import { protect } from "../middleware/auth.js";

router.post("/register", register);
router.post("/login", login);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.post("/forgot-password", forgotPassword);
router.post("/resend-otp", resendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

export default router;
