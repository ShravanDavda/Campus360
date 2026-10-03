import express from "express";

import { authenticate, authorizeRole } from "../middleware/authMiddleware.js";
import {
  getAdminDashboard,
  listMembers,
  viewMember,
  activateMember,
  createEvent,
  editEvent,
  updateEventStatus,
  getAdminEvents,
  createTicketType,
  editTicketType,
  checkInTicket,
  createProduct,
  createProductVariant,
  updateInventory,
  createFundraiser,
  createTask,
  assignTask,
  recordIncome,
  recordExpense,
  recordReimbursement,
  getAdminFinanceDashboard,
} from "../controllers/adminController.js";

const router = express.Router();

// Apply auth + role check to all admin routes
router.use(authenticate, authorizeRole("admin"));

// Dashboard
router.get("/dashboard", getAdminDashboard);

// Members
router.get("/members", listMembers);
router.get("/members/:id", viewMember);
router.patch("/members/:id/status", activateMember);

// Events
router.post("/events", createEvent);
router.get("/events", getAdminEvents);
router.patch("/events/:id", editEvent);
router.patch("/events/:id/status", updateEventStatus);

// Tickets & Check-in
router.post("/events/:id/ticket-types", createTicketType);
router.patch("/events/:id/ticket-types/:ticketTypeId", editTicketType);
router.post("/events/:id/check-ins", checkInTicket);

// Merchandise & Inventory
router.post("/products", createProduct);
router.post("/products/:id/variants", createProductVariant);
router.patch("/products/:id/variants/:variantId/inventory", updateInventory);

// Fundraisers & Tasks
router.post("/fundraisers", createFundraiser);
router.post("/fundraisers/:id/tasks", createTask);
router.patch("/tasks/:id/assignment", assignTask);

// Finance
router.post("/finance/income", recordIncome);
router.post("/finance/expenses", recordExpense);
router.post("/finance/reimbursements", recordReimbursement);
router.get("/finance/dashboard", getAdminFinanceDashboard);

export default router;
