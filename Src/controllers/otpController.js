import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Otp from "../models/Otp.js";
import { sendOtpViaMsg91 } from "../services/msg91Service.js";

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_RATE_LIMIT_MS = 30 * 1000;
const DEFAULT_OTP = String(process.env.DEFAULT_OTP || "561212").trim();
const ENABLE_DEFAULT_OTP =
  process.env.NODE_ENV !== "production" &&
  String(process.env.ENABLE_DEFAULT_OTP || "true").toLowerCase() === "true";

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getOtpValue = () => {
  if (ENABLE_DEFAULT_OTP && /^\d{6}$/.test(DEFAULT_OTP)) {
    return DEFAULT_OTP;
  }
  return generateOtp();
};

const normalizePhone = (phone) => {
  return String(phone || "").replace(/\D/g, "");
};

const getRateLimitRemainingSeconds = (lastSentAt) => {
  const elapsed = Date.now() - new Date(lastSentAt).getTime();
  const remainingMs = OTP_RATE_LIMIT_MS - elapsed;
  return Math.ceil(remainingMs / 1000);
};

// @desc    Forgot password - send OTP
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);

    if (!phone || phone.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid mobile number",
      });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const existingOtp = await Otp.findOne({ phone });
    if (existingOtp?.lastSentAt) {
      const secondsRemaining = getRateLimitRemainingSeconds(
        existingOtp.lastSentAt,
      );
      if (secondsRemaining > 0) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${secondsRemaining} seconds before requesting a new OTP`,
        });
      }
    }

    const otp = getOtpValue();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await Otp.findOneAndUpdate(
      { phone },
      {
        phone,
        otp,
        expiresAt,
        lastSentAt: new Date(),
        isVerified: false,
        verifiedAt: null,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    try {
      await sendOtpViaMsg91({ phone, otp });
    } catch (smsError) {
      console.error(`[MSG91:FAILED] OTP for ${phone} is ${otp} — ${smsError.message}`);
    }

    res.status(200).json({
      success: true,
      message: "OTP sent",
      data: {
        expiresInSeconds: 300,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
export const resendOtp = async (req, res, next) => {
  return forgotPassword(req, res, next);
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOtp = async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const otp = String(req.body.otp || "").trim();

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: "Please provide phone number and OTP",
      });
    }

    const otpDoc = await Otp.findOne({ phone });
    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP",
      });
    }

    if (new Date() > otpDoc.expiresAt) {
      await Otp.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP",
      });
    }

    if (otpDoc.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    otpDoc.isVerified = true;
    otpDoc.verifiedAt = new Date();
    await otpDoc.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: {
        phone,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const { newPassword, confirmPassword } = req.body;

    if (!phone || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide phone, new password, and confirm password",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const otpDoc = await Otp.findOne({ phone });
    if (!otpDoc || !otpDoc.isVerified || new Date() > otpDoc.expiresAt) {
      return res.status(400).json({
        success: false,
        message: "OTP verification required",
      });
    }

    const user = await User.findOne({ phone }).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.password = newPassword;
    await user.save();

    await Otp.deleteOne({ _id: otpDoc._id });

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send OTP for login or registration
// @route   POST /api/auth/send-otp
// @access  Public
export const sendAuthOtp = async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const purpose = req.body.purpose;

    if (!phone || phone.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid mobile number",
      });
    }

    if (!["login", "register"].includes(purpose)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purpose. Must be 'login' or 'register'",
      });
    }

    if (purpose === "login") {
      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "No account found with this number",
        });
      }
    }

    if (purpose === "register") {
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Phone already registered. Please login instead.",
        });
      }
    }

    const existingOtp = await Otp.findOne({ phone });
    if (existingOtp?.lastSentAt) {
      const secondsRemaining = getRateLimitRemainingSeconds(existingOtp.lastSentAt);
      if (secondsRemaining > 0) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${secondsRemaining} seconds before requesting a new OTP`,
        });
      }
    }

    const otp = getOtpValue();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await Otp.findOneAndUpdate(
      { phone },
      { phone, otp, expiresAt, lastSentAt: new Date(), isVerified: false, verifiedAt: null },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    try {
      await sendOtpViaMsg91({ phone, otp });
    } catch (smsError) {
      console.error(`[MSG91:FAILED] OTP for ${phone} is ${otp} — ${smsError.message}`);
    }

    res.status(200).json({
      success: true,
      message: "OTP sent",
      data: { expiresInSeconds: 300 },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP and complete login or registration
// @route   POST /api/auth/verify-otp-auth
// @access  Public
export const verifyAuthOtp = async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const otp = String(req.body.otp || "").trim();
    const purpose = req.body.purpose;
    const firstName = String(req.body.firstName || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    const gender = String(req.body.gender || "").trim();

    if (!phone || !otp || !purpose) {
      return res.status(400).json({
        success: false,
        message: "Please provide phone, OTP, and purpose",
      });
    }

    if (!["login", "register"].includes(purpose)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purpose",
      });
    }

    const otpDoc = await Otp.findOne({ phone });
    if (!otpDoc) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP",
      });
    }

    if (new Date() > otpDoc.expiresAt) {
      await Otp.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP",
      });
    }

    if (otpDoc.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    await Otp.deleteOne({ _id: otpDoc._id });

    let user;

    if (purpose === "login") {
      user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "No account found with this number",
        });
      }
    } else {
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Phone already registered. Please login instead.",
        });
      }
      const allowedGenders = ["male", "female", "other", "prefer_not_to_say"];
      const resolvedGender = allowedGenders.includes(gender) ? gender : "prefer_not_to_say";

      user = await User.create({
        phone,
        firstName: firstName || "",
        lastName: lastName || "",
        gender: resolvedGender,
        role: "user",
      });
    }

    const token = generateToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: purpose === "login" ? "Login successful" : "Registration successful",
      data: {
        user: {
          id: user._id,
          phone: user.phone,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          gender: user.gender || "prefer_not_to_say",
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};
