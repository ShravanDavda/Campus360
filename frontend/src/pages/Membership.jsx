import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, CheckCircle2 } from 'lucide-react';
import { memberService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export default function Membership() {
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchMembership() {
      setLoading(true);
      setError('');
      try {
        const response = await memberService.getMembership();
        if (response.data?.success) {
          setMembership(response.data.data);
        } else {
          setError('Unable to load membership details.');
        }
      } catch (err) {
        if (!err.response) {
          setError('Unable to connect to the server.');
        } else {
          setError(err.response.data?.error?.message || 'Failed to fetch membership record.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchMembership();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading membership record..." />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 sm:p-8 shadow-sm">
        <div className="mb-6 border-b border-[#e2e5e9] pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#000000] flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-[#714B67]" aria-hidden="true" />
              Membership Overview
            </h1>
            <p className="text-xs sm:text-sm text-[#666666] mt-1">
              Official membership standing with LDCE Student Association.
            </p>
          </div>
          {membership?.status && <Badge>{membership.status}</Badge>}
        </div>

        {error && <Alert variant="error" className="mb-6">{error}</Alert>}

        {membership ? (
          <div className="space-y-6">
            {/* Membership ID and Status banner */}
            <div className="bg-[#F8F9FA] border border-[#e2e5e9] rounded-lg p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Membership ID
                </span>
                <p className="text-sm font-mono font-semibold text-gray-900 mt-0.5">
                  {membership.membershipId || 'Not assigned'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Status:</span>
                <Badge>{membership.status || 'PENDING'}</Badge>
              </div>
            </div>

            {/* Read-only Data Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border border-[#e2e5e9] rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase mb-1">
                  <Calendar className="w-4 h-4 text-[#714B67]" />
                  <span>Start Date</span>
                </div>
                <p className="text-base font-semibold text-gray-900">
                  {membership.startDate || '—'}
                </p>
              </div>

              <div className="p-4 border border-[#e2e5e9] rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase mb-1">
                  <Calendar className="w-4 h-4 text-[#714B67]" />
                  <span>Expiry Date</span>
                </div>
                <p className="text-base font-semibold text-gray-900">
                  {membership.expiryDate || '—'}
                </p>
              </div>

              <div className="p-4 border border-[#e2e5e9] rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase mb-1">
                  <CreditCard className="w-4 h-4 text-[#017E84]" />
                  <span>Annual Dues</span>
                </div>
                <p className="text-base font-semibold text-gray-900">
                  {membership.duesAmount !== undefined ? `₹${membership.duesAmount}` : '—'}
                </p>
              </div>

              <div className="p-4 border border-[#e2e5e9] rounded-lg">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase mb-1">
                  <CheckCircle2 className="w-4 h-4 text-[#017E84]" />
                  <span>Payment Status</span>
                </div>
                <div className="mt-1">
                  <Badge variant="teal">{membership.paymentStatus || 'PAID'}</Badge>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
              <p className="font-semibold text-gray-700 mb-1">Membership Terms & Standing</p>
              <p>
                Membership status and validation records are managed exclusively by organization
                administrators and treasurers. Dues and renewals are tracked automatically in accordance
                with association bylaws.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-gray-500">
            No active membership record found for your account.
          </div>
        )}
      </div>
    </div>
  );
}
