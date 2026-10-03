import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import pool from "../config/db.js";

const ALLOWED_ROLES = [
  "eventOrganizer",
  "volunteer",
  "treasurer",
];

const createValidationError = (details) => {
  const error = new Error("Invalid registration data.");
  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";
  error.details = details;

  return error;
};

export const registerUser = async (req, res, next) => {
  try {
    const { fullName, email, password, phoneNumber, role } = req.body;

    const details = {};

    // Required field validation
    if (fullName === undefined || fullName === null || fullName === "") {
      details.fullName = "Full name is required.";
    }

    if (email === undefined || email === null || email === "") {
      details.email = "Email is required.";
    }

    if (password === undefined || password === null || password === "") {
      details.password = "Password is required.";
    }

    if (
      phoneNumber === undefined ||
      phoneNumber === null ||
      phoneNumber === ""
    ) {
      details.phoneNumber = "Phone number is required.";
    }

    if (role === undefined || role === null || role === "") {
      details.role = "Role is required.";
    }

    if (Object.keys(details).length > 0) {
      return next(createValidationError(details));
    }

    // Full name validation
    if (typeof fullName !== "string") {
      details.fullName = "Full name must be a string.";
    } else if (fullName.length < 2 || fullName.length > 100) {
      details.fullName = "Full name must be between 2 and 100 characters.";
    } else if (!/^[A-Za-z ]+$/.test(fullName)) {
      details.fullName = "Full name may contain only letters and spaces.";
    }

    // Email type validation
    if (typeof email !== "string") {
      details.email = "Email must be a string.";
    }

    // Password validation
    if (typeof password !== "string") {
      details.password = "Password must be a string.";
    } else if (password.length < 8) {
      details.password = "Password must contain at least 8 characters.";
    }

    // Phone number validation
    if (typeof phoneNumber !== "string") {
      details.phoneNumber = "Phone number must be a string.";
    } else if (!/^\d{10}$/.test(phoneNumber)) {
      details.phoneNumber =
        "Phone number must contain exactly 10 digits.";
    }

    // Role validation
    if (typeof role !== "string") {
      details.role = "Role must be a string.";
    } else if (!ALLOWED_ROLES.includes(role)) {
      details.role = "Invalid registration role.";
    }

    if (Object.keys(details).length > 0) {
      return next(createValidationError(details));
    }

    // Check email uniqueness
    const emailResult = await pool.query(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [email]
    );

    if (emailResult.rows.length > 0) {
      const error = new Error(
        "An account with this email already exists."
      );

      error.statusCode = 409;
      error.code = "EMAIL_ALREADY_EXISTS";

      return next(error);
    }

    // Check phone uniqueness
    const phoneResult = await pool.query(
      "SELECT id FROM users WHERE phone_number = $1 LIMIT 1",
      [phoneNumber]
    );

    if (phoneResult.rows.length > 0) {
      const error = new Error(
        "An account with this phone number already exists."
      );

      error.statusCode = 409;
      error.code = "PHONE_ALREADY_EXISTS";

      return next(error);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const userId = randomUUID();

    await pool.query(
      `
        INSERT INTO users (
          id,
          full_name,
          email,
          password_hash,
          phone_number,
          role,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        userId,
        fullName,
        email,
        passwordHash,
        phoneNumber,
        role,
        "pending",
      ]
    );

    return res.status(201).json({
      success: true,
      message:
        "Registration successful. Your account is pending admin approval.",
    });
  } catch (error) {
    // PostgreSQL unique constraint fallback.
    // This protects against race conditions where two
    // registration requests arrive simultaneously.
    if (error.code === "23505") {
      if (error.constraint === "users_email_key") {
        const duplicateEmailError = new Error(
          "An account with this email already exists."
        );

        duplicateEmailError.statusCode = 409;
        duplicateEmailError.code = "EMAIL_ALREADY_EXISTS";

        return next(duplicateEmailError);
      }

      if (error.constraint === "users_phone_number_key") {
        const duplicatePhoneError = new Error(
          "An account with this phone number already exists."
        );

        duplicatePhoneError.statusCode = 409;
        duplicatePhoneError.code = "PHONE_ALREADY_EXISTS";

        return next(duplicatePhoneError);
      }
    }

    return next(error);
  }
};