import express from "express";

import {
  registerUser,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "../controllers/authController.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Registration
|--------------------------------------------------------------------------
*/

router.post("/register", registerUser);

/*
|--------------------------------------------------------------------------
| Password Recovery
|--------------------------------------------------------------------------
*/

router.post(
  "/forgot-password",
  forgotPassword
);

router.post(
  "/verify-reset-otp",
  verifyResetOtp
);

router.post(
  "/reset-password",
  resetPassword
);

export default router;