import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

import pool from "../config/db.js";

import {
  generateOtp,
  generateResetToken,
  hashToken,
  getOtpExpiry,
  getResetTokenExpiry,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_MAX_SENDS,
  OTP_SEND_WINDOW_MINUTES,
} from "../utils/passwordReset.js";

import { sendPasswordResetOtp } from "../services/brevoService.js";

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

const createSimpleError = (
  statusCode,
  code,
  message
) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
};

/*
|--------------------------------------------------------------------------
| REGISTER
|--------------------------------------------------------------------------
*/

export const registerUser = async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      password,
      phoneNumber,
      role,
    } = req.body;

    const details = {};

    if (
      fullName === undefined ||
      fullName === null ||
      fullName === ""
    ) {
      details.fullName = "Full name is required.";
    }

    if (
      email === undefined ||
      email === null ||
      email === ""
    ) {
      details.email = "Email is required.";
    }

    if (
      password === undefined ||
      password === null ||
      password === ""
    ) {
      details.password = "Password is required.";
    }

    if (
      phoneNumber === undefined ||
      phoneNumber === null ||
      phoneNumber === ""
    ) {
      details.phoneNumber = "Phone number is required.";
    }

    if (
      role === undefined ||
      role === null ||
      role === ""
    ) {
      details.role = "Role is required.";
    }

    if (Object.keys(details).length > 0) {
      return next(createValidationError(details));
    }

    if (typeof fullName !== "string") {
      details.fullName = "Full name must be a string.";
    } else if (
      fullName.length < 2 ||
      fullName.length > 100
    ) {
      details.fullName =
        "Full name must be between 2 and 100 characters.";
    } else if (!/^[A-Za-z ]+$/.test(fullName)) {
      details.fullName =
        "Full name may contain only letters and spaces.";
    }

    if (typeof email !== "string") {
      details.email = "Email must be a string.";
    }

    if (typeof password !== "string") {
      details.password = "Password must be a string.";
    } else if (password.length < 8) {
      details.password =
        "Password must contain at least 8 characters.";
    }

    if (typeof phoneNumber !== "string") {
      details.phoneNumber =
        "Phone number must be a string.";
    } else if (!/^\d{10}$/.test(phoneNumber)) {
      details.phoneNumber =
        "Phone number must contain exactly 10 digits.";
    }

    if (typeof role !== "string") {
      details.role = "Role must be a string.";
    } else if (!ALLOWED_ROLES.includes(role)) {
      details.role = "Invalid registration role.";
    }

    if (Object.keys(details).length > 0) {
      return next(createValidationError(details));
    }

    const emailResult = await pool.query(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [email]
    );

    if (emailResult.rows.length > 0) {
      return next(
        createSimpleError(
          409,
          "EMAIL_ALREADY_EXISTS",
          "An account with this email already exists."
        )
      );
    }

    const phoneResult = await pool.query(
      "SELECT id FROM users WHERE phone_number = $1 LIMIT 1",
      [phoneNumber]
    );

    if (phoneResult.rows.length > 0) {
      return next(
        createSimpleError(
          409,
          "PHONE_ALREADY_EXISTS",
          "An account with this phone number already exists."
        )
      );
    }

    const passwordHash = await bcrypt.hash(
      password,
      12
    );

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
    if (error.code === "23505") {
      if (error.constraint === "users_email_key") {
        return next(
          createSimpleError(
            409,
            "EMAIL_ALREADY_EXISTS",
            "An account with this email already exists."
          )
        );
      }

      if (
        error.constraint ===
        "users_phone_number_key"
      ) {
        return next(
          createSimpleError(
            409,
            "PHONE_ALREADY_EXISTS",
            "An account with this phone number already exists."
          )
        );
      }
    }

    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| FORGOT PASSWORD
|--------------------------------------------------------------------------
*/

