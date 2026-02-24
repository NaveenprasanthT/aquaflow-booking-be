import Booking from "../models/Booking.js";
import User from "../models/User.js";

// Service pricing (matching frontend)
const servicePrices = {
  "car-5-seater": 25,
  "car-7-seater": 35,
};

const addOnPrices = {
  "foam-wash": 15,
  "pressure-wash": 20,
  "interior-clean": 25,
  "wax-polish": 30,
};

// Calculate total price
const calculatePrice = (serviceType, addOns = []) => {
  let total = servicePrices[serviceType] || 0;

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

    // Extract just the time slot strings
    const bookedTimeSlots = bookedSlots.map((booking) => booking.timeSlot);

    res.status(200).json({
      success: true,
      data: {
        date,
        bookedSlots: bookedTimeSlots,
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
    if (!serviceType || !address || !date || !timeSlot || !name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Check if time slot is already booked for this date
    const existingBooking = await Booking.findOne({
      date,
      timeSlot,
      status: { $ne: "cancelled" }, // Exclude cancelled bookings
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message:
          "This time slot is already booked. Please select another time.",
      });
    }

    // Calculate total price
    const totalPrice = calculatePrice(serviceType, addOns || []);

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

    res.status(200).json({
      success: true,
      data: booking,
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

    res.status(200).json({
      success: true,
      message: "Booking deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
