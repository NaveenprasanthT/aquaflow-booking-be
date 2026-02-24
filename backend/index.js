import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

// Load environment variables
dotenv.config();

// Handle Uncaught Exceptions (sync errors)
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION 💥");
  console.error(err.name, err.message);
});

// Connect to MongoDB
connectDB();

// Initialize Express app
const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
import authRoutes from "./routes/auth.js";
import adminAuthRoutes from "./routes/adminAuth.js";
import bookingsRoutes from "./routes/bookings.js";
import adminRoutes from "./routes/admin.js";
import servicesRoutes from "./routes/services.js";

app.use("/api/auth", authRoutes);
app.use("/api/admin-auth", adminAuthRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/services", servicesRoutes);

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "AquaFlow Booking API is running",
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("ERROR 💥", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    errors: err.errors || [],
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Start Server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`
  );
});

// Handle Unhandled Promise Rejections (async errors)
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION 💥");
  console.error(err.name, err.message);

  // Optional graceful shutdown
  server.close(() => {
    process.exit(1);
  });
});