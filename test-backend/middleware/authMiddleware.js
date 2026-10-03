import jwt from "jsonwebtoken";

import pool from "../config/db.js";

const unauthorized = () => {
  const error = new Error("Authentication is required.");
  error.statusCode = 401;
  error.code = "UNAUTHORIZED";
  return error;
};

const inactive = () => {
  const error = new Error("Your account is currently inactive.");
  error.statusCode = 403;
  error.code = "ACCOUNT_INACTIVE";
  return error;
};

export const authenticate = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return next(unauthorized());
    }

    const token = authorization.substring(7).trim();

    if (!token) {
      return next(unauthorized());
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(unauthorized());
    }

    if (
      !decoded ||
      typeof decoded.sub !== "string" ||
      typeof decoded.role !== "string" ||
      decoded.status !== "active"
    ) {
      return next(unauthorized());
    }

    const userResult = await pool.query(
      `
        SELECT id, role, status
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [decoded.sub]
    );

    if (userResult.rows.length === 0) {
      return next(unauthorized());
    }

    const user = userResult.rows[0];

    if (user.status !== "active") {
      return next(inactive());
    }

    req.user = {
      id: String(user.id),
      role: user.role,
      status: user.status,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};
