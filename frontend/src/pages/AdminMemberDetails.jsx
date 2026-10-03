import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shield,
  CreditCard,
  Calendar,
  Check,
} from 'lucide-react';
import { adminService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const formatRole = (role) => {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'eventOrganizer':
      return 'Event Organizer';
    case 'volunteer':
      return 'Volunteer';
    case 'treasurer':
      return 'Treasurer';
    default:
      return role || '—';
  }
};

const getStatusBadge = (status) => {
  const norm = String(status || '').toLowerCase();
  if (norm === 'active') {
    return <Badge variant="teal">Active</Badge>;
  }
  if (norm === 'pending') {
    return <Badge variant="gold">Pending</Badge>;
  }
  return <Badge variant="gray">{status || '—'}</Badge>;
};

export default function AdminMemberDetails() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [member, setMember] = useState(null);
  const [error, setError] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role && user.role !== 'admin') {
        return '403: Administrator privileges required to view member details.';
      }
    } catch {
      // proceed
    }
    return '';
  });
  const [loading, setLoading] = useState(() => !error);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    if (error) {
      return;
    }

    async function fetchMemberDetails() {
      setLoading(true);
      setError('');
      try {
        const response = await adminService.getAdminMember(userId);
        if (response.data?.success && response.data?.data) {
          setMember(response.data.data);
        } else {
          setError('Member record not found.');
        }
      } catch (err) {
        if (!err.response) {
          setError('Unable to connect to the server. Please check your network.');
        } else if (err.response.status === 401) {
          navigate('/login');
        } else if (err.response.status === 403) {
          setError('Permission Denied: You do not have permission to view this member.');
        } else if (err.response.status === 404) {
          setError('Member not found.');
        } else {
          setError(err.response.data?.error?.message || 'Failed to retrieve member details.');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchMemberDetails();
  }, [userId, navigate, error]);

  const handleActivate = async () => {
    if (isActivating || !member) return;

    setActionError('');
    setActionSuccess('');
    setIsActivating(true);

    try {
      const response = await adminService.updateAdminMemberStatus(member.id, {
        status: 'active',
      });

      if (response.data?.success) {
        setActionSuccess(response.data.message || 'Member account activated.');
        setMember((prev) => ({
          ...prev,
          status: 'active',
        }));
      } else {
        setActionError('Failed to activate member.');
      }
    } catch (err) {
      if (!err.response) {
        setActionError('Network error. Unable to activate member.');
        return;
      }

      const status = err.response.status;
      const data = err.response.data || {};
      const errorCode = data.error?.code;
      const errorMsg = data.error?.message;

      if (status === 409 || errorCode === 'INVALID_STATUS_TRANSITION') {
        setActionError(errorMsg || 'Invalid status transition. The member may already be active.');
        // Refresh member details
        try {
          const refreshed = await adminService.getAdminMember(member.id);
          if (refreshed.data?.success && refreshed.data?.data) {
            setMember(refreshed.data.data);
          }
        } catch {
          // ignore
        }
      } else if (status === 404 || errorCode === 'MEMBER_NOT_FOUND') {
        setActionError(errorMsg || 'Member not found.');
      } else if (status === 400 || errorCode === 'VALIDATION_ERROR') {
        setActionError(errorMsg || 'Validation error while activating member.');
      } else if (status === 401) {
        navigate('/login');
      } else if (status === 403) {
        setActionError('Permission Denied: You do not have permission to activate members.');
      } else {
        setActionError(errorMsg || 'Server error occurred while activating member.');
      }
    } finally {
      setIsActivating(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving member profile..." />;
  }

  if (error || !member) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Alert variant="error">{error || 'Member not found.'}</Alert>
        <Link
          to="/admin/members"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#714B67] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Member Management
        </Link>
      </div>
    );
  }

  const { membership } = member;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        to="/admin/members"
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#714B67] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Member Management
      </Link>

      {/* Action Feedback Alerts */}
      {actionSuccess && (
        <Alert variant="success" title="Success">
          {actionSuccess}
        </Alert>
      )}

      {actionError && (
        <Alert variant="error" title="Error">
          {actionError}
        </Alert>
      )}

      {/* Member Header Card */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#714B67]/10 flex items-center justify-center text-[#714B67] shrink-0 font-bold text-lg">
            {member.fullName?.charAt(0)?.toUpperCase() || 'M'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#000000]">{member.fullName}</h1>
              {getStatusBadge(member.status)}
            </div>
            <p className="text-xs sm:text-sm text-[#555555] mt-0.5">
              Role: <span className="font-medium text-gray-900">{formatRole(member.role)}</span>
            </p>
          </div>
        </div>

        {/* Action Button for Pending Member */}
        {member.status?.toLowerCase() === 'pending' && (
          <Button
            type="button"
            variant="primary"
            onClick={handleActivate}
            isLoading={isActivating}
            disabled={isActivating}
            className="w-full sm:w-auto"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Activate Member
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <section className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm space-y-4">
          <div className="border-b border-[#e2e5e9] pb-3">
            <h2 className="text-base font-bold text-[#000000] flex items-center gap-2">
              <User className="w-4 h-4 text-[#714B67]" aria-hidden="true" />
              Personal Information
            </h2>
          </div>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-gray-500 font-medium">Full Name</dt>
              <dd className="text-sm font-semibold text-gray-900 mt-0.5">{member.fullName || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 font-medium">Email Address</dt>
              <dd className="text-sm font-semibold text-gray-900 mt-0.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                {member.email || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 font-medium">Phone Number</dt>
              <dd className="text-sm font-semibold text-gray-900 mt-0.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                {member.phoneNumber || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 font-medium">System Role</dt>
              <dd className="text-sm font-semibold text-gray-900 mt-0.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-gray-400" />
                {formatRole(member.role)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 font-medium">Account Status</dt>
              <dd className="mt-1">{getStatusBadge(member.status)}</dd>
            </div>
          </dl>
        </section>

        {/* Membership Information */}
        <section className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm space-y-4">
          <div className="border-b border-[#e2e5e9] pb-3">
            <h2 className="text-base font-bold text-[#000000] flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#017E84]" aria-hidden="true" />
              Membership Details
            </h2>
          </div>

          {membership ? (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500 font-medium">Membership ID</dt>
                <dd className="text-xs font-mono font-semibold text-gray-800 mt-0.5 select-all">
                  {membership.membershipId || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 font-medium">Membership Status</dt>
                <dd className="mt-1">
                  {membership.status ? (
                    <Badge variant={membership.status === 'ACTIVE' ? 'teal' : 'gray'}>
                      {membership.status}
                    </Badge>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 font-medium">Start Date</dt>
                <dd className="text-sm font-semibold text-gray-900 mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {membership.startDate || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 font-medium">Expiry Date</dt>
                <dd className="text-sm font-semibold text-gray-900 mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {membership.expiryDate || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 font-medium">Dues Amount</dt>
                <dd className="text-sm font-semibold text-gray-900 mt-0.5">
                  {membership.duesAmount != null ? `₹${membership.duesAmount}` : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 font-medium">Payment Status</dt>
                <dd className="mt-1">
                  {membership.paymentStatus ? (
                    <Badge variant={membership.paymentStatus === 'PAID' ? 'teal' : 'gold'}>
                      {membership.paymentStatus}
                    </Badge>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="py-6 text-center text-sm text-gray-500">
              No formal membership record attached to this account.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
