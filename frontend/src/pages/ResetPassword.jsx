import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { Label } from '../components/ui/Label';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve temporary single-use reset token from navigation state or sessionStorage
  const [resetToken] = useState(() => {
    return location.state?.resetToken || sessionStorage.getItem('resetToken') || '';
  });

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isTokenInvalid, setIsTokenInvalid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }

    if (formError) {
      setFormError('');
    }
  };

  const validateForm = () => {
    const errors = {};

    // newPassword: required, min 8 characters, no max limit
    if (!formData.newPassword) {
      errors.newPassword = 'New password is required.';
    } else if (formData.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters.';
    }

    // confirmPassword: required, must equal newPassword (frontend-only check)
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirm password is required.';
    } else if (formData.newPassword !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting || isSuccess) return;

    setFieldErrors({});
    setFormError('');

    // If reset token is missing from session/state
    if (!resetToken) {
      setIsTokenInvalid(true);
      setFormError(
        'Password reset authorization is unavailable or has expired. Please start the password recovery process again.'
      );
      return;
    }

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      // POST /api/auth/reset-password
      // Headers: Authorization: Bearer <resetToken>
      // Body: { newPassword } ONLY
      // confirmPassword is strictly frontend-only and never sent
      const response = await api.post(
        '/auth/reset-password',
        {
          newPassword: formData.newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${resetToken}`,
          },
        }
      );

      if (response.status === 200 || response.data?.success) {
        setIsSuccess(true);
        // Clear temporary reset token after single use
        sessionStorage.removeItem('resetToken');
        sessionStorage.removeItem('resetEmail');

        setSuccessMessage(
          response.data?.message || 'Password reset successfully.'
        );

        // Redirect to /login after brief confirmation
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        setFormError('Password reset could not be completed. Please try again.');
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

      if (status === 401 || errorCode === 'INVALID_RESET_TOKEN') {
        setIsTokenInvalid(true);
        sessionStorage.removeItem('resetToken');
        setFormError(
          errorMessage ||
            'Password reset authorization is invalid or has expired. Please start the password recovery process again.'
        );
      } else if (status === 400 && errorCode === 'VALIDATION_ERROR') {
        if (errorDetails?.field === 'newPassword' && errorDetails?.reason) {
          setFieldErrors((prev) => ({
            ...prev,
            newPassword: errorDetails.reason,
          }));
        } else {
          setFormError(errorMessage || 'Invalid password.');
        }
      } else if (status >= 500) {
        setFormError('An unexpected error occurred. Please try again later.');
      } else {
        setFormError(errorMessage || 'Password reset failed. Please try again.');
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
          LDCE Student Association
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
              Reset Password
            </h2>
            <p className="text-xs sm:text-sm text-[#666666] mt-1">
              Enter a new password for your account.
            </p>
          </div>

          {/* Success Message Alert */}
          {isSuccess && (
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

          {/* Missing or invalid reset token state */}
          {!resetToken || isTokenInvalid ? (
            <div className="text-center py-4 space-y-4">
              <p className="text-sm text-gray-600">
                Password reset authorization is unavailable or has expired. Please verify your identity again to continue.
              </p>
              <div>
                <Link
                  to="/forgot-password"
                  className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-semibold rounded bg-[#714B67] text-white hover:bg-[#5d3d54] transition-colors"
                >
                  Start password recovery again
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* New Password */}
              <div>
                <Label htmlFor="newPassword" required>
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Enter a new password (min. 8 characters)"
                    value={formData.newPassword}
                    onChange={handleChange}
                    disabled={isSubmitting || isSuccess}
                    error={!!fieldErrors.newPassword}
                    className="pr-10"
                    aria-invalid={!!fieldErrors.newPassword}
                    aria-describedby={fieldErrors.newPassword ? 'newPassword-error' : undefined}
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {fieldErrors.newPassword && (
                  <p id="newPassword-error" className="mt-1 text-xs text-[#c0392b] font-medium">
                    {fieldErrors.newPassword}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <Label htmlFor="confirmPassword" required>
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Re-enter your new password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={isSubmitting || isSuccess}
                    error={!!fieldErrors.confirmPassword}
                    className="pr-10"
                    aria-invalid={!!fieldErrors.confirmPassword}
                    aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    tabIndex={0}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p id="confirmPassword-error" className="mt-1 text-xs text-[#c0392b] font-medium">
                    {fieldErrors.confirmPassword}
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
                  {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
                </Button>
              </div>
            </form>
          )}

          {/* Footer Back to Login Link */}
          <div className="mt-6 pt-4 border-t border-[#e2e5e9] text-center text-sm text-gray-600">
            Remembered your password?{' '}
            <Link
              to="/login"
              className="inline-flex items-center gap-1 font-medium text-[#714B67] hover:text-[#5d3d54] underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[#714B67] rounded"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Back to Login
            </Link>
          </div>
        </div>
      </main>

      {/* Footer System Info */}
      <footer className="max-w-md w-full mx-auto text-center mt-6 text-xs text-[#8F8F8F]">
        <p>Odoo × LDCE Hackathon 2026 — LDCE Student Association</p>
      </footer>
    </div>
  );
}
