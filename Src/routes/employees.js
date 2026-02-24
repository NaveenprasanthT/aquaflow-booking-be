import express from "express";
const router = express.Router();
import {
  getAllEmployees,
  getEmployee,
  updateEmployeeStatus,
  getEmployeeDashboardStats,
} from "../controllers/employeeController.js";
import { protect, authorize } from "../middleware/auth.js";

router.get("/", protect, authorize("admin"), getAllEmployees);
router.get(
  "/dashboard/stats",
  protect,
  authorize("employee"),
  getEmployeeDashboardStats,
);
router.get("/:id", protect, authorize("admin"), getEmployee);
router.put(
  "/:id/status",
  protect,
  authorize("employee", "admin"),
  updateEmployeeStatus,
);

export default router;
