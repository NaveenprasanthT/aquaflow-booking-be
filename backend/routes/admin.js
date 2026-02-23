import express from "express";
const router = express.Router();
import {
  getAdminStats,
  getAllCustomers,
} from "../controllers/adminController.js";
import { protect, authorize } from "../middleware/auth.js";

// All routes require admin authorization
router.use(protect, authorize("admin"));

router.get("/stats", getAdminStats);
router.get("/customers", getAllCustomers);

export default router;
