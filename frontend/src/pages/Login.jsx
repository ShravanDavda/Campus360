import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, LogIn } from 'lucide-react';
import { authService } from '../services/api';
import { Label } from '../components/ui/Label';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

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
    const trimmedEmail = formData.email.trim();

    if (!trimmedEmail) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must contain at least 8 characters.';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError('');
    setFieldErrors({});

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authService.login({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (response.data?.success && response.data?.data?.token) {
        localStorage.setItem('token', response.data.data.token);
        if (response.data.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
        }
        navigate('/dashboard');
      } else {
        setFormError('Login failed. Please verify your credentials.');
      }
    } catch (err) {
      if (!err.response) {
        setFormError('Unable to connect to the server. Please check your connection.');
        return;
      }

      const status = err.response.status;
      const data = err.response.data || {};
      const errorMessage = data.error?.message;
      const errorCode = data.error?.code;

      if (status === 401 || errorCode === 'INVALID_CREDENTIALS') {
        setFormError(errorMessage || 'Invalid email or password.');
      } else if (errorCode === 'ACCOUNT_PENDING') {
        setFormError(errorMessage || 'Your account is pending admin approval.');
      } else if (errorCode === 'ACCOUNT_INACTIVE') {
        setFormError(errorMessage || 'Your account is currently inactive.');
      } else if (errorCode === 'VALIDATION_ERROR') {
        if (data.error?.details?.field) {
          setFieldErrors({
            [data.error.details.field]: data.error.details.reason || errorMessage,
          });
        }
        setFormError(errorMessage || 'Invalid login data.');
      } else if (status >= 500) {
        setFormError('An unexpected server error occurred. Please try again later.');
      } else {
        setFormError(errorMessage || 'Login failed. Please verify your credentials and try again.');
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

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto">
        <div className="bg-white border border-[#e2e5e9] shadow-sm rounded-lg p-6 sm:p-8">
          <div className="mb-6 border-b border-[#e2e5e9] pb-4">
            <h2 className="text-xl font-bold text-[#000000] flex items-center gap-2">
              <LogIn className="w-5 h-5 text-[#714B67]" aria-hidden="true" />
              Sign In
            </h2>
            <p className="text-xs sm:text-sm text-[#666666] mt-1">
              Enter your credentials to access your account.
            </p>
          </div>

          {/* Form-Level Error Alert */}
          {formError && (
            <Alert variant="error" className="mb-4">
              {formError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email Address */}
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
                value={formData.email}
                onChange={handleChange}
                error={Boolean(fieldErrors.email)}
                required
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="password" required className="mb-0">
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-[#714B67] hover:text-[#5d3d54] underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[#714B67] rounded"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  error={Boolean(fieldErrors.password)}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-600 font-medium">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                className="w-full h-11 text-base font-semibold"
              >
                Sign In
              </Button>
            </div>
          </form>

          {/* Registration Link Footer */}
          <div className="mt-6 pt-4 border-t border-[#e2e5e9] text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-[#714B67] hover:text-[#5d3d54] underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[#714B67] rounded"
            >
              Register
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
