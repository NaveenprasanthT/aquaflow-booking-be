import express from "express";
const router = express.Router();
import {
  getServices,
  calculatePrice,
  createService,
  updateService,
  deleteService,
  getAdminServices,
  getPublicOffers,
  getAdminOffers,
  createOffer,
  updateOffer,
  deleteOffer,
} from "../controllers/serviceController.js";
import { protect, authorize } from "../middleware/auth.js";

router.get("/", getServices);
router.post("/calculate-price", calculatePrice);
router.get("/offers", getPublicOffers);

router.get("/admin/services", protect, authorize("admin"), getAdminServices);
router.post("/admin/services", protect, authorize("admin"), createService);
router.put("/admin/services/:id", protect, authorize("admin"), updateService);
router.delete(
  "/admin/services/:id",
  protect,
  authorize("admin"),
  deleteService,
);

router.get("/admin/offers", protect, authorize("admin"), getAdminOffers);
router.post("/admin/offers", protect, authorize("admin"), createOffer);
router.put("/admin/offers/:id", protect, authorize("admin"), updateOffer);
router.delete("/admin/offers/:id", protect, authorize("admin"), deleteOffer);

export default router;
