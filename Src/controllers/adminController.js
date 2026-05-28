import User from "../models/User.js";
import Booking from "../models/Booking.js";

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private (Admin)
export const getAdminStats = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Booking counts in parallel
    const [totalBookings, todayBookings, newBookings, inProgressBookings, completedBookings] =
      await Promise.all([
        Booking.countDocuments({ status: { $ne: "cancelled" } }),
        Booking.countDocuments({ date: today }),
        Booking.countDocuments({ status: "new" }),
        Booking.countDocuments({ status: "in-progress" }),
        Booking.countDocuments({ status: "completed" }),
      ]);

    // Revenue calculations
    const [allBookingsData, todayBookingsData] = await Promise.all([
      Booking.find({ status: { $ne: "cancelled" } }).select("totalPrice status"),
      Booking.find({ date: today }).select("totalPrice"),
    ]);

    const totalRevenue = allBookingsData.reduce((sum, b) => sum + b.totalPrice, 0);
    const completedRevenue = allBookingsData
      .filter((b) => b.status === "completed")
      .reduce((sum, b) => sum + b.totalPrice, 0);
    const todayRevenue = todayBookingsData.reduce((sum, b) => sum + b.totalPrice, 0);
    const avgOrderValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

    // User counts
    const [totalUsers, newUsersThisMonth] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "user", createdAt: { $gte: startOfMonth } }),
    ]);

    // Last 7 days chart data
    const last7DaysDates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7DaysDates.push(d.toISOString().split("T")[0]);
    }

    const last7DaysBookings = await Booking.find({
      date: { $in: last7DaysDates },
      status: { $ne: "cancelled" },
    }).select("date totalPrice");

    const last7Days = last7DaysDates.map((dateStr) => {
      const dayBookings = last7DaysBookings.filter((b) => b.date === dateStr);
      const d = new Date(dateStr + "T00:00:00");
      return {
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count: dayBookings.length,
        revenue: dayBookings.reduce((sum, b) => sum + b.totalPrice, 0),
      };
    });

    // Bookings by service type
    const byServiceRaw = await Booking.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: "$serviceType",
          count: { $sum: 1 },
          revenue: { $sum: "$totalPrice" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    const byService = byServiceRaw.map((s) => ({
      name: s._id
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      count: s.count,
      revenue: s.revenue,
    }));

    // Recent 5 bookings
    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("bookingId name serviceType date status totalPrice createdAt");

    res.status(200).json({
      success: true,
      data: {
        bookings: {
          total: totalBookings,
          today: todayBookings,
          new: newBookings,
          inProgress: inProgressBookings,
          completed: completedBookings,
        },
        revenue: {
          total: totalRevenue,
          completed: completedRevenue,
          today: todayRevenue,
          average: avgOrderValue,
        },
        users: {
          total: totalUsers,
          newThisMonth: newUsersThisMonth,
        },
        charts: {
          last7Days,
          byService,
        },
        recentBookings: recentBookings.map((b) => ({
          id: b.bookingId,
          name: b.name,
          serviceType: b.serviceType,
          date: b.date,
          status: b.status,
          totalPrice: b.totalPrice,
        })),
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
