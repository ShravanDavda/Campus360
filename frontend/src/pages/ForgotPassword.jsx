import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, KeyRound } from 'lucide-react';
import api from '../services/api';
import { Label } from '../components/ui/Label';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (fieldError) setFieldError('');
    if (formError) setFormError('');
  };

  const validate = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      return 'Email address is required.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return 'Enter a valid email address.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting || isSuccess) return;

    setFieldError('');
    setFormError('');

    const error = validate();
    if (error) {
      setFieldError(error);
      return;
    }

    const trimmedEmail = email.trim();
    setIsSubmitting(true);

    try {
      // POST /api/auth/forgot-password with exact single field payload { email }
      const response = await api.post('/auth/forgot-password', {
        email: trimmedEmail,
      });

      if (response.status === 200 || response.data?.success) {
        setIsSuccess(true);
        const msg =
          response.data?.message ||
          'If this email is registered, an OTP has been sent to your email.';
        setSuccessMessage(msg);

        // Preserve email in navigation state for /verify-otp
        setTimeout(() => {
          navigate('/verify-otp', {
            state: { email: trimmedEmail },
          });
        }, 1500);
      } else {
        setFormError('Unable to process password reset request. Please try again.');
      }
    } catch (err) {
      if (!err.response) {
        setFormError('Unable to connect to the server. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const status = err.response.status;
      const data = err.response.data || {};
      const errorCode = data.error?.code;
      const errorMessage = data.error?.message;
      const errorDetails = data.error?.details;

      if (status === 400 && errorCode === 'VALIDATION_ERROR') {
        if (errorDetails?.field === 'email' && errorDetails?.reason) {
          setFieldError(errorDetails.reason);
        } else {
          setFormError(errorMessage || 'Please enter a valid email address.');
        }
      } else if (status === 429 || errorCode === 'OTP_RATE_LIMITED') {
        setFormError(
          errorMessage || 'Please wait before requesting another OTP.'
        );
      } else if (status >= 500) {
        setFormError(
          'An unexpected error occurred. Please try again later.'
        );
      } else {
        setFormError(
          errorMessage || 'Request could not be processed. Please try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
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

      {/* Main Forgot Password Card */}
      <main className="max-w-md w-full mx-auto">
        <div className="bg-white border border-[#e2e5e9] shadow-sm rounded-lg p-6 sm:p-8">
          <div className="mb-6 border-b border-[#e2e5e9] pb-4">
            <h2 className="text-xl font-bold text-[#000000] flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#714B67]" aria-hidden="true" />
              Forgot Password
            </h2>
            <p className="text-xs sm:text-sm text-[#666666] mt-1">
              Enter your email address and we'll send you an OTP if the email is registered.
            </p>
          </div>

          {/* Success Message Alert */}
          {isSuccess && (
            <Alert variant="success" className="mb-6">
              {successMessage}
            </Alert>
          )}

          {/* Form-Level Error Alert */}
          {formError && !isSuccess && (
            <Alert variant="error" className="mb-6">
              {formError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email Field */}
            <div>
              <Label htmlFor="email" required>
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="e.g. maanas@gmail.com"
                value={email}
                onChange={handleChange}
                disabled={isSubmitting || isSuccess}
                error={!!fieldError}
                aria-invalid={!!fieldError}
                aria-describedby={fieldError ? 'email-error' : undefined}
                required
              />
              {fieldError && (
                <p id="email-error" className="mt-1 text-xs text-[#c0392b] font-medium">
                  {fieldError}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting || isSuccess}
                className="w-full h-11 text-base font-semibold"
              >
                {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
              </Button>
            </div>
          </form>

          {/* Back to Login Link */}
          <div className="mt-6 pt-4 border-t border-[#e2e5e9] text-center text-sm text-gray-600">
            Remember your password?{' '}
            <Link
              to="/login"
              className="font-medium text-[#714B67] hover:text-[#5d3d54] underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[#714B67] rounded"
            >
              Back to Login
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
