import express from "express";

import { authenticate, authorizeRole } from "../middleware/authMiddleware.js";
import {
  createOrganizerEvent,
  editOrganizerEvent,
  updateOrganizerEventStatus,
  getOrganizerEvents,
  createOrganizerTicketType,
  editOrganizerTicketType,
  getOrganizerEventOperations,
  organizerCheckInTicket,
} from "../controllers/organizerController.js";

const router = express.Router();

// Apply auth + role check to all organizer routes
router.use(authenticate, authorizeRole("eventOrganizer"));

router.post("/events", createOrganizerEvent);
router.get("/events", getOrganizerEvents);
router.patch("/events/:id", editOrganizerEvent);
router.patch("/events/:id/status", updateOrganizerEventStatus);

router.post("/events/:id/ticket-types", createOrganizerTicketType);
router.patch("/events/:id/ticket-types/:ticketTypeId", editOrganizerTicketType);
router.get("/events/:id/operations", getOrganizerEventOperations);
router.post("/events/:id/check-ins", organizerCheckInTicket);

export default router;
