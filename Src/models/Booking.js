import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      unique: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // Can be null for guest bookings
    },
    serviceType: {
      type: String,
      required: [true, "Service type is required"],
      enum: ["car-5-seater", "car-7-seater"],
    },
    addOns: [
      {
        type: String,
        enum: ["foam-wash", "pressure-wash", "interior-clean", "wax-polish"],
      },
    ],
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    date: {
      type: String,
      required: [true, "Date is required"],
    },
    timeSlot: {
      type: String,
      required: [true, "Time slot is required"],
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["new", "in-progress", "completed"],
      default: "new",
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Generate booking ID before saving
bookingSchema.pre("save", async function (next) {
  if (!this.bookingId) {
    this.bookingId =
      "WW" + Math.random().toString(36).substring(2, 11).toUpperCase();
  }
  next();
});

export default mongoose.model("Booking", bookingSchema);
