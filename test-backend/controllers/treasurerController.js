import pool from "../config/db.js";

const createError = (statusCode, code, message, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  if (details) error.details = details;
  return error;
};

const isValidUUID = (id) =>
  typeof id === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/*
|--------------------------------------------------------------------------
| TREASURER DASHBOARD
| GET /api/treasurer/dashboard
|--------------------------------------------------------------------------
*/
export const getTreasurerDashboard = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0)::numeric AS total_income,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0)::numeric AS total_expenses
      FROM finance_transactions
    `);

    const totalIncome = Number(result.rows[0].total_income);
    const totalExpenses = Number(result.rows[0].total_expenses);
    const balance = totalIncome - totalExpenses;

    return res.status(200).json({
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        balance,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| LIST INCOME
| GET /api/treasurer/finance/income
|--------------------------------------------------------------------------
*/
export const getIncomeTransactions = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT id, amount, category, description, created_at
        FROM finance_transactions
        WHERE type = 'INCOME'
        ORDER BY created_at DESC
      `
    );

    return res.status(200).json({
      success: true,
      data: {
        transactions: result.rows.map((t) => ({
          id: String(t.id),
          amount: Number(t.amount),
          category: t.category,
          description: t.description,
          createdAt: t.created_at instanceof Date ? t.created_at.toISOString() : String(t.created_at),
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| LIST EXPENSES
| GET /api/treasurer/finance/expenses
|--------------------------------------------------------------------------
*/
export const getExpenseTransactions = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT id, amount, category, description, created_at
        FROM finance_transactions
        WHERE type = 'EXPENSE'
        ORDER BY created_at DESC
      `
    );

    return res.status(200).json({
      success: true,
      data: {
        transactions: result.rows.map((t) => ({
          id: String(t.id),
          amount: Number(t.amount),
          category: t.category,
          description: t.description,
          createdAt: t.created_at instanceof Date ? t.created_at.toISOString() : String(t.created_at),
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| LIST REIMBURSEMENTS
| GET /api/treasurer/finance/reimbursements
|--------------------------------------------------------------------------
*/
export const getReimbursements = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT id, user_id, amount, description, status, created_at
        FROM reimbursements
        ORDER BY created_at DESC
      `
    );

    return res.status(200).json({
      success: true,
      data: {
        reimbursements: result.rows.map((r) => ({
          id: String(r.id),
          userId: String(r.user_id),
          amount: Number(r.amount),
          description: r.description,
          status: r.status,
          createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| RECORD INCOME
| POST /api/treasurer/finance/income
|--------------------------------------------------------------------------
*/
export const recordTreasurerIncome = async (req, res, next) => {
  try {
    const { amount, category, description } = req.body;

    if (typeof amount !== "number" || amount <= 0) {
      return next(createError(400, "VALIDATION_ERROR", "Amount must be a positive number."));
    }
    if (!category || typeof category !== "string" || category.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Category is required."));
    }
    if (!description || typeof description !== "string" || description.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Description is required."));
    }

    const result = await pool.query(
      `
        INSERT INTO finance_transactions (type, amount, category, description, created_by)
        VALUES ('INCOME', $1, $2, $3, $4)
        RETURNING id
      `,
      [amount, category.trim(), description.trim(), req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: "Income transaction recorded successfully.",
      data: {
        transactionId: String(result.rows[0].id),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| RECORD EXPENSE
| POST /api/treasurer/finance/expenses
|--------------------------------------------------------------------------
*/
export const recordTreasurerExpense = async (req, res, next) => {
  try {
    const { amount, category, description } = req.body;

    if (typeof amount !== "number" || amount <= 0) {
      return next(createError(400, "VALIDATION_ERROR", "Amount must be a positive number."));
    }
    if (!category || typeof category !== "string" || category.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Category is required."));
    }
    if (!description || typeof description !== "string" || description.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Description is required."));
    }

    const result = await pool.query(
      `
        INSERT INTO finance_transactions (type, amount, category, description, created_by)
        VALUES ('EXPENSE', $1, $2, $3, $4)
        RETURNING id
      `,
      [amount, category.trim(), description.trim(), req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: "Expense transaction recorded successfully.",
      data: {
        transactionId: String(result.rows[0].id),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| RECORD REIMBURSEMENT
| POST /api/treasurer/finance/reimbursements
|--------------------------------------------------------------------------
*/
export const recordTreasurerReimbursement = async (req, res, next) => {
  try {
    const { userId, amount, description } = req.body;

    if (!userId || !isValidUUID(userId)) {
      return next(createError(400, "VALIDATION_ERROR", "Valid userId is required."));
    }
    if (typeof amount !== "number" || amount <= 0) {
      return next(createError(400, "VALIDATION_ERROR", "Amount must be a positive number."));
    }
    if (!description || typeof description !== "string" || description.trim() === "") {
      return next(createError(400, "VALIDATION_ERROR", "Description is required."));
    }

    const userRes = await pool.query(`SELECT id FROM users WHERE id = $1 LIMIT 1`, [userId]);
    if (userRes.rows.length === 0) {
      return next(createError(404, "USER_NOT_FOUND", "Referenced user not found."));
    }

    const result = await pool.query(
      `
        INSERT INTO reimbursements (user_id, amount, description, status, created_by)
        VALUES ($1, $2, $3, 'RECORDED', $4)
        RETURNING id
      `,
      [userId, amount, description.trim(), req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: "Reimbursement recorded successfully.",
      data: {
        reimbursementId: String(result.rows[0].id),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| GET TRANSACTION BY ID
| GET /api/treasurer/finance/transactions/:id
|--------------------------------------------------------------------------
*/
export const getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return next(createError(404, "TRANSACTION_NOT_FOUND", "Transaction not found."));
    }

    const result = await pool.query(
      `
        SELECT id, type, amount, category, description, created_at
        FROM finance_transactions
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return next(createError(404, "TRANSACTION_NOT_FOUND", "Transaction not found."));
    }

    const t = result.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        id: String(t.id),
        type: t.type,
        amount: Number(t.amount),
        category: t.category,
        description: t.description,
        createdAt: t.created_at instanceof Date ? t.created_at.toISOString() : String(t.created_at),
      },
    });
  } catch (error) {
    return next(error);
  }
};
