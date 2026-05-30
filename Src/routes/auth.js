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
  sendAuthOtp,
  verifyAuthOtp,
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
router.post("/send-otp", sendAuthOtp);
router.post("/verify-otp-auth", verifyAuthOtp);

export default router;
