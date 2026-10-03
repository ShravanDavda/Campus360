import crypto from "crypto";

export const OTP_VALIDITY_MINUTES = 10;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_MAX_SENDS = 3;
export const OTP_SEND_WINDOW_MINUTES = 15;
export const OTP_MAX_ATTEMPTS = 5;
export const RESET_TOKEN_VALIDITY_MINUTES = 10;

export const generateOtp = () => {
  const otpNumber = crypto.randomInt(0, 1000000);

  return otpNumber.toString().padStart(6, "0");
};

export const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

export const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

export const getOtpExpiry = () => {
  const expiry = new Date();

  expiry.setMinutes(
    expiry.getMinutes() + OTP_VALIDITY_MINUTES
  );

  return expiry;
};

export const getResetTokenExpiry = () => {
  const expiry = new Date();

  expiry.setMinutes(
    expiry.getMinutes() + RESET_TOKEN_VALIDITY_MINUTES
  );

  return expiry;
};