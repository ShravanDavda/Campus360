import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield } from 'lucide-react';
import { memberService } from '../services/api';
import { Label } from '../components/ui/Label';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({ name: '', phoneNumber: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setFormError('');
      try {
        const response = await memberService.getProfile();
        if (response.data?.success) {
          const data = response.data.data;
          setProfile(data);
          setFormData({
            name: data.name || '',
            phoneNumber: data.phoneNumber || '',
          });
        }
      } catch (err) {
        if (!err.response) {
          setFormError('Unable to connect to the server.');
        } else {
          setFormError(err.response.data?.error?.message || 'Failed to fetch profile details.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (formError) setFormError('');
    if (successMessage) setSuccessMessage('');
  };

  const validate = () => {
    const errors = {};
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      errors.name = 'Name is required.';
    } else if (trimmedName.length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    } else if (trimmedName.length > 100) {
      errors.name = 'Name cannot exceed 100 characters.';
    }

    const trimmedPhone = formData.phoneNumber.trim();
    if (!trimmedPhone) {
      errors.phoneNumber = 'Phone number is required.';
    } else if (!/^\d{10}$/.test(trimmedPhone)) {
      errors.phoneNumber = 'Phone number must contain exactly 10 digits.';
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFieldErrors({});
    setFormError('');
    setSuccessMessage('');

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      // PATCH /api/member/profile with { name, phoneNumber } ONLY
      const payload = {
        name: formData.name.trim(),
        phoneNumber: formData.phoneNumber.trim(),
      };
      const response = await memberService.updateProfile(payload);
      if (response.data?.success) {
        setSuccessMessage('Profile updated successfully.');
        setProfile((prev) => ({ ...prev, ...payload }));
      } else {
        setFormError('Failed to update profile.');
      }
    } catch (err) {
      if (!err.response) {
        setFormError('Unable to connect to the server.');
        setIsSubmitting(false);
        return;
      }
      const data = err.response.data || {};
      const errorCode = data.error?.code;
      const errorMessage = data.error?.message;
      const errorDetails = data.error?.details;

      if (errorCode === 'PHONE_ALREADY_EXISTS') {
        setFieldErrors((prev) => ({
          ...prev,
          phoneNumber: errorMessage || 'An account with this phone number already exists.',
        }));
      } else if (errorCode === 'VALIDATION_ERROR' && errorDetails?.field && errorDetails?.reason) {
        setFieldErrors((prev) => ({
          ...prev,
          [errorDetails.field]: errorDetails.reason,
        }));
      } else {
        setFormError(errorMessage || 'Failed to update profile details.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading member profile..." />;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 sm:p-8 shadow-sm">
        <div className="mb-6 border-b border-[#e2e5e9] pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#000000] flex items-center gap-2">
              <User className="w-6 h-6 text-[#714B67]" aria-hidden="true" />
              Member Profile
            </h1>
            <p className="text-xs sm:text-sm text-[#666666] mt-1">
              Manage your personal information and organization identity.
            </p>
          </div>
          {profile?.role && (
            <Badge variant="purple">{profile.role}</Badge>
          )}
        </div>

        {successMessage && (
          <Alert variant="success" className="mb-6">
            {successMessage}
          </Alert>
        )}

        {formError && (
          <Alert variant="error" className="mb-6">
            {formError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Read-only Member ID */}
          {profile?.id && (
            <div>
              <Label className="text-gray-500">Member ID</Label>
              <div className="h-10 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-500 select-all flex items-center">
                {profile.id}
              </div>
            </div>
          )}

          {/* Editable: Full Name */}
          <div>
            <Label htmlFor="name" required>
              Full Name
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              disabled={isSubmitting}
              error={!!fieldErrors.name}
              placeholder="Your full name"
              required
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-[#c0392b] font-medium">{fieldErrors.name}</p>
            )}
          </div>

          {/* Read-Only: Email Address */}
          <div>
            <Label className="text-gray-600">Email Address (Read-only)</Label>
            <div className="relative">
              <Input
                type="email"
                value={profile?.email || ''}
                disabled
                className="bg-gray-100 text-gray-500 cursor-not-allowed"
              />
              <Mail className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Email addresses cannot be modified directly for security reasons.
            </p>
          </div>

          {/* Editable: Phone Number */}
          <div>
            <Label htmlFor="phoneNumber" required>
              Phone Number
            </Label>
            <div className="relative">
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                disabled={isSubmitting}
                error={!!fieldErrors.phoneNumber}
                placeholder="10-digit phone number"
                required
              />
              <Phone className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
            {fieldErrors.phoneNumber && (
              <p className="mt-1 text-xs text-[#c0392b] font-medium">{fieldErrors.phoneNumber}</p>
            )}
          </div>

          {/* Read-Only: Role */}
          <div>
            <Label className="text-gray-600">Assigned Role (Read-only)</Label>
            <div className="relative">
              <Input
                type="text"
                value={profile?.role || 'Member'}
                disabled
                className="bg-gray-100 text-gray-500 cursor-not-allowed capitalize"
              />
              <Shield className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Role permissions are granted by association administrators.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="w-full sm:w-auto px-6 h-10 font-semibold"
            >
              {isSubmitting ? 'Saving changes...' : 'Save Profile Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
