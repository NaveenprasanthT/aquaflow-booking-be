import express from "express";
const router = express.Router();

// Services data (matching frontend)
const services = [
  {
    id: "car-5-seater",
    name: "5-Seater Car Wash",
    description: "Complete wash for compact and sedan cars",
    basePrice: 25,
    category: "car-wash",
  },
  {
    id: "car-7-seater",
    name: "7-Seater Car Wash",
    description: "Complete wash for SUVs and large vehicles",
    basePrice: 35,
    category: "car-wash",
  },
];

// Add-ons data
const addOns = [
  {
    id: "foam-wash",
    name: "Foam Wash",
    description: "Premium foam cleaning",
    price: 15,
  },
  {
    id: "pressure-wash",
    name: "Pressure Wash",
    description: "High-pressure deep cleaning",
    price: 20,
  },
  {
    id: "interior-clean",
    name: "Interior Cleaning",
    description: "Complete interior detailing",
    price: 25,
  },
  {
    id: "wax-polish",
    name: "Wax & Polish",
    description: "Professional wax and polish",
    price: 30,
  },
];

// Time slots
const timeSlots = [
  "8:00 AM - 9:00 AM",
  "9:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 1:00 PM",
  "1:00 PM - 2:00 PM",
  "2:00 PM - 3:00 PM",
  "3:00 PM - 4:00 PM",
  "4:00 PM - 5:00 PM",
  "5:00 PM - 6:00 PM",
];

// @desc    Get all services
// @route   GET /api/services
// @access  Public
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      services,
      addOns,
      timeSlots,
    },
  });
});

// @desc    Get service pricing
// @route   POST /api/services/calculate-price
// @access  Public
router.post("/calculate-price", (req, res) => {
  const { serviceType, addOns: selectedAddOns } = req.body;

  if (!serviceType) {
    return res.status(400).json({
      success: false,
      message: "Please provide a service type",
    });
  }

  const service = services.find((s) => s.id === serviceType);

  if (!service) {
    return res.status(400).json({
      success: false,
      message: "Invalid service type",
    });
  }

  let total = service.basePrice;

  if (selectedAddOns && Array.isArray(selectedAddOns)) {
    selectedAddOns.forEach((addOnId) => {
      const addOn = addOns.find((a) => a.id === addOnId);
      if (addOn) {
        total += addOn.price;
      }
    });
  }

  res.status(200).json({
    success: true,
    data: {
      serviceType,
      basePrice: service.basePrice,
      addOns: selectedAddOns || [],
      totalPrice: total,
    },
  });
});

export default router;
