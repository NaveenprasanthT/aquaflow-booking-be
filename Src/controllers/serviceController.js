import ServiceItem from "../models/ServiceItem.js";
import OfferBanner from "../models/OfferBanner.js";

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

const defaultServices = [
  {
    serviceFor: "car",
    serviceType: "5-seater",
    name: "5 Seater Car Wash",
    description: "Complete exterior and interior cleaning.",
    price: 25,
  },
  {
    serviceFor: "car",
    serviceType: "7-seater",
    name: "7 Seater Car Wash",
    description: "Comprehensive washing for larger vehicles.",
    price: 35,
  },
];

const formatServiceItem = (item) => {
  return {
    id: item.serviceId,
    serviceFor: item.serviceFor,
    serviceType: item.serviceType,
    name: item.name,
    description: item.description,
    basePrice: item.price,
    price: item.price,
    isActive: item.isActive,
    _id: item._id,
  };
};

const ensureDefaultServices = async () => {
  const existingCount = await ServiceItem.countDocuments();
  if (existingCount === 0) {
    await ServiceItem.insertMany(defaultServices);
  }
};

export const getServices = async (req, res, next) => {
  try {
    await ensureDefaultServices();

    const services = await ServiceItem.find({ isActive: true }).sort({
      createdAt: 1,
    });

    const offers = await OfferBanner.find({ isActive: true })
      .sort({ priority: -1, createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        services: services.map(formatServiceItem),
        addOns,
        timeSlots,
        offers,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const calculatePrice = async (req, res, next) => {
  try {
    const { serviceType, addOns: selectedAddOns } = req.body;

    if (!serviceType) {
      return res.status(400).json({
        success: false,
        message: "Please provide a service type",
      });
    }

    const service = await ServiceItem.findOne({
      $expr: {
        $eq: [{ $concat: ["$serviceFor", "-", "$serviceType"] }, serviceType],
      },
      isActive: true,
    });

    if (!service) {
      return res.status(400).json({
        success: false,
        message: "Invalid service type",
      });
    }

    let total = service.price;

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
        basePrice: service.price,
        addOns: selectedAddOns || [],
        totalPrice: total,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createService = async (req, res, next) => {
  try {
    const { serviceFor, serviceType, name, description, price } = req.body;

    if (!serviceFor || !serviceType || !name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Please provide serviceFor, serviceType, name and price",
      });
    }

    const created = await ServiceItem.create({
      serviceFor,
      serviceType,
      name,
      description: description || "",
      price,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: formatServiceItem(created),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Service for this category and type already exists",
      });
    }
    next(error);
  }
};

export const updateService = async (req, res, next) => {
  try {
    const updated = await ServiceItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: formatServiceItem(updated),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteService = async (req, res, next) => {
  try {
    const deleted = await ServiceItem.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminServices = async (req, res, next) => {
  try {
    const services = await ServiceItem.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: services.map(formatServiceItem),
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicOffers = async (req, res, next) => {
  try {
    const offers = await OfferBanner.find({ isActive: true }).sort({
      priority: -1,
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: offers,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminOffers = async (req, res, next) => {
  try {
    const offers = await OfferBanner.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: offers,
    });
  } catch (error) {
    next(error);
  }
};

export const createOffer = async (req, res, next) => {
  try {
    const { title, subtitle, imageUrl, ctaText, ctaLink, priority, isActive } =
      req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    const offer = await OfferBanner.create({
      title,
      subtitle: subtitle || "",
      imageUrl: imageUrl || "",
      ctaText: ctaText || "Book Now",
      ctaLink: ctaLink || "/book",
      priority: Number(priority || 0),
      isActive: isActive !== false,
    });

    res.status(201).json({
      success: true,
      message: "Offer banner created successfully",
      data: offer,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOffer = async (req, res, next) => {
  try {
    const updated = await OfferBanner.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Offer updated successfully",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOffer = async (req, res, next) => {
  try {
    const deleted = await OfferBanner.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
