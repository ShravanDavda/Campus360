import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { Label } from '../components/ui/Label';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve email from location state or fallback to sessionStorage
  const [email] = useState(() => {
    const passedEmail = location.state?.email;
    if (passedEmail) {
      sessionStorage.setItem('resetEmail', passedEmail);
      return passedEmail;
    }
    return sessionStorage.getItem('resetEmail') || '';
  });

  const [otp, setOtp] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);

  // 60-second cooldown timer for resend OTP
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Handle OTP input change: digits only, maximum 6 characters, string representation
  const handleOtpChange = (e) => {
    // Strip all non-digit characters and take maximum 6 digits
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(cleaned);
    if (fieldError) setFieldError('');
    if (formError) setFormError('');
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    if (isVerifying || isResending) return;

    setFieldError('');
    setFormError('');
    setSuccessMessage('');

    if (!email) {
      setFormError('No email context found. Please return to Forgot Password.');
      return;
    }

    // Client-side validation: must be exactly 6 digits
    if (!otp) {
      setFieldError('Please enter the 6-digit verification code.');
      return;
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      setFieldError('Verification code must contain exactly 6 digits.');
      return;
    }

    setIsVerifying(true);

    try {
      // POST /api/auth/verify-reset-otp with exact payload: { email, otp }
      // NOTE: otp is kept as string to preserve any leading zeroes
      const response = await api.post('/auth/verify-reset-otp', {
        email: email.trim(),
        otp: otp,
      });

      if (response.status === 200 || response.data?.success) {
        const resetToken = response.data?.data?.resetToken;
        if (resetToken) {
          sessionStorage.setItem('resetToken', resetToken);
        }

        setSuccessMessage('OTP verified successfully. Redirecting to reset password…');

        // Navigate to /reset-password with token context
        setTimeout(() => {
          navigate('/reset-password', {
            state: { resetToken, email },
          });
        }, 1200);
      } else {
        setFormError('OTP verification could not be completed.');
      }
    } catch (err) {
      if (!err.response) {
        setFormError('Unable to connect to the server. Please try again.');
        setIsVerifying(false);
        return;
      }

      const status = err.response.status;
      const data = err.response.data || {};
      const errorCode = data.error?.code;
      const errorMessage = data.error?.message;

      if (errorCode === 'INVALID_OTP') {
        setFormError(errorMessage || 'The OTP is invalid or has expired.');
      } else if (errorCode === 'OTP_ATTEMPTS_EXCEEDED') {
        setFormError(
          errorMessage ||
            'OTP verification attempts exceeded. Please request a new OTP.'
        );
      } else if (status >= 500) {
        setFormError('An unexpected error occurred. Please try again later.');
      } else {
        setFormError(errorMessage || 'Verification failed. Please try again.');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || isResending || isVerifying) return;

    if (!email) {
      setFormError('No email address found. Please return to Forgot Password.');
      return;
    }

    setIsResending(true);
    setFormError('');
    setSuccessMessage('');

    try {
      // Resend OTP uses POST /api/auth/forgot-password with exact single field payload { email }
      const response = await api.post('/auth/forgot-password', {
        email: email.trim(),
      });

      if (response.status === 200 || response.data?.success) {
        setSuccessMessage(
          response.data?.message ||
            'If this email is registered, an OTP has been sent to your email.'
        );
        // Reset 60-second cooldown
        setCooldown(60);
      } else {
        setFormError('Unable to resend OTP. Please try again.');
      }
    } catch (err) {
      if (!err.response) {
        setFormError('Unable to connect to the server. Please try again.');
        setIsResending(false);
        return;
      }

      const status = err.response.status;
      const data = err.response.data || {};
      const errorCode = data.error?.code;
      const errorMessage = data.error?.message;

      if (status === 429 || errorCode === 'OTP_RATE_LIMITED') {
        setFormError(errorMessage || 'Please wait before requesting another OTP.');
      } else if (status >= 500) {
        setFormError('An unexpected error occurred. Please try again later.');
      } else {
        setFormError(errorMessage || 'Unable to resend OTP. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Header / Branding */}
      <header className="max-w-md w-full mx-auto text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#714B67] bg-opacity-10 text-[#714B67] text-xs font-semibold tracking-wider uppercase mb-3">
          <ShieldCheck className="w-4 h-4 text-[#714B67]" aria-hidden="true" />
          <span>CAMPUS360</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#000000] tracking-tight">
          Skyline Student Association
        </h1>
        <p className="mt-1 text-sm text-[#555555]">
          Unified operating platform for campus leadership & operations
        </p>
      </header>

      {/* Main Card */}
      <main className="max-w-md w-full mx-auto">
        <div className="bg-white border border-[#e2e5e9] shadow-sm rounded-lg p-6 sm:p-8">
          <div className="mb-6 border-b border-[#e2e5e9] pb-4">
            <h2 className="text-xl font-bold text-[#000000] flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#714B67]" aria-hidden="true" />
              Verify your email
            </h2>
            <p className="text-xs sm:text-sm text-[#666666] mt-1">
              Enter the 6-digit verification code sent to{' '}
              <span className="font-semibold text-gray-800">{email || 'your email'}</span>.
            </p>
          </div>

          {/* Success Message Alert */}
          {successMessage && (
            <Alert variant="success" className="mb-6">
              {successMessage}
            </Alert>
          )}

          {/* Error Message Alert */}
          {formError && (
            <Alert variant="error" className="mb-6">
              {formError}
            </Alert>
          )}

          {!email ? (
            <div className="text-center py-4 space-y-4">
              <p className="text-sm text-gray-600">
                No active password recovery session detected. Please enter your email to request an OTP.
              </p>
              <Link
                to="/forgot-password"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#714B67] hover:text-[#5d3d54] hover:underline"
              >
                <ArrowLeft className="w-4 h-4" /> Go to Forgot Password
              </Link>
            </div>
          ) : (
            <form onSubmit={handleVerify} noValidate className="space-y-4">
              {/* 6-Digit OTP Field */}
              <div>
                <Label htmlFor="otp" required className="text-center">
                  6-Digit Verification Code
                </Label>
                <Input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={otp}
                  onChange={handleOtpChange}
                  disabled={isVerifying || isResending}
                  error={!!fieldError}
                  aria-invalid={!!fieldError}
                  aria-describedby={fieldError ? 'otp-error' : undefined}
                  className="text-center tracking-[0.35em] text-xl font-mono font-bold py-2.5 h-12"
                  autoFocus
                  required
                />
                {fieldError && (
                  <p id="otp-error" className="mt-1 text-xs text-[#c0392b] font-medium text-center">
                    {fieldError}
                  </p>
                )}
              </div>

              {/* Submit Verification Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isVerifying}
                  disabled={isVerifying || isResending}
                  className="w-full h-11 text-base font-semibold"
                >
                  {isVerifying ? 'Verifying...' : 'Verify OTP'}
                </Button>
              </div>

              {/* Resend Section */}
              <div className="pt-3 text-center text-sm text-gray-600">
                <span>Didn't receive the code? </span>
                {cooldown > 0 ? (
                  <span className="text-[#8F8F8F] font-medium cursor-not-allowed">
                    Resend OTP in {cooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResending || isVerifying}
                    className="font-medium text-[#714B67] hover:text-[#5d3d54] underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[#714B67] rounded disabled:opacity-50"
                  >
                    {isResending ? 'Sending...' : 'Resend OTP'}
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Back to Forgot Password */}
          <div className="mt-6 pt-4 border-t border-[#e2e5e9] text-center text-sm text-gray-600">
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-1 font-medium text-[#714B67] hover:text-[#5d3d54] underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[#714B67] rounded"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back to Forgot Password
            </Link>
          </div>
        </div>
      </main>

      {/* Footer System Info */}
      <footer className="max-w-md w-full mx-auto text-center mt-6 text-xs text-[#8F8F8F]">
        <p>Odoo × LDCE Hackathon 2026 — Skyline Student Association</p>
      </footer>
    </div>
  );
}
