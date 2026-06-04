import mongoose from "mongoose";
import dotenv from "dotenv";
import ServiceItem from "../models/ServiceItem.js";

dotenv.config();

const newServices = [
  {
    serviceFor: "car",
    serviceType: "foam-wash",
    name: "Foam Wash",
    description: "Full exterior foam bath with high-pressure rinse for a spotless finish.",
    price: 25,
    isActive: true,
  },
  {
    serviceFor: "car",
    serviceType: "vacuum-clean",
    name: "Vacuum Clean",
    description: "Deep interior vacuuming to remove dust, dirt, and debris from every corner.",
    price: 15,
    isActive: true,
  },
  {
    serviceFor: "car",
    serviceType: "ac-vent-steam",
    name: "AC Vent Steam Clean",
    description: "Steam-powered cleaning of AC vents to eliminate bacteria and freshen air quality.",
    price: 20,
    isActive: true,
  },
  {
    serviceFor: "car",
    serviceType: "tyre-polish",
    name: "Tyre Polish",
    description: "Thorough tyre and alloy wheel scrub with a premium shine finish.",
    price: 10,
    isActive: true,
  },
  {
    serviceFor: "car",
    serviceType: "dashboard-polish",
    name: "Dashboard Polish",
    description: "Wipe-down and polish of dashboard surfaces for a clean, dust-free interior.",
    price: 10,
    isActive: true,
  },
  {
    serviceFor: "car",
    serviceType: "engine-steam",
    name: "Engine Room Steam Cleaning",
    description: "Professional steam degreasing of the engine bay for optimal performance.",
    price: 30,
    isActive: true,
  },
  {
    serviceFor: "car",
    serviceType: "wax-polish",
    name: "Wax Polish",
    description: "Full-body machine wax polish to protect paint and enhance gloss.",
    price: 35,
    isActive: true,
  },
];

const seedServices = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected");

    // Remove old services
    await ServiceItem.deleteMany({});
    console.log("✅ Cleared existing services");

    // Insert new services
    await ServiceItem.insertMany(newServices);
    console.log("✅ Inserted 7 new services:");
    newServices.forEach((s) => console.log(`   - ${s.name} ($${s.price})`));

    mongoose.connection.close();
    console.log("Done.");
  } catch (error) {
    console.error("❌ Error seeding services:", error);
    process.exit(1);
  }
};

seedServices();
