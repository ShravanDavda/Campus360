import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { memberService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export default function Membership() {
  const [membership, setMembership] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showRenewalPlans, setShowRenewalPlans] = useState(false);

  const fetchMembership = async () => {
    setLoading(true);
    setError('');
    try {
      const [memRes, plansRes] = await Promise.allSettled([
        memberService.getMembership(),
        memberService.getMembershipPlans(),
      ]);

      if (plansRes.status === 'fulfilled' && plansRes.value.data?.success) {
        const fetchedPlans = plansRes.value.data.data.plans || [];
        setPlans(fetchedPlans);
        if (fetchedPlans.length > 0 && !selectedPlanId) {
          // Default to annual or first active plan
          const defaultPlan = fetchedPlans.find((p) => p.code === 'ANNUAL') || fetchedPlans[0];
          setSelectedPlanId(defaultPlan.id);
        }
      }

      if (memRes.status === 'fulfilled' && memRes.value.data?.success) {
        setMembership(memRes.value.data.data);
      } else if (memRes.status === 'rejected' && memRes.reason?.response?.status === 404) {
        setMembership(null);
      } else if (memRes.status === 'rejected') {
        setError(memRes.reason?.response?.data?.error?.message || 'Failed to fetch membership record.');
      }
    } catch {
      setError('Unable to load membership details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembership();
  }, []);

  const handlePay = async () => {
    if (!selectedPlanId) {
      setError('Please select a membership plan.');
      return;
    }

    setActionLoading(true);
    setError('');
    setActionSuccess('');
    try {
      // Backend authoritatively verifies student, validates active plan, calculates duration and price,
      // and records payment + immediately sets membership status to ACTIVE.
      const res = await memberService.payMembershipDues({ planId: selectedPlanId });
      if (res.data?.success) {
        const updated = res.data.data?.membership || res.data.data;
        setMembership(updated);
        setActionSuccess('Membership Activated');
        setShowRenewalPlans(false);
      } else {
        setError('Membership was not activated. Try again.');
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || 'Membership was not activated. Try again.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading membership record..." />;
  }

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const renderPlanSelection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-gray-900 text-left">Available Plans</h4>
        {selectedPlan && (
          <span className="text-xs text-[#714B67] font-semibold">
            Selected: {selectedPlan.name} (₹{Number(selectedPlan.price).toFixed(2)})
          </span>
        )}
      </div>
      {plans.length === 0 ? (
        <p className="text-xs text-gray-500">Loading available plans...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {plans.map((p) => {
            const isSelected = selectedPlanId === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setSelectedPlanId(p.id)}
                className={`cursor-pointer rounded-lg border-2 p-4 text-left transition-all ${
                  isSelected
                    ? 'border-[#714B67] bg-[#714B67]/5 shadow-sm ring-1 ring-[#714B67]'
                    : 'border-[#e2e5e9] bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-gray-900">{p.name}</span>
                  <input
                    type="radio"
                    name="membershipPlan"
                    checked={isSelected}
                    onChange={() => setSelectedPlanId(p.id)}
                    className="text-[#714B67] focus:ring-[#714B67]"
                  />
                </div>
                <div className="text-lg font-bold text-[#714B67]">
                  ₹{Number(p.price).toFixed(2)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Duration: {p.durationMonths} {p.durationMonths === 1 ? 'calendar month' : 'calendar months'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 sm:p-8 shadow-sm">
        <div className="mb-6 border-b border-[#e2e5e9] pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#000000] flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-[#714B67]" aria-hidden="true" />
              Membership Standing
            </h1>
            <p className="text-xs sm:text-sm text-[#666666] mt-1">
              Official membership standing with LDCE Student Association.
            </p>
          </div>
          {membership?.status && (
            <Badge
              variant={
                membership.status === 'ACTIVE'
                  ? 'teal'
                  : 'destructive'
              }
            >
              {membership.status === 'ACTIVE' ? 'ACTIVE' : membership.status}
            </Badge>
          )}
        </div>

        {error && <Alert variant="error" className="mb-6">{error}</Alert>}
        {actionSuccess && <Alert variant="success" className="mb-6">{actionSuccess}</Alert>}

        {/* STATE 1: NO MEMBERSHIP */}
        {!membership && (
          <div className="space-y-6">
            <div className="p-6 bg-[#F8F9FA] border border-[#e2e5e9] rounded-lg text-center space-y-6">
              <div className="w-12 h-12 bg-[#714B67]/10 text-[#714B67] rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-gray-900">
                  Choose a Membership Plan
                </h3>
                <p className="text-xs text-gray-600">
                  Select a plan below to activate your LDCE Student Association membership immediately. Unlock member-tier discounts on event tickets and merchandise.
                </p>
              </div>

              {renderPlanSelection()}

              <div className="pt-2">
                <Button
                  onClick={handlePay}
                  disabled={actionLoading || !selectedPlanId}
                  className="bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs px-8 py-2.5 shadow-sm"
                >
                  {actionLoading ? 'Processing...' : `Pay ₹${Number(selectedPlan?.price || 0).toFixed(2)}`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STATE 2: ACTIVE MEMBERSHIP */}
        {membership && membership.status === 'ACTIVE' && (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-emerald-900">Membership Active</h3>
                <p className="text-xs text-emerald-700 mt-0.5">
                  You are an active member in good standing with LDCE Student Association. Member-tier event ticket discounts are active at checkout.
                </p>
              </div>
            </div>

            {/* Authoritative Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border border-[#e2e5e9] rounded-lg bg-gray-50/50">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase mb-1">
                  <CreditCard className="w-4 h-4 text-[#714B67]" />
                  <span>Current Plan</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {membership.planName || 'Selected Plan'} {membership.durationMonths ? `(${membership.durationMonths} months)` : ''}
                </p>
              </div>

              <div className="p-4 border border-[#e2e5e9] rounded-lg bg-gray-50/50">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase mb-1">
                  <CheckCircle2 className="w-4 h-4 text-[#017E84]" />
                  <span>Price Paid</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  ₹{Number(membership.duesAmount || 0).toFixed(2)}
                </p>
              </div>

              <div className="p-4 border border-[#e2e5e9] rounded-lg bg-gray-50/50">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase mb-1">
                  <Calendar className="w-4 h-4 text-[#714B67]" />
                  <span>Start Date</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDate(membership.startDate)}
                </p>
              </div>

              <div className="p-4 border border-[#e2e5e9] rounded-lg bg-gray-50/50">
                <div className="flex items-center gap-2 text-gray-500 text-xs font-medium uppercase mb-1">
                  <Calendar className="w-4 h-4 text-[#714B67]" />
                  <span>Expiry Date</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDate(membership.expiryDate)}
                </p>
              </div>
            </div>

            {/* Optional Renewal / Change Plan Toggle */}
            <div className="pt-2 border-t border-[#e2e5e9]">
              {!showRenewalPlans ? (
                <Button
                  variant="outline"
                  onClick={() => setShowRenewalPlans(true)}
                  className="text-xs text-[#714B67] border-[#714B67]/30 hover:bg-[#714B67]/5 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Renew or Extend Membership</span>
                </Button>
              ) : (
                <div className="p-5 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                      Select Plan to Extend Term
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowRenewalPlans(false)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                  {renderPlanSelection()}
                  <div className="pt-2">
                    <Button
                      onClick={handlePay}
                      disabled={actionLoading || !selectedPlanId}
                      className="bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs px-6 py-2"
                    >
                      {actionLoading ? 'Processing...' : `Pay ₹${Number(selectedPlan?.price || 0).toFixed(2)}`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STATE 3: EXPIRED MEMBERSHIP */}
        {membership && membership.status === 'EXPIRED' && (
          <div className="space-y-6">
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-lg space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-gray-900">Membership Expired</h3>
                  <p className="text-xs text-gray-700">
                    Your previous membership term expired on {formatDate(membership.expiryDate)}. Renew membership below to reactivate member benefits immediately upon payment.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3">
                  Renew Membership
                </h4>
                {renderPlanSelection()}
              </div>

              <div className="pt-2">
                <Button
                  onClick={handlePay}
                  disabled={actionLoading || !selectedPlanId}
                  className="bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs px-6 py-2.5 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Processing...' : `Pay ₹${Number(selectedPlan?.price || 0).toFixed(2)}`}</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Policy Info */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500">
          <p className="font-semibold text-gray-700 mb-1">Membership Terms & Standing</p>
          <p>
            Memberships are auto-activated instantly upon payment. Membership duration is calendar-aware (+1, +3, or +12 months). Dues payments are tracked authoritatively in accordance with LDCE Student Association bylaws.
          </p>
        </div>
      </div>
    </div>
  );
}
