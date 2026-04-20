import express from "express";
const router = express.Router();
import {
  createBooking,
  getAllBookings,
  getMyBookings,
  getBooking,
  updateBookingStatus,
  deleteBooking,
  getAvailableSlots,
} from "../controllers/bookingController.js";
import { protect, authorize, optionalAuth } from "../middleware/auth.js";

// Public route - check available slots
router.get("/available-slots/:date", getAvailableSlots);

// Allow booking with or without authentication (guest bookings)
router.post("/", optionalAuth, createBooking);

// Protected routes
router.get("/", protect, authorize("admin"), getAllBookings);
router.get("/my", protect, getMyBookings);
router.get("/:id", protect, getBooking);
router.put("/:id/status", protect, authorize("admin"), updateBookingStatus);
router.delete("/:id", protect, authorize("admin"), deleteBooking);

export default router;
