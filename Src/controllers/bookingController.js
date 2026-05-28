import Booking from "../models/Booking.js";
import User from "../models/User.js";
import ServiceItem from "../models/ServiceItem.js";
import { sendBookingStatusSms, sendTimeSlotSms } from "../services/msg91Service.js";

const DAILY_BOOKING_LIMIT = 8;

const getDailyBookingCount = async (date) => {
  return Booking.countDocuments({
    date,
    status: { $ne: "cancelled" },
  });
};

const addOnPrices = {
  "foam-wash": 15,
  "pressure-wash": 20,
  "interior-clean": 25,
  "wax-polish": 30,
};

// Calculate total price
const calculatePrice = async (serviceType, addOns = []) => {
  const service = await ServiceItem.findOne({
    $expr: {
      $eq: [{ $concat: ["$serviceFor", "-", "$serviceType"] }, serviceType],
    },
    isActive: true,
  });

  if (!service) {
    return null;
  }

  let total = service.price;

  addOns.forEach((addOn) => {
    total += addOnPrices[addOn] || 0;
  });

  return total;
};

// @desc    Get available time slots for a specific date
// @route   GET /api/bookings/available-slots/:date
// @access  Public
export const getAvailableSlots = async (req, res, next) => {
  try {
    const { date } = req.params;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Please provide a date",
      });
    }

    // Get all bookings for this date (excluding cancelled)
    const bookedSlots = await Booking.find({
      date,
      status: { $ne: "cancelled" },
    }).select("timeSlot");

    const dailyCount = bookedSlots.length;

    // Extract just the time slot strings
    const bookedTimeSlots = bookedSlots.map((booking) => booking.timeSlot);

    console.log("API Hit");
    res.status(200).json({
      success: true,
      data: {
        date,
        bookedSlots: bookedTimeSlots,
        dailyCount,
        dailyLimit: DAILY_BOOKING_LIMIT,
        isFullyBooked: dailyCount >= DAILY_BOOKING_LIMIT,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private (must be logged in)
export const createBooking = async (req, res, next) => {
  try {
    const { serviceType, addOns, address, date, timeSlot, name, phone, notes } =
      req.body;

    // Validation
    if (!serviceType || !address || !date || !name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Enforce daily booking limit
    const dailyCount = await getDailyBookingCount(date);
    if (dailyCount >= DAILY_BOOKING_LIMIT) {
      return res.status(400).json({
        success: false,
        message: "This date is fully booked (8/8). Please choose another date.",
      });
    }

    // Calculate total price using dynamic service pricing
    const totalPrice = await calculatePrice(serviceType, addOns || []);

    if (totalPrice === null) {
      return res.status(400).json({
        success: false,
        message: "Invalid service type",
      });
    }

    // Create booking
    const booking = await Booking.create({
      customerId: req.user ? req.user.id : null,
      serviceType,
      addOns: addOns || [],
      address,
      date,
      timeSlot,
      name,
      phone,
      notes: notes || "",
      totalPrice,
      status: "new",
    });

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bookings (admin only)
// @route   GET /api/bookings
// @access  Private (Admin)
export const getAllBookings = async (req, res, next) => {
  try {
    const { status, search } = req.query;

    let query = {};

    // Filter by status
    if (status && status !== "all") {
      query.status = status;
    }

    // Search by booking ID, name, or phone
    if (search) {
      query.$or = [
        { bookingId: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const bookings = await Booking.find(query)
      .populate("customerId", "phone role")
      .sort({ createdAt: -1 });

    console.log("API Hit");
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my bookings
// @route   GET /api/bookings/my
// @access  Private
export const getMyBookings = async (req, res, next) => {
  try {
    // Get bookings created by this customer
    const bookings = await Booking.find({ customerId: req.user.id })
      .populate("customerId", "phone role")
      .sort({ createdAt: -1 });

    console.log("API Hit");
    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
export const getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      bookingId: req.params.id,
    }).populate("customerId", "phone role");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check authorization
    if (
      req.user.role === "user" &&
      booking.customerId &&
      booking.customerId._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this booking",
      });
    }

    console.log("API Hit");
    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign time slot to booking (admin only)
// @route   PUT /api/bookings/:id/timeslot
// @access  Private (Admin)
export const updateTimeSlot = async (req, res, next) => {
  try {
    const { timeSlot } = req.body;

    if (!timeSlot) {
      return res.status(400).json({
        success: false,
        message: "Please provide a time slot",
      });
    }

    const booking = await Booking.findOne({ bookingId: req.params.id });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    booking.timeSlot = timeSlot;
    await booking.save();

    const updatedBooking = await Booking.findById(booking._id).populate(
      "customerId",
      "phone role",
    );

    // Fire-and-forget SMS — never blocks the response
    sendTimeSlotSms({
      phone: booking.phone,
      name:  booking.name,
      bookingId: booking.bookingId,
      timeSlot,
      date: booking.date,
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: "Time slot assigned successfully",
      data: updatedBooking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private (Admin)
export const updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Please provide a status",
      });
    }

    const booking = await Booking.findOne({ bookingId: req.params.id });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    booking.status = status;
    await booking.save();

    const updatedBooking = await Booking.findById(booking._id).populate(
      "customerId",
      "phone role",
    );

    // Fire-and-forget SMS — never blocks the response
    sendBookingStatusSms({
      phone: booking.phone,
      name:  booking.name,
      bookingId: booking.bookingId,
      status,
    }).catch(() => {});

    console.log("API Hit");
    res.status(200).json({
      success: true,
      message: "Booking status updated successfully",
      data: updatedBooking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete booking
// @route   DELETE /api/bookings/:id
// @access  Private (Admin)
export const deleteBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ bookingId: req.params.id });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    await booking.deleteOne();

    console.log("API Hit");
    res.status(200).json({
      success: true,
      message: "Booking deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
