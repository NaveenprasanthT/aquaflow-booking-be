import mongoose from "mongoose";

const offerBannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Offer title is required"],
      trim: true,
    },
    subtitle: {
      type: String,
      default: "",
      trim: true,
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    ctaText: {
      type: String,
      default: "Book Now",
      trim: true,
    },
    ctaLink: {
      type: String,
      default: "/book",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("OfferBanner", offerBannerSchema);
