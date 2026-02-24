import User from "../models/User.js";
import Booking from "../models/Booking.js";

export const getAdminStats = async (req, res, next) => {
  try {
    // Get bookings data
    const totalBookings = await Booking.countDocuments();
    const newBookings = await Booking.countDocuments({ status: "new" });
    const inProgressBookings = await Booking.countDocuments({
      status: "in-progress",
    });
    const completedBookings = await Booking.countDocuments({
      status: "completed",
    });

    // Get users data
    const totalCustomers = await User.countDocuments({ role: "user" });

    // Get total revenue (from completed bookings)
    const completedBookingsData = await Booking.find({ status: "completed" });
    const totalRevenue = completedBookingsData.reduce(
      (sum, booking) => sum + booking.totalPrice,
      0,
    );

    res.status(200).json({
      success: true,
      data: {
        bookings: {
          total: totalBookings,
          new: newBookings,
          inProgress: inProgressBookings,
          completed: completedBookings,
        },
        users: {
          customers: totalCustomers,
        },
        revenue: {
          total: totalRevenue,
          average:
            completedBookings > 0
              ? (totalRevenue / completedBookings).toFixed(2)
              : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all customers
// @route   GET /api/admin/customers
// @access  Private (Admin)
export const getAllCustomers = async (req, res, next) => {
  try {
    const customers = await User.find({ role: "user" }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};
