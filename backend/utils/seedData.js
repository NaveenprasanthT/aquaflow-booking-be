import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Booking from "../models/Booking.js";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await Booking.deleteMany({});
    console.log("✅ Cleared existing data");

    // Create Admin User
    const admin = await User.create({
      phone: "1234567890",
      password: "admin123",
      role: "admin",
    });
    console.log(
      "✅ Created admin user (Phone: 1234567890, Password: admin123)",
    );
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    process.exit(1);
  }
};

seedData();
