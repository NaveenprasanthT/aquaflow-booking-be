import mongoose from "mongoose";

const serviceItemSchema = new mongoose.Schema(
  {
    serviceFor: {
      type: String,
      required: [true, "Service category is required"],
      trim: true,
      lowercase: true,
    },
    serviceType: {
      type: String,
      required: [true, "Service type is required"],
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Service price is required"],
      min: [0, "Price cannot be negative"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

serviceItemSchema.index({ serviceFor: 1, serviceType: 1 }, { unique: true });

serviceItemSchema.virtual("serviceId").get(function () {
  return `${this.serviceFor}-${this.serviceType}`;
});

serviceItemSchema.set("toJSON", { virtuals: true });
serviceItemSchema.set("toObject", { virtuals: true });

export default mongoose.model("ServiceItem", serviceItemSchema);
