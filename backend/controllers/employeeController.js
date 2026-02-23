import User from "../models/User.js";
import Booking from "../models/Booking.js";

// @desc    Get all employees
// @route   GET /api/employees
// @access  Private (Admin)
export const getAllEmployees = async (req, res, next) => {
  try {
    const employees = await User.find({ role: "employee" });

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single employee
// @route   GET /api/employees/:id
// @access  Private (Admin)
export const getEmployee = async (req, res, next) => {
  try {
    const employee = await User.findOne({
      _id: req.params.id,
      role: "employee",
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Get employee's bookings
    const bookings = await Booking.find({ assignedEmployee: employee._id });

    res.status(200).json({
      success: true,
      data: {
        employee,
        totalBookings: bookings.length,
        bookings,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update employee status
// @route   PUT /api/employees/:id/status
// @access  Private (Employee - self or Admin)
export const updateEmployeeStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !["available", "busy", "offline"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid status (available, busy, or offline)",
      });
    }

    const employee = await User.findById(req.params.id);

    if (!employee || employee.role !== "employee") {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Check authorization - employee can only update their own status
    if (req.user.role === "employee" && req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this employee",
      });
    }

    employee.status = status;
    await employee.save();

    res.status(200).json({
      success: true,
      message: "Employee status updated successfully",
      data: employee,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get employee dashboard stats
// @route   GET /api/employees/dashboard/stats
// @access  Private (Employee)
export const getEmployeeDashboardStats = async (req, res, next) => {
  try {
    const employeeId = req.user.id;

    // Get all bookings assigned to this employee
    const allBookings = await Booking.find({ assignedEmployee: employeeId });
    const newBookings = await Booking.find({
      assignedEmployee: employeeId,
      status: "assigned",
    });
    const inProgressBookings = await Booking.find({
      assignedEmployee: employeeId,
      status: "in-progress",
    });
    const completedBookings = await Booking.find({
      assignedEmployee: employeeId,
      status: "completed",
    });

    // Calculate total earnings (from completed jobs)
    const totalEarnings = completedBookings.reduce(
      (sum, booking) => sum + booking.totalPrice,
      0,
    );

    res.status(200).json({
      success: true,
      data: {
        totalJobs: allBookings.length,
        newJobs: newBookings.length,
        inProgress: inProgressBookings.length,
        completedJobs: completedBookings.length,
        totalEarnings,
      },
    });
  } catch (error) {
    next(error);
  }
};
