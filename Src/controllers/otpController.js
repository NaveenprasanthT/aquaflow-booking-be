import User from "../models/User.js";
import Otp from "../models/Otp.js";
import { sendOtpViaMsg91 } from "../services/msg91Service.js";

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

    await sendOtpViaMsg91({ phone, otp });

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
