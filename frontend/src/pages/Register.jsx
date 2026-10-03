import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, UserPlus } from 'lucide-react';
import api from '../services/api';
import { Label } from '../components/ui/Label';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

// Publicly registrable roles allowed by the system API contract
const ALLOWED_ROLES = [
  { value: 'MEMBER', label: 'Member' },
  { value: 'EVENT_ORGANIZER', label: 'Event Organizer' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
  { value: 'TREASURER', label: 'Treasurer' },
];

export default function Register() {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: '',
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Handle field change and clear error for that field
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

  // Client-side validation before sending request
  const validateForm = () => {
    const errors = {};

    // Full Name
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required.';
    }

    // Email
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Enter a valid email address.';
      }
    }

    // Phone
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required.';
    }

    // Password
    if (!formData.password) {
      errors.password = 'Password is required.';
    }

    // Confirm Password (frontend-only check)
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Confirm password is required.';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    // Role
    if (!formData.role) {
      errors.role = 'Please select a role.';
    } else if (!ALLOWED_ROLES.some((r) => r.value === formData.role)) {
      errors.role = 'Selected role is invalid.';
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent duplicate submissions while in progress or already succeeded
    if (isSubmitting || isSuccess) {
      return;
    }

    setFormError('');
    setFieldErrors({});

    // Client-side validation check
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    // Normalize payload according to specification
    // NOTE: confirmPassword is intentionally excluded
    const payload = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      password: formData.password,
      role: formData.role,
    };

    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/register', payload);

      if (response.status === 201 || response.data?.success) {
        setIsSuccess(true);
        setFormError('');
        setFieldErrors({});

        // Redirect to login after brief confirmation
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        setFormError('Account creation could not be completed. Please try again.');
      }
    } catch (err) {
      if (!err.response) {
        // Network or connection failure
        setFormError('Unable to connect to the server. Please check your connection and try again.');
        setIsSubmitting(false);
        return;
      }

      const status = err.response.status;
      const data = err.response.data || {};
      const errorCode = data.error?.code;
      const errorMessage = data.error?.message;

      if (errorCode === 'EMAIL_ALREADY_EXISTS') {
        setFieldErrors((prev) => ({
          ...prev,
          email: 'An account with this email already exists.',
        }));
      } else if (errorCode === 'PHONE_ALREADY_EXISTS') {
        setFieldErrors((prev) => ({
          ...prev,
          phone: errorMessage || 'An account with this phone number already exists.',
        }));
      } else if (errorCode === 'ROLE_NOT_ALLOWED' || status === 403) {
        setFormError(errorMessage || 'Admin accounts cannot be created through public registration.');
      } else if (errorCode === 'INVALID_ROLE') {
        setFieldErrors((prev) => ({
          ...prev,
          role: errorMessage || 'A valid registration role is required.',
        }));
      } else if (errorCode === 'WEAK_PASSWORD') {
        setFieldErrors((prev) => ({
          ...prev,
          password: errorMessage || 'Password does not meet the required policy.',
        }));
      } else if (errorCode === 'VALIDATION_ERROR' && data.error?.fields) {
        setFieldErrors(data.error.fields);
        setFormError(errorMessage || 'Please correct the highlighted fields.');
      } else if (status >= 500) {
        setFormError('Something went wrong while creating the account. Please try again.');
      } else {
        setFormError(errorMessage || 'Registration failed. Please verify your details and try again.');
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
          <span>Student Organization System</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#000000] tracking-tight">
          Skyline Student Association
        </h1>
        <p className="mt-1 text-sm text-[#555555]">
          Unified operating platform for campus leadership & operations
        </p>
      </header>

      {/* Main Registration Card */}
      <main className="max-w-md w-full mx-auto">
        <div className="bg-white border border-[#e2e5e9] shadow-sm rounded-lg p-6 sm:p-8">
          <div className="mb-6 border-b border-[#e2e5e9] pb-4">
            <h2 className="text-xl font-bold text-[#000000] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#714B67]" aria-hidden="true" />
              Create an Account
            </h2>
            <p className="text-xs sm:text-sm text-[#666666] mt-1">
              Enter your details to register as an organization member or leader.
            </p>
          </div>

          {/* Form-Level Success Alert */}
          {isSuccess && (
            <Alert variant="success" className="mb-6">
              Account created successfully. Redirecting to login…
            </Alert>
          )}

          {/* Form-Level Error Alert */}
          {formError && !isSuccess && (
            <Alert variant="error" className="mb-6">
              {formError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Full Name */}
            <div>
              <Label htmlFor="fullName" required>
                Full Name
              </Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="e.g. Shravan Patel"
                value={formData.fullName}
                onChange={handleChange}
                disabled={isSubmitting || isSuccess}
                error={!!fieldErrors.fullName}
                aria-invalid={!!fieldErrors.fullName}
                aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
              />
              {fieldErrors.fullName && (
                <p id="fullName-error" className="mt-1 text-xs text-[#c0392b] font-medium">
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

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
                placeholder="e.g. shravan@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting || isSuccess}
                error={!!fieldErrors.email}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
              />
              {fieldErrors.email && (
                <p id="email-error" className="mt-1 text-xs text-[#c0392b] font-medium">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <Label htmlFor="phone" required>
                Phone Number
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="e.g. +919876543210"
                value={formData.phone}
                onChange={handleChange}
                disabled={isSubmitting || isSuccess}
                error={!!fieldErrors.phone}
                aria-invalid={!!fieldErrors.phone}
                aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
              />
              {fieldErrors.phone && (
                <p id="phone-error" className="mt-1 text-xs text-[#c0392b] font-medium">
                  {fieldErrors.phone}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" required>
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Enter a secure password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSubmitting || isSuccess}
                  error={!!fieldErrors.password}
                  className="pr-10"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
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
                <p id="password-error" className="mt-1 text-xs text-[#c0392b] font-medium">
                  {fieldErrors.password}
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
                  placeholder="Re-enter password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isSubmitting || isSuccess}
                  error={!!fieldErrors.confirmPassword}
                  className="pr-10"
                  aria-invalid={!!fieldErrors.confirmPassword}
                  aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
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

            {/* Role Select */}
            <div>
              <Label htmlFor="role" required>
                Role
              </Label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                disabled={isSubmitting || isSuccess}
                aria-invalid={!!fieldErrors.role}
                aria-describedby={fieldErrors.role ? "role-error" : undefined}
                className={`flex h-10 w-full rounded border bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:outline-none focus:ring-1 focus:ring-[#714B67] focus:border-[#714B67] disabled:cursor-not-allowed disabled:bg-gray-100 ${
                  fieldErrors.role
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <option value="">Select your role</option>
                {ALLOWED_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {fieldErrors.role && (
                <p id="role-error" className="mt-1 text-xs text-[#c0392b] font-medium">
                  {fieldErrors.role}
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
                {isSubmitting ? 'Creating account…' : 'Create Account'}
              </Button>
            </div>
          </form>

          {/* Existing Account Footer */}
          <div className="mt-6 pt-4 border-t border-[#e2e5e9] text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-[#714B67] hover:text-[#5d3d54] underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-[#714B67] rounded"
            >
              Sign in
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
