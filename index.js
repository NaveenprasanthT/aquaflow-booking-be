import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./Src/config/db.js";
import { setupSocket } from "./Src/socket/chatSocket.js";

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
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://localhost:3000",
  "https://aquaflow-booking.vercel.app",
  "https://aquaflow-booking.onrender.com",
  "https://spotway.vercel.app",
  "https://spotway.in",
  "https://www.spotway.in",
];

app.use(cors());
app.options("*", cors()); // Enable pre-flight across-the-board

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
import authRoutes from "./Src/routes/auth.js";
import adminAuthRoutes from "./Src/routes/adminAuth.js";
import bookingsRoutes from "./Src/routes/bookings.js";
import adminRoutes from "./Src/routes/admin.js";
import servicesRoutes from "./Src/routes/services.js";
import chatRoutes from "./Src/routes/chat.js";

// Root API endpoint
app.get("/api", (req, res) => {
  res.json({
    status: "OK",
    message: "AquaFlow Booking API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin-auth", adminAuthRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/chat", chatRoutes);

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

// Create HTTP server and attach Socket.io
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

setupSocket(io);

// Start Server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`,
  );
});

// Handle Unhandled Promise Rejections (async errors)
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION 💥");
  console.error(err.name, err.message);

  server.close(() => {
    process.exit(1);
  });
});
