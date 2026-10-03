import express from "express";

import { authenticate, authorizeRole } from "../middleware/authMiddleware.js";
import {
  getTreasurerDashboard,
  getIncomeTransactions,
  getExpenseTransactions,
  getReimbursements,
  recordTreasurerIncome,
  recordTreasurerExpense,
  recordTreasurerReimbursement,
  getTransactionById,
} from "../controllers/treasurerController.js";

const router = express.Router();

// Apply auth + role check to all treasurer routes
router.use(authenticate, authorizeRole("treasurer"));

router.get("/dashboard", getTreasurerDashboard);

router.get("/finance/income", getIncomeTransactions);
router.get("/finance/expenses", getExpenseTransactions);
router.get("/finance/reimbursements", getReimbursements);

router.post("/finance/income", recordTreasurerIncome);
router.post("/finance/expenses", recordTreasurerExpense);
router.post("/finance/reimbursements", recordTreasurerReimbursement);

router.get("/finance/transactions/:id", getTransactionById);

export default router;
