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
| VOLUNTEER LIST TASKS
| GET /api/volunteer/tasks
|--------------------------------------------------------------------------
*/
export const getVolunteerTasks = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT id, fundraiser_id, title, description, status, created_at
        FROM tasks
        WHERE assigned_to = $1
        ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      data: {
        tasks: result.rows.map((t) => ({
          id: String(t.id),
          fundraiserId: String(t.fundraiser_id),
          title: t.title,
          description: t.description,
          status: t.status,
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
| VOLUNTEER GET TASK BY ID
| GET /api/volunteer/tasks/:id
|--------------------------------------------------------------------------
*/
export const getVolunteerTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return next(createError(404, "TASK_NOT_FOUND", "Task not found."));
    }

    const result = await pool.query(
      `
        SELECT id, fundraiser_id, title, description, status, assigned_to, created_at
        FROM tasks
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return next(createError(404, "TASK_NOT_FOUND", "Task not found."));
    }

    const task = result.rows[0];

    if (!task.assigned_to || String(task.assigned_to) !== String(req.user.id)) {
      return next(createError(403, "FORBIDDEN", "You do not have permission to perform this action."));
    }

    return res.status(200).json({
      success: true,
      data: {
        id: String(task.id),
        fundraiserId: String(task.fundraiser_id),
        title: task.title,
        description: task.description,
        status: task.status,
        createdAt: task.created_at instanceof Date ? task.created_at.toISOString() : String(task.created_at),
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| VOLUNTEER UPDATE TASK STATUS
| PATCH /api/volunteer/tasks/:id/status
|--------------------------------------------------------------------------
*/
export const updateVolunteerTaskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["TODO", "IN_PROGRESS", "DONE"];
    if (typeof status !== "string" || !allowed.includes(status.toUpperCase())) {
      return next(createError(400, "VALIDATION_ERROR", `Invalid task status. Allowed: ${allowed.join(", ")}`));
    }

    if (!isValidUUID(id)) {
      return next(createError(404, "TASK_NOT_FOUND", "Task not found."));
    }

    const checkRes = await pool.query(
      `SELECT id, assigned_to FROM tasks WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (checkRes.rows.length === 0) {
      return next(createError(404, "TASK_NOT_FOUND", "Task not found."));
    }

    const task = checkRes.rows[0];

    if (!task.assigned_to || String(task.assigned_to) !== String(req.user.id)) {
      return next(createError(403, "FORBIDDEN", "You do not have permission to perform this action."));
    }

    await pool.query(
      `UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status.toUpperCase(), id]
    );

    return res.status(200).json({
      success: true,
      message: "Task status updated successfully.",
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| VOLUNTEER LIST FUNDRAISERS
| GET /api/volunteer/fundraisers
|--------------------------------------------------------------------------
*/
export const getVolunteerFundraisers = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT DISTINCT f.id, f.name, f.description, f.created_at
        FROM fundraisers f
        INNER JOIN tasks t ON t.fundraiser_id = f.id
        WHERE t.assigned_to = $1
        ORDER BY f.created_at DESC
      `,
      [req.user.id]
    );

    return res.status(200).json({
      success: true,
      data: {
        fundraisers: result.rows.map((f) => ({
          id: String(f.id),
          name: f.name,
          description: f.description,
          createdAt: f.created_at instanceof Date ? f.created_at.toISOString() : String(f.created_at),
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};
