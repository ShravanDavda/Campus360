import express from "express";

import { authenticate, authorizeRole } from "../middleware/authMiddleware.js";
import {
  getVolunteerTasks,
  getVolunteerTaskById,
  updateVolunteerTaskStatus,
  getVolunteerFundraisers,
} from "../controllers/volunteerController.js";

const router = express.Router();

// Apply auth + role check to all volunteer routes
router.use(authenticate, authorizeRole("volunteer"));

router.get("/tasks", getVolunteerTasks);
router.get("/tasks/:id", getVolunteerTaskById);
router.patch("/tasks/:id/status", updateVolunteerTaskStatus);
router.get("/fundraisers", getVolunteerFundraisers);

export default router;
