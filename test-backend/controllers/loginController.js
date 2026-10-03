import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import pool from "../config/db.js";

const createError = (statusCode, code, message, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  if (details) error.details = details;
  return error;
};

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || email.trim() === "") {
      return next(
        createError(400, "VALIDATION_ERROR", "Invalid login data.", {
          field: "email",
          reason: "Email is required.",
        })
      );
    }

    if (!isValidEmail(email)) {
      return next(
        createError(400, "VALIDATION_ERROR", "Invalid login data.", {
          field: "email",
          reason: "A valid email is required.",
        })
      );
    }

    if (typeof password !== "string" || password === "") {
      return next(
        createError(400, "VALIDATION_ERROR", "Invalid login data.", {
          field: "password",
          reason: "Password is required.",
        })
      );
    }

    if (password.length < 8) {
      return next(
        createError(400, "VALIDATION_ERROR", "Invalid login data.", {
          field: "password",
          reason: "Password must contain at least 8 characters.",
        })
      );
    }

    const result = await pool.query(
      `
        SELECT id, full_name, email, phone_number, password_hash, role, status
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return next(
        createError(401, "INVALID_CREDENTIALS", "Invalid email or password.")
      );
    }

    const user = result.rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return next(
        createError(401, "INVALID_CREDENTIALS", "Invalid email or password.")
      );
    }

    if (user.status === "pending") {
      return next(
        createError(
          403,
          "ACCOUNT_PENDING",
          "Your account is pending admin approval."
        )
      );
    }

    if (user.status === "inactive") {
      return next(
        createError(
          403,
          "ACCOUNT_INACTIVE",
          "Your account is currently inactive."
        )
      );
    }

    if (user.status !== "active") {
      return next(
        createError(
          403,
          "ACCOUNT_INACTIVE",
          "Your account is currently inactive."
        )
      );
    }

    const token = jwt.sign(
      {
        sub: String(user.id),
        role: user.role,
        status: user.status,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        token,
        user: {
          id: String(user.id),
          fullName: user.full_name,
          email: user.email,
          phoneNumber: user.phone_number,
          role: user.role,
          status: user.status,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};
