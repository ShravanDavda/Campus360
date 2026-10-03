import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  RotateCw,
  ShieldCheck,
  Building2,
  Receipt,
  CreditCard,
  ArrowRight,
  Landmark,
  FileSpreadsheet,
} from 'lucide-react';
import { treasurerService } from '../services/api';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

const formatCurrency = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

function TreasurerDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading treasurer dashboard">
      {/* Top Banner Skeleton */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-8 bg-gray-300 rounded w-72"></div>
          <div className="h-4 bg-gray-100 rounded w-96 max-w-full"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-32"></div>
      </div>

      {/* Financial KPI Cards Skeleton (3 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-[#e2e5e9] rounded-lg p-6 h-36 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-6 w-6 bg-gray-200 rounded"></div>
            </div>
            <div className="h-9 bg-gray-300 rounded w-36"></div>
            <div className="h-3 bg-gray-100 rounded w-48"></div>
          </div>
        ))}
      </div>

      {/* Operational Information Skeleton */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 space-y-4">
        <div className="h-6 bg-gray-200 rounded w-48"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TreasurerDashboard() {
  const navigate = useNavigate();

  // Role notice for non-treasurer users
  const [roleNotice] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role && user.role !== 'treasurer' && user.role !== 'admin') {
        return `Notice: You are currently signed in as "${user.role}". The Treasurer Dashboard is designated for the treasurer role.`;
      }
    } catch {
      // Backend remains authoritative
    }
    return '';
  });

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const response = await treasurerService.getDashboard();
      if (response.data?.success && response.data?.data) {
        setDashboardData(response.data.data);
      } else {
        setError('Failed to load treasurer dashboard data.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('401 Unauthorized: Session expired. Please sign in again.');
      } else if (err.response?.status === 403) {
        setError('403 Forbidden: Treasurer privileges required to access this dashboard.');
      } else if (err.response?.status === 404) {
        setError('Treasurer dashboard endpoint is not yet mounted on the server.');
      } else if (!err.response) {
        setError('Unable to connect to the server. Please check your network connection.');
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to load financial dashboard. Please retry.';
        setError(msg);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(false);
  }, [fetchDashboard]);

  const handleRefresh = () => {
    fetchDashboard(true);
  };

  // Authoritative financial totals directly from backend (No frontend math)
  const totalIncome = dashboardData?.totalIncome !== undefined ? dashboardData.totalIncome : 0;
  const totalExpenses = dashboardData?.totalExpenses !== undefined ? dashboardData.totalExpenses : 0;
  const balance = dashboardData?.balance !== undefined ? dashboardData.balance : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner / Treasurer Command Center Header */}
      <div className="bg-white border-2 border-[#714B67]/20 rounded-lg p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#714B67] text-white text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-white" aria-hidden="true" />
              TREASURER COMMAND CENTER
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#017E84]/10 text-[#017E84] text-xs font-semibold">
              <Building2 className="w-3 h-3" aria-hidden="true" />
              LDCE Student Association
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#000000]">
            Treasurer Command Center
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            LDCE Organizational Treasury Ledger • Verified institutional cash, bank inflows, and operating disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            className="gap-2 shrink-0 border-[#714B67]/30 text-[#714B67] hover:bg-[#714B67]/5"
            aria-label="Refresh financial dashboard data"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </Button>
        </div>
      </div>

      {/* Role notice if non-treasurer */}
      {roleNotice && (
        <Alert variant="warning" title="Role Notice">
          {roleNotice}
        </Alert>
      )}

      {/* Error state */}
      {error && (
        <div className="space-y-3">
          <Alert variant="error" title="Treasurer Dashboard Notice">
            {error}
          </Alert>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => fetchDashboard(false)}
              className="gap-2"
            >
              <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
              Retry Loading Dashboard
            </Button>
            {error.includes('401') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
            )}
            {error.includes('403') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                Return to Member Dashboard
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !dashboardData && <TreasurerDashboardSkeleton />}

      {/* Loaded Financial Dashboard Content */}
      {!loading && dashboardData && (
        <>
          {/* Primary Financial KPI Cards: Exactly 3 Cards */}
          <section aria-label="Financial Summary">
            <h2 className="sr-only">Financial Summary Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1. Total Income */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm hover:border-[#017E84]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9]">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Total Income
                    </span>
                    <div className="p-1.5 rounded bg-[#017E84]/10 text-[#017E84]">
                      <TrendingUp className="w-4 h-4" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl lg:text-4xl font-extrabold text-[#017E84] block">
                      {formatCurrency(totalIncome)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-1 block">
                      Aggregated institutional revenue
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Total Expenses */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm hover:border-[#E4A900]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9]">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Total Expenses
                    </span>
                    <div className="p-1.5 rounded bg-[#E4A900]/15 text-[#8a6500]">
                      <TrendingDown className="w-4 h-4" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl lg:text-4xl font-extrabold text-[#8a6500] block">
                      {formatCurrency(totalExpenses)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-1 block">
                      Aggregated disbursements & payouts
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Balance */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm hover:border-[#714B67]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9]">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Net Cash Balance
                    </span>
                    <div className="p-1.5 rounded bg-[#714B67]/10 text-[#714B67]">
                      <Wallet className="w-4 h-4" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className={`text-3xl lg:text-4xl font-extrabold block ${balance < 0 ? 'text-red-600' : 'text-[#714B67]'}`}>
                      {formatCurrency(balance)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-1 block">
                      Authoritative treasury position
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Treasury Operations Overview Section */}
          <section aria-labelledby="treasury-operations-title" className="space-y-4 border-t border-[#e2e5e9] pt-6">
            <div>
              <h2 id="treasury-operations-title" className="text-lg font-bold text-[#000000]">
                Treasury Operations Overview
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Financial categories monitored by the LDCE Student Association Treasury.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Income Overview Card */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-[#017E84]/10 text-[#017E84]">
                    <Receipt className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Income Accounts</h3>
                </div>
                <p className="text-xs text-gray-600">
                  Includes membership dues, merchandise sales, and ticket registration revenues.
                </p>
                <div className="pt-2 text-xs font-semibold text-[#017E84]">
                  Recorded Total: {formatCurrency(totalIncome)}
                </div>
              </div>

              {/* Expense Overview Card */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-[#E4A900]/15 text-[#8a6500]">
                    <CreditCard className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Expense Accounts</h3>
                </div>
                <p className="text-xs text-gray-600">
                  Approved operational vouchers, event logistics, and organizational procurement disbursements.
                </p>
                <div className="pt-2 text-xs font-semibold text-[#8a6500]">
                  Recorded Total: {formatCurrency(totalExpenses)}
                </div>
              </div>

              {/* Treasury Position Card */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-[#714B67]/10 text-[#714B67]">
                    <Landmark className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Treasury Solvency</h3>
                </div>
                <p className="text-xs text-gray-600">
                  Authorized net position available for ongoing LDCE Student Association activities.
                </p>
                <div className={`pt-2 text-xs font-semibold ${balance < 0 ? 'text-red-600' : 'text-[#714B67]'}`}>
                  Net Position: {formatCurrency(balance)}
                </div>
              </div>
            </div>
          </section>

          {/* Quick Operations Links */}
          <section aria-label="Treasurer Quick Navigation" className="border-t border-[#e2e5e9] pt-6">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Treasurer Quick Navigation
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                to="/payments"
                className="bg-white border border-[#e2e5e9] hover:border-[#714B67]/50 rounded-lg p-3.5 shadow-sm transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#714B67]/10 text-[#714B67] group-hover:bg-[#714B67] group-hover:text-white transition-colors">
                    <Receipt className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900 block group-hover:text-[#714B67]">
                      Payment History
                    </span>
                    <span className="text-xs text-gray-500 block">
                      Review campus fee and transaction records
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#714B67] transition-colors" aria-hidden="true" />
              </Link>

              <Link
                to="/events"
                className="bg-white border border-[#e2e5e9] hover:border-[#017E84]/50 rounded-lg p-3.5 shadow-sm transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#017E84]/10 text-[#017E84] group-hover:bg-[#017E84] group-hover:text-white transition-colors">
                    <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900 block group-hover:text-[#017E84]">
                      Campus Events Schedule
                    </span>
                    <span className="text-xs text-gray-500 block">
                      Verify scheduled events and activity dates
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#017E84] transition-colors" aria-hidden="true" />
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
