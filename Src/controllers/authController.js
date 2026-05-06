import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

const mapUserProfile = (user) => ({
  id: user._id,
  phone: user.phone,
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  gender: user.gender || "prefer_not_to_say",
  role: user.role,
});

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { phone, password, confirmPassword, firstName, lastName, gender } =
      req.body;

    // Validation
    if (!phone || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide phone, password, and confirm password",
      });
    }

    if (phone.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be at least 10 digits",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Phone number already registered",
      });
    }

    // Create user
    const user = await User.create({
      phone,
      firstName: firstName || "",
      lastName: lastName || "",
      gender: gender || "prefer_not_to_say",
      password,
      role: "user",
    });

    // Generate token
    const token = generateToken(user._id);

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: mapUserProfile(user),
        token, // Send token in response for alternative storage
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    // Validation
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide phone and password",
      });
    }

    // Find user with password field
    const user = await User.findOne({ phone }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: mapUserProfile(user),
        token, // Send token in response for alternative storage
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: mapUserProfile(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { firstName, lastName, gender, phone } = req.body;

    if (typeof firstName === "string") {
      user.firstName = firstName.trim();
    }

    if (typeof lastName === "string") {
      user.lastName = lastName.trim();
    }

    if (typeof gender === "string") {
      const allowedGenders = ["male", "female", "other", "prefer_not_to_say"];

      if (!allowedGenders.includes(gender)) {
        return res.status(400).json({
          success: false,
          message: "Please select a valid gender option",
        });
      }

      user.gender = gender;
    }

    if (typeof phone === "string") {
      const nextPhone = phone.trim();

      if (nextPhone.length < 10) {
        return res.status(400).json({
          success: false,
          message: "Phone number must be at least 10 digits",
        });
      }

      if (nextPhone !== user.phone) {
        const existingUser = await User.findOne({
          phone: nextPhone,
          _id: { $ne: user._id },
        });

        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "Phone number already registered",
          });
        }

        user.phone = nextPhone;
      }
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: mapUserProfile(user),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    res.cookie("token", "none", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};
