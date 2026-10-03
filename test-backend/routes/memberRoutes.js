import express from "express";

import { authenticate } from "../middleware/authMiddleware.js";
import {
  getDashboard,
  getProfile,
  updateProfile,
  getMembership,
  getEvents,
  getEventDetails,
  purchaseTicket,
  getTickets,
  getTicketDetails,
  getProducts,
  getProductDetails,
  createOrder,
  getOrders,
  getOrderDetails,
  getAnnouncements,
  getAnnouncementDetails,
  getPayments,
} from "../controllers/memberController.js";

const router = express.Router();

router.use(authenticate);

router.get("/dashboard", getDashboard);

router.get("/profile", getProfile);
router.patch("/profile", updateProfile);

router.get("/membership", getMembership);

router.get("/events", getEvents);
router.get("/events/:eventId", getEventDetails);

router.post("/tickets", purchaseTicket);
router.get("/tickets", getTickets);
router.get("/tickets/:ticketId", getTicketDetails);

router.get("/products", getProducts);
router.get("/products/:productId", getProductDetails);

router.post("/orders", createOrder);
router.get("/orders", getOrders);
router.get("/orders/:orderId", getOrderDetails);

router.get("/announcements", getAnnouncements);
router.get("/announcements/:announcementId", getAnnouncementDetails);

router.get("/payments", getPayments);

export default router;