export const forgotPassword = async (
  req,
  res,
  next
) => {
  try {
    const { email } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Validate request
    |--------------------------------------------------------------------------
    */

    if (
      typeof email !== "string" ||
      email.trim() === ""
    ) {
      return next(
        createSimpleError(
          400,
          "VALIDATION_ERROR",
          "Invalid registration data."
        )
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Check resend cooldown
    |--------------------------------------------------------------------------
    */

    const latestRequestResult = await pool.query(
      `
        SELECT generated_at
        FROM password_reset_otps
        WHERE email = $1
        ORDER BY generated_at DESC
        LIMIT 1
      `,
      [email]
    );

    if (latestRequestResult.rows.length > 0) {
      const latestGeneratedAt = new Date(
        latestRequestResult.rows[0].generated_at
      );

      const secondsSinceLastRequest =
        (Date.now() - latestGeneratedAt.getTime()) /
        1000;

      if (
        secondsSinceLastRequest <
        OTP_RESEND_COOLDOWN_SECONDS
      ) {
        return next(
          createSimpleError(
            429,
            "OTP_RATE_LIMITED",
            "Please wait before requesting another OTP."
          )
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Check maximum sends within 15 minutes
    |--------------------------------------------------------------------------
    */

    const sendWindowResult = await pool.query(
      `
        SELECT COUNT(*) AS count
        FROM password_reset_otps
        WHERE email = $1
          AND generated_at >= NOW() - INTERVAL '15 minutes'
      `,
      [email]
    );

    const sendCount = Number(
      sendWindowResult.rows[0].count
    );

    if (sendCount >= OTP_MAX_SENDS) {
      return next(
        createSimpleError(
          429,
          "OTP_RATE_LIMITED",
          "Please wait before requesting another OTP."
        )
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Find account
    |--------------------------------------------------------------------------
    */

    const userResult = await pool.query(
      `
        SELECT id
        FROM users
        WHERE email = $1
        LIMIT 1
      `,
      [email]
    );

    /*
    |--------------------------------------------------------------------------
    | Unknown email
    |
    | Record the request so repeated requests to unknown emails
    | follow the same externally visible rate-limit behavior.
    |--------------------------------------------------------------------------
    */

    if (userResult.rows.length === 0) {
      await pool.query(
        `
          INSERT INTO password_reset_otps (
            id,
            email,
            user_id,
            otp_hash,
            generated_at,
            expires_at,
            attempts
          )
          VALUES (
            $1,
            $2,
            NULL,
            NULL,
            NOW(),
            NOW() + INTERVAL '10 minutes',
            0
          )
        `,
        [randomUUID(), email]
      );

      return res.status(200).json({
        success: true,
        message:
          "If this email is registered, an OTP has been sent to your email.",
      });
    }

    const userId = userResult.rows[0].id;

    /*
    |--------------------------------------------------------------------------
    | Generate OTP
    |--------------------------------------------------------------------------
    */

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 12);
    const otpId = randomUUID();
    const otpExpiry = getOtpExpiry();

    /*
    |--------------------------------------------------------------------------
    | Invalidate previous OTPs
    |--------------------------------------------------------------------------
    */

    await pool.query(
      `
        UPDATE password_reset_otps
        SET invalidated_at = NOW()
        WHERE email = $1
          AND invalidated_at IS NULL
          AND verified_at IS NULL
      `,
      [email]
    );

    /*
    |--------------------------------------------------------------------------
    | Store newest OTP
    |--------------------------------------------------------------------------
    */

    await pool.query(
      `
        INSERT INTO password_reset_otps (
          id,
          email,
          user_id,
          otp_hash,
          generated_at,
          expires_at,
          attempts
        )
        VALUES ($1, $2, $3, $4, NOW(), $5, 0)
      `,
      [
        otpId,
        email,
        userId,
        otpHash,
        otpExpiry,
      ]
    );

    /*
    |--------------------------------------------------------------------------
    | Send OTP through Brevo
    |--------------------------------------------------------------------------
    */

    try {
      await sendPasswordResetOtp({
        email,
        otp,
      });
    } catch (brevoError) {
      /*
      |--------------------------------------------------------------------------
      | If email delivery fails, invalidate the OTP so it
      | cannot be used even though it was not delivered.
      |--------------------------------------------------------------------------
      */

      await pool.query(
        `
          UPDATE password_reset_otps
          SET invalidated_at = NOW()
          WHERE id = $1
        `,
        [otpId]
      );

      return next(
        createSimpleError(
          500,
          "INTERNAL_SERVER_ERROR",
          "An unexpected error occurred. Please try again later."
        )
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "If this email is registered, an OTP has been sent to your email.",
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| VERIFY RESET OTP
|--------------------------------------------------------------------------
*/

export const verifyResetOtp = async (
  req,
  res,
  next
) => {
  try {
    const { email, otp } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Request validation
    |--------------------------------------------------------------------------
    */

    const details = {};

    if (
      typeof email !== "string" ||
      email.trim() === ""
    ) {
      details.email = "Email is required.";
    }

    if (
      typeof otp !== "string" ||
      !/^\d{6}$/.test(otp)
    ) {
      details.otp =
        "OTP must contain exactly 6 digits.";
    }

    if (Object.keys(details).length > 0) {
      return next(createValidationError(details));
    }

    /*
    |--------------------------------------------------------------------------
    | Get latest OTP
    |--------------------------------------------------------------------------
    */

    const otpResult = await pool.query(
      `
        SELECT
          id,
          user_id,
          otp_hash,
          expires_at,
          attempts,
          verified_at,
          invalidated_at
        FROM password_reset_otps
        WHERE email = $1
        ORDER BY generated_at DESC
        LIMIT 1
      `,
      [email]
    );

    /*
    |--------------------------------------------------------------------------
    | Unknown email / no OTP
    |--------------------------------------------------------------------------
    */

    if (
      otpResult.rows.length === 0 ||
      !otpResult.rows[0].user_id ||
      !otpResult.rows[0].otp_hash
    ) {
      return next(
        createSimpleError(
          400,
          "INVALID_OTP",
          "The OTP is invalid or has expired."
        )
      );
    }

    const resetOtp = otpResult.rows[0];

    /*
    |--------------------------------------------------------------------------
    | Already invalidated / verified
    |--------------------------------------------------------------------------
    */

    if (
      resetOtp.invalidated_at ||
      resetOtp.verified_at
    ) {
      return next(
        createSimpleError(
          400,
          "INVALID_OTP",
          "The OTP is invalid or has expired."
        )
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Attempt limit
    |--------------------------------------------------------------------------
    */

    if (resetOtp.attempts >= OTP_MAX_ATTEMPTS) {
      await pool.query(
        `
          UPDATE password_reset_otps
          SET invalidated_at = NOW()
          WHERE id = $1
        `,
        [resetOtp.id]
      );

      return next(
        createSimpleError(
          400,
          "OTP_ATTEMPTS_EXCEEDED",
          "OTP verification attempts exceeded. Please request a new OTP."
        )
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Expiry
    |--------------------------------------------------------------------------
    */

    if (
      new Date(resetOtp.expires_at).getTime() <=
      Date.now()
    ) {
      return next(
        createSimpleError(
          400,
          "INVALID_OTP",
          "The OTP is invalid or has expired."
        )
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Compare OTP
    |--------------------------------------------------------------------------
    */

    const otpMatches = await bcrypt.compare(
      otp,
      resetOtp.otp_hash
    );

    if (!otpMatches) {
      const updatedResult = await pool.query(
        `
          UPDATE password_reset_otps
          SET attempts = attempts + 1
          WHERE id = $1
          RETURNING attempts
        `,
        [resetOtp.id]
      );

      const attempts =
        updatedResult.rows[0].attempts;

      if (attempts >= OTP_MAX_ATTEMPTS) {
        await pool.query(
          `
            UPDATE password_reset_otps
            SET invalidated_at = NOW()
            WHERE id = $1
          `,
          [resetOtp.id]
        );

        return next(
          createSimpleError(
            400,
            "OTP_ATTEMPTS_EXCEEDED",
            "OTP verification attempts exceeded. Please request a new OTP."
          )
        );
      }

      return next(
        createSimpleError(
          400,
          "INVALID_OTP",
          "The OTP is invalid or has expired."
        )
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Mark OTP as verified
    |--------------------------------------------------------------------------
    */

    await pool.query(
      `
        UPDATE password_reset_otps
        SET verified_at = NOW()
        WHERE id = $1
      `,
      [resetOtp.id]
    );

    /*
    |--------------------------------------------------------------------------
    | Generate temporary reset token
    |--------------------------------------------------------------------------
    */

    const resetToken = generateResetToken();
    const resetTokenHash = hashToken(resetToken);
    const resetTokenId = randomUUID();
    const resetTokenExpiry =
      getResetTokenExpiry();

    await pool.query(
      `
        INSERT INTO password_reset_tokens (
          id,
          user_id,
          token_hash,
          expires_at
        )
        VALUES ($1, $2, $3, $4)
      `,
      [
        resetTokenId,
        resetOtp.user_id,
        resetTokenHash,
        resetTokenExpiry,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
      data: {
        resetToken,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/*
|--------------------------------------------------------------------------
| RESET PASSWORD
|--------------------------------------------------------------------------
*/

export const resetPassword = async (
  req,
  res,
  next
) => {
  try {
    const { newPassword } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Validate password
    |--------------------------------------------------------------------------
    */

    if (
      typeof newPassword !== "string" ||
      newPassword.length < 8
    ) {
      return next(
        createValidationError({
          newPassword:
            "Password must contain at least 8 characters.",
        })
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Read reset token
    |--------------------------------------------------------------------------
    */

    const authorization =
      req.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return next(
        createSimpleError(
          401,
          "INVALID_RESET_TOKEN",
          "Password reset authorization is invalid or has expired. Please start the password recovery process again."
        )
      );
    }

    const resetToken =
      authorization.substring(7).trim();

    if (!resetToken) {
      return next(
        createSimpleError(
          401,
          "INVALID_RESET_TOKEN",
          "Password reset authorization is invalid or has expired. Please start the password recovery process again."
        )
      );
    }

    const resetTokenHash =
      hashToken(resetToken);

    /*
    |--------------------------------------------------------------------------
    | Find valid reset token
    |--------------------------------------------------------------------------
    */

    const tokenResult = await pool.query(
      `
        SELECT
          id,
          user_id,
          expires_at,
          used_at
        FROM password_reset_tokens
        WHERE token_hash = $1
        LIMIT 1
      `,
      [resetTokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return next(
        createSimpleError(
          401,
          "INVALID_RESET_TOKEN",
          "Password reset authorization is invalid or has expired. Please start the password recovery process again."
        )
      );
    }

    const tokenRecord =
      tokenResult.rows[0];

    /*
    |--------------------------------------------------------------------------
    | Check single-use condition
    |--------------------------------------------------------------------------
    */

    if (tokenRecord.used_at) {
      return next(
        createSimpleError(
          401,
          "INVALID_RESET_TOKEN",
          "Password reset authorization is invalid or has expired. Please start the password recovery process again."
        )
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Check expiration
    |--------------------------------------------------------------------------
    */

    if (
      new Date(tokenRecord.expires_at).getTime() <=
      Date.now()
    ) {
      return next(
        createSimpleError(
          401,
          "INVALID_RESET_TOKEN",
          "Password reset authorization is invalid or has expired. Please start the password recovery process again."
        )
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Hash new password
    |--------------------------------------------------------------------------
    */

    const passwordHash = await bcrypt.hash(
      newPassword,
      12
    );

    /*
    |--------------------------------------------------------------------------
    | Update password and invalidate token
    |--------------------------------------------------------------------------
    */

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      await client.query(
        `
          UPDATE users
          SET
            password_hash = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `,
        [
          passwordHash,
          tokenRecord.user_id,
        ]
      );

      await client.query(
        `
          UPDATE password_reset_tokens
          SET used_at = NOW()
          WHERE id = $1
        `,
        [tokenRecord.id]
      );

      await client.query("COMMIT");
    } catch (transactionError) {
      await client.query("ROLLBACK");

      throw transactionError;
    } finally {
      client.release();
    }

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    return next(error);
  }
};