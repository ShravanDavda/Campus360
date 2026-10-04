import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  Ticket,
  Package,
  Megaphone,
  ArrowRight,
  UserCheck,
  CreditCard,
  ShoppingBag,
  Receipt,
  RotateCw,
  MapPin,
  Clock,
  Shield,
  Users,
  Building2,
} from 'lucide-react';
import { memberService, adminService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';

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

const formatCurrency = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

const formatNumber = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN');
};

const formatRole = (role) => {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'eventOrganizer':
      return 'Event Organizer';
    case 'volunteer':
      return 'Volunteer';
    case 'treasurer':
      return 'Treasurer';
    case 'membershipOfficer':
      return 'Membership Officer';
    case 'student':
      return 'Student';
    default:
      return role || '';
  }
};

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading dashboard">
      {/* Top Banner Skeleton */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-7 bg-gray-200 rounded w-64"></div>
          <div className="h-4 bg-gray-100 rounded w-48"></div>
        </div>
        <div className="h-12 bg-gray-100 rounded-lg w-48"></div>
      </div>

      {/* Summary Metric Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-[#e2e5e9] rounded-lg p-4 h-24 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-6 bg-gray-300 rounded w-16"></div>
          </div>
        ))}
      </div>

      {/* Content Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-[#e2e5e9] rounded-lg p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#e2e5e9] pb-3">
              <div className="h-5 bg-gray-200 rounded w-36"></div>
              <div className="h-4 bg-gray-100 rounded w-16"></div>
            </div>
            <div className="space-y-3">
              <div className="h-16 bg-gray-100 rounded"></div>
              <div className="h-16 bg-gray-100 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const navigate = useNavigate();
  const location = useLocation();

  // Common Dashboard state
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Admin Dashboard state
  const [adminData, setAdminData] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');

  const [refreshKey, setRefreshKey] = useState(0);

  // Discover role from local auth state
  const userRole = (() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u?.role) return u.role;
      }
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const decoded = JSON.parse(atob(payloadBase64));
          if (decoded?.role) return decoded.role;
        }
      }
    } catch {
      // ignore
    }
    return null;
  })();

  const isExplicitAdminRoute = location.pathname === '/admin/dashboard';
  const shouldLoadAdmin = userRole === 'admin' || isExplicitAdminRoute;

  // Operational roles are redirected to their dedicated operational panels
  useEffect(() => {
    if (userRole === 'eventOrganizer') {
      navigate('/organizer/dashboard', { replace: true });
    } else if (userRole === 'volunteer') {
      navigate('/volunteer/dashboard', { replace: true });
    } else if (userRole === 'treasurer') {
      navigate('/treasurer/dashboard', { replace: true });
    }
  }, [userRole, navigate]);

  // Load Common Member Dashboard (skip for operational roles)
  useEffect(() => {
    if (shouldLoadAdmin || ['eventOrganizer', 'volunteer', 'treasurer'].includes(userRole)) {
      return;
    }

    let isSubscribed = true;

    async function loadCommonDashboard() {
      setLoading(true);
      setError('');
      try {
        const response = await memberService.getDashboard();
        if (!isSubscribed) return;

        if (response.data?.success && response.data?.data) {
          setData(response.data.data);
        } else {
          setError('Unable to load dashboard data.');
        }
      } catch (err) {
        if (!isSubscribed) return;
        if (!err.response) {
          setError('Unable to connect to the server. Please check your network connection.');
        } else if (err.response.status === 401) {
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          navigate('/login');
        } else if (err.response.data?.error?.code === 'ACCOUNT_INACTIVE' || err.response.status === 403) {
          setError('Your account is currently inactive. Please contact the administrator.');
        } else {
          setError(err.response.data?.error?.message || 'Failed to load dashboard information.');
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    }

    loadCommonDashboard();

    return () => {
      isSubscribed = false;
    };
  }, [refreshKey, navigate]);

  // Load Admin Dashboard if user is admin or on /admin/dashboard
  useEffect(() => {
    if (!shouldLoadAdmin) return;

    let isSubscribed = true;

    async function loadAdminDashboard() {
      setAdminLoading(true);
      setAdminError('');
      try {
        const response = await adminService.getDashboard();
        if (!isSubscribed) return;

        if (response.data?.success && response.data?.data) {
          setAdminData(response.data.data);
        } else {
          setAdminError('Unable to load the Admin Dashboard.');
        }
      } catch (err) {
        if (!isSubscribed) return;
        if (!err.response) {
          setAdminError('Unable to connect to the server. Please check your network connection.');
        } else if (err.response.status === 401) {
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          navigate('/login');
        } else if (err.response.status === 403) {
          setAdminError('You do not have permission to access the Admin Dashboard.');
        } else {
          setAdminError('Unable to load the Admin Dashboard.');
        }
      } finally {
        if (isSubscribed) {
          setAdminLoading(false);
        }
      }
    }

    loadAdminDashboard();

    return () => {
      isSubscribed = false;
    };
  }, [refreshKey, shouldLoadAdmin, navigate]);

  const handleRefreshAll = () => {
    setRefreshKey((k) => k + 1);
  };

  if (loading && !data && adminLoading && !adminData) {
    return <DashboardSkeleton />;
  }

  const {
    member,
    membership,
    upcomingEvents = [],
    activeTickets = [],
    recentOrders = [],
    latestAnnouncements = [],
  } = data || {};

  return (
    <div className="space-y-8">
      {/* ========================================================
          ADMIN OPERATIONAL INTELLIGENCE LAYER
          ======================================================== */}
      {shouldLoadAdmin && (
        <section aria-labelledby="admin-dashboard-title" className="space-y-6">
          {/* Admin Header Banner */}
          <div className="bg-white border-2 border-[#714B67]/20 rounded-lg p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#714B67] text-white text-xs font-semibold uppercase tracking-wider">
                  <Shield className="w-3.5 h-3.5 text-white" aria-hidden="true" />
                  Admin Command Center
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#017E84]/10 text-[#017E84] text-xs font-semibold">
                  <Building2 className="w-3 h-3" aria-hidden="true" />
                  LDCE Student Association
                </span>
              </div>
              <h1 id="admin-dashboard-title" className="text-2xl font-bold text-[#000000]">
                Admin Operational Overview
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Real-time organization intelligence and administrative management
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={adminLoading || loading}
              className="gap-2 shrink-0 border-[#714B67]/30 text-[#714B67] hover:bg-[#714B67]/5"
              aria-label="Refresh dashboard metrics"
            >
              <RotateCw className={`w-3.5 h-3.5 ${adminLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{adminLoading ? 'Refreshing...' : 'Refresh Data'}</span>
            </Button>
          </div>

          {/* Admin Error Display */}
          {adminError && (
            <div className="space-y-3">
              <Alert variant="error" title="Admin Dashboard Notice">
                {adminError}
              </Alert>
              {adminError !== 'You do not have permission to access the Admin Dashboard.' && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleRefreshAll}
                  className="gap-2"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Retry Loading Admin Data
                </Button>
              )}
            </div>
          )}

          {/* Admin Metrics Loading Skeleton */}
          {adminLoading && !adminData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse" aria-label="Loading admin metrics">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div key={idx} className="bg-white border border-[#e2e5e9] rounded-lg p-5 h-44 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-28"></div>
                  <div className="h-8 bg-gray-300 rounded w-20"></div>
                  <div className="h-4 bg-gray-100 rounded w-36"></div>
                </div>
              ))}
            </div>
          )}

          {/* Admin Metrics 6 Groups Grid */}
          {adminData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-label="Organization operational metrics">
              {/* 1. Members Metric Card */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm hover:border-[#714B67]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-[#714B67]/10 text-[#714B67]">
                        <Users className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                        Members
                      </h2>
                    </div>
                    <Badge variant="purple">System Users</Badge>
                  </div>

                  <div className="mt-4">
                    <span className="text-3xl font-extrabold text-gray-900 block">
                      {formatNumber(adminData.members?.total)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5 block">
                      Total Registered
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100">
                    <div className="bg-[#F8F9FA] rounded p-2">
                      <span className="text-[11px] text-gray-500 block">Active</span>
                      <span className="text-base font-bold text-[#017E84] block">
                        {formatNumber(adminData.members?.active)}
                      </span>
                    </div>
                    <div className="bg-[#F8F9FA] rounded p-2">
                      <span className="text-[11px] text-gray-500 block">Pending</span>
                      <span className="text-base font-bold text-[#8a6500]">
                        {formatNumber(adminData.members?.pending)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#e2e5e9]">
                  <Link
                    to="/admin/members"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#714B67] hover:text-[#5d3d54] hover:underline focus:outline-none focus:ring-1 focus:ring-[#714B67] rounded"
                  >
                    Manage Members <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* 2. Events Metric Card */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm hover:border-[#714B67]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-[#714B67]/10 text-[#714B67]">
                        <Calendar className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                        Events
                      </h2>
                    </div>
                    <Badge variant="teal">Schedule</Badge>
                  </div>

                  <div className="mt-4">
                    <span className="text-3xl font-extrabold text-gray-900 block">
                      {formatNumber(adminData.events?.total)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5 block">
                      Total Events
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100">
                    <div className="bg-[#F8F9FA] rounded p-2">
                      <span className="text-[11px] text-gray-500 block">Upcoming</span>
                      <span className="text-base font-bold text-[#017E84] block">
                        {formatNumber(adminData.events?.upcoming)}
                      </span>
                    </div>
                    <div className="bg-[#F8F9FA] rounded p-2">
                      <span className="text-[11px] text-gray-500 block">Published</span>
                      <span className="text-base font-bold text-[#714B67] block">
                        {formatNumber(adminData.events?.published)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#e2e5e9]">
                  <Link
                    to="/admin/events"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#714B67] hover:text-[#5d3d54] hover:underline focus:outline-none focus:ring-1 focus:ring-[#714B67] rounded"
                  >
                    Manage Events <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* 3. Tickets Metric Card */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm hover:border-[#714B67]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-[#017E84]/10 text-[#017E84]">
                        <Ticket className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                        Tickets
                      </h2>
                    </div>
                    <Badge variant="teal">Attendance</Badge>
                  </div>

                  <div className="mt-4">
                    <span className="text-3xl font-extrabold text-gray-900 block">
                      {formatNumber(adminData.tickets?.sold)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5 block">
                      Tickets Sold
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100">
                    <div className="bg-[#F8F9FA] rounded p-2">
                      <span className="text-[11px] text-gray-500 block">Checked In</span>
                      <span className="text-base font-bold text-[#017E84] block">
                        {formatNumber(adminData.tickets?.checkedIn)}
                      </span>
                    </div>
                    <div className="bg-[#F8F9FA] rounded p-2">
                      <span className="text-[11px] text-gray-500 block">Remaining</span>
                      <span className="text-base font-bold text-gray-700 block">
                        {formatNumber(Math.max(0, (adminData.tickets?.sold || 0) - (adminData.tickets?.checkedIn || 0)))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#e2e5e9]">
                  <Link
                    to="/tickets"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#714B67] hover:text-[#5d3d54] hover:underline focus:outline-none focus:ring-1 focus:ring-[#714B67] rounded"
                  >
                    View Tickets <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* 4. Merchandise Metric Card */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm hover:border-[#714B67]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-[#E4A900]/15 text-[#8a6500]">
                        <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                        Merchandise
                      </h2>
                    </div>
                    <Badge variant="gold">Store</Badge>
                  </div>

                  <div className="mt-4">
                    <span className="text-3xl font-extrabold text-gray-900 block">
                      {formatNumber(adminData.merchandise?.products)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5 block">
                      Active Products
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100">
                    <div className="bg-[#F8F9FA] rounded p-2">
                      <span className="text-[11px] text-gray-500 block">Inventory Units</span>
                      <span className="text-base font-bold text-[#017E84] block">
                        {formatNumber(adminData.merchandise?.inventoryItems)}
                      </span>
                    </div>
                    <div className="bg-[#F8F9FA] rounded p-2">
                      <span className="text-[11px] text-gray-500 block">Orders</span>
                      <span className="text-base font-bold text-[#714B67] block">
                        {formatNumber(adminData.merchandise?.orders)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#e2e5e9]">
                  <Link
                    to="/admin/merchandise"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#714B67] hover:text-[#5d3d54] hover:underline focus:outline-none focus:ring-1 focus:ring-[#714B67] rounded"
                  >
                    Manage Merchandise <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>

              {/* 5. Volunteer Operations Metric Card */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm hover:border-[#714B67]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-[#017E84]/10 text-[#017E84]">
                        <UserCheck className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                        Volunteers & Tasks
                      </h2>
                    </div>
                    <Badge variant="teal">Operations</Badge>
                  </div>

                  <div className="mt-4">
                    <span className="text-3xl font-extrabold text-gray-900 block">
                      {formatNumber(adminData.volunteers?.tasks)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5 block">
                      Assigned Tasks
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100">
                    <div className="bg-[#F8F9FA] rounded p-2">
                      <span className="text-[11px] text-gray-500 block">Fundraisers</span>
                      <span className="text-base font-bold text-gray-800 block">
                        {formatNumber(adminData.volunteers?.fundraisers)}
                      </span>
                    </div>
                    <div className="bg-[#F8F9FA] rounded p-2">
                      <span className="text-[11px] text-gray-500 block">Completed</span>
                      <span className="text-base font-bold text-[#017E84] block">
                        {formatNumber(adminData.volunteers?.completedTasks)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#e2e5e9] flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {adminData.volunteers?.completedTasks || 0} of {adminData.volunteers?.tasks || 0} tasks done
                  </span>
                  <span className="text-[11px] font-medium text-gray-400">P0 Ops</span>
                </div>
              </div>

              {/* 6. Finance Metric Card */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm hover:border-[#714B67]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-[#714B67]/10 text-[#714B67]">
                        <Receipt className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                        Finance Position
                      </h2>
                    </div>
                    <Badge variant="purple">Ledger</Badge>
                  </div>

                  <div className="mt-4">
                    <span className="text-3xl font-extrabold text-[#714B67] block truncate">
                      {formatCurrency(adminData.finance?.balance)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5 block">
                      Authoritative Net Balance
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100">
                    <div className="bg-[#F8F9FA] rounded p-2">
                      <span className="text-[11px] text-gray-500 block">Income</span>
                      <span className="text-base font-bold text-[#017E84] block truncate">
                        {formatCurrency(adminData.finance?.totalIncome)}
                      </span>
                    </div>
                    <div className="bg-[#F8F9FA] rounded p-2">
                      <span className="text-[11px] text-gray-500 block">Expenses</span>
                      <span className="text-base font-bold text-gray-700 block truncate">
                        {formatCurrency(adminData.finance?.totalExpenses)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#e2e5e9]">
                  <Link
                    to="/payments"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#714B67] hover:text-[#5d3d54] hover:underline focus:outline-none focus:ring-1 focus:ring-[#714B67] rounded"
                  >
                    Payment History <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Admin Quick Capabilities Navigation */}
          <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm">
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">
              Administrative Execution Links
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Link
                to="/admin/members"
                className="p-3 rounded-lg border border-[#e2e5e9] hover:border-[#714B67] hover:bg-[#714B67]/5 transition-colors text-center flex flex-col items-center gap-1.5 group"
              >
                <Users className="w-5 h-5 text-[#714B67]" aria-hidden="true" />
                <span className="text-xs font-semibold text-gray-800 group-hover:text-[#714B67]">
                  Manage Members
                </span>
              </Link>

              <Link
                to="/events"
                className="p-3 rounded-lg border border-[#e2e5e9] hover:border-[#714B67] hover:bg-[#714B67]/5 transition-colors text-center flex flex-col items-center gap-1.5 group"
              >
                <Calendar className="w-5 h-5 text-[#714B67]" aria-hidden="true" />
                <span className="text-xs font-semibold text-gray-800 group-hover:text-[#714B67]">
                  Manage Events
                </span>
              </Link>

              <Link
                to="/tickets"
                className="p-3 rounded-lg border border-[#e2e5e9] hover:border-[#017E84] hover:bg-[#017E84]/5 transition-colors text-center flex flex-col items-center gap-1.5 group"
              >
                <Ticket className="w-5 h-5 text-[#017E84]" aria-hidden="true" />
                <span className="text-xs font-semibold text-gray-800 group-hover:text-[#017E84]">
                  Ticket Operations
                </span>
              </Link>

              <Link
                to="/merchandise"
                className="p-3 rounded-lg border border-[#e2e5e9] hover:border-[#E4A900] hover:bg-[#E4A900]/5 transition-colors text-center flex flex-col items-center gap-1.5 group"
              >
                <ShoppingBag className="w-5 h-5 text-[#8a6500]" aria-hidden="true" />
                <span className="text-xs font-semibold text-gray-800 group-hover:text-[#8a6500]">
                  Merchandise
                </span>
              </Link>

              <Link
                to="/payments"
                className="p-3 rounded-lg border border-[#e2e5e9] hover:border-[#017E84] hover:bg-[#017E84]/5 transition-colors text-center flex flex-col items-center gap-1.5 group"
              >
                <Receipt className="w-5 h-5 text-[#017E84]" aria-hidden="true" />
                <span className="text-xs font-semibold text-gray-800 group-hover:text-[#017E84]">
                  Financial Records
                </span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================
          COMMON MEMBER DASHBOARD LAYER
          ======================================================== */}
      <section aria-labelledby="common-dashboard-title" className="space-y-6">
        {shouldLoadAdmin && (
          <div className="flex items-center gap-3 pt-4 border-t border-[#e2e5e9]">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider" id="common-dashboard-title">
              Personal Member Services
            </span>
            <div className="flex-1 h-px bg-[#e2e5e9]" />
          </div>
        )}

        {/* Common Error Display */}
        {error && (
          <div className="space-y-3">
            <Alert variant="error" title="Dashboard Notice">
              {error}
            </Alert>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleRefreshAll}
              className="gap-2"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Try Again
            </Button>
          </div>
        )}

        {/* 1. Header / Identity & Welcome Banner */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#714B67]/10 text-[#714B67] text-xs font-semibold uppercase tracking-wider mb-2">
              <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>LDCE Student Association • Member Portal</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#000000]">
              Welcome back, {member?.name || 'Member'}!
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#555555] mt-1">
              <span>{member?.email}</span>
              {userRole && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="inline-flex items-center gap-1 font-medium text-gray-700">
                    <Shield className="w-3.5 h-3.5 text-[#714B67]" />
                    {formatRole(userRole)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Membership Summary Pill */}
          <div className="flex items-center gap-3 bg-[#F8F9FA] border border-[#e2e5e9] px-4 py-3 rounded-lg w-full sm:w-auto">
            <CreditCard className="w-5 h-5 text-[#017E84] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Membership:</span>
                <Badge variant={membership?.status === 'ACTIVE' ? 'teal' : membership?.status === 'EXPIRED' ? 'gray' : 'gold'}>
                  {membership?.status || 'PENDING'}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {membership?.expiryDate ? `Valid until ${formatDate(membership.expiryDate)}` : 'No formal validity recorded'}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Common Summary Metrics Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Summary statistics">
          {/* Membership Metric */}
          <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 font-medium block">Membership</span>
              <span className="text-lg font-bold text-gray-900 mt-0.5 block">
                {membership?.status || '—'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#017E84]/10 text-[#017E84]">
              <CreditCard className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>

          {/* Active Tickets */}
          <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 font-medium block">Active Tickets</span>
              <span className="text-lg font-bold text-gray-900 mt-0.5 block">
                {activeTickets.length}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#017E84]/10 text-[#017E84]">
              <Ticket className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 font-medium block">Events Ahead</span>
              <span className="text-lg font-bold text-gray-900 mt-0.5 block">
                {upcomingEvents.length}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#714B67]/10 text-[#714B67]">
              <Calendar className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 font-medium block">Orders Placed</span>
              <span className="text-lg font-bold text-gray-900 mt-0.5 block">
                {recentOrders.length}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#E4A900]/15 text-[#8a6500]">
              <Package className="w-5 h-5" aria-hidden="true" />
            </div>
          </div>
        </div>

        {/* 3. Primary 2-Column Content: Upcoming Events & Active Tickets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Events Section */}
          <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9] mb-4">
              <h3 className="text-lg font-bold text-[#000000] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#714B67]" aria-hidden="true" />
                Upcoming Events
              </h3>
              <Link
                to="/events"
                className="text-xs font-semibold text-[#714B67] hover:text-[#5d3d54] inline-flex items-center gap-1 hover:underline focus:outline-none focus:ring-1 focus:ring-[#714B67] rounded"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex-1">
              {upcomingEvents.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No upcoming events"
                  description="There are currently no scheduled events for your organization."
                />
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((evt) => (
                    <div
                      key={evt.eventId}
                      className="p-3.5 border border-[#e2e5e9] rounded-lg hover:border-gray-300 transition-colors flex justify-between items-center gap-3"
                    >
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-[#000000] truncate">
                          {evt.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {formatDate(evt.date)}
                          </span>
                          {evt.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              {evt.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        to={`/events/${evt.eventId}`}
                        className="text-xs font-semibold text-[#714B67] hover:underline shrink-0"
                      >
                        Details
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Tickets Section */}
          <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9] mb-4">
              <h3 className="text-lg font-bold text-[#000000] flex items-center gap-2">
                <Ticket className="w-5 h-5 text-[#017E84]" aria-hidden="true" />
                My Active Tickets
              </h3>
              <Link
                to="/tickets"
                className="text-xs font-semibold text-[#714B67] hover:text-[#5d3d54] inline-flex items-center gap-1 hover:underline focus:outline-none focus:ring-1 focus:ring-[#714B67] rounded"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex-1">
              {activeTickets.length === 0 ? (
                <EmptyState
                  icon={Ticket}
                  title="No active tickets"
                  description="You have not purchased or reserved tickets for any upcoming events."
                />
              ) : (
                <div className="space-y-3">
                  {activeTickets.map((tkt) => (
                    <div
                      key={tkt.ticketId}
                      className="p-3.5 border border-[#e2e5e9] rounded-lg hover:border-gray-300 transition-colors flex justify-between items-center gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-[#000000] truncate">
                            {tkt.eventTitle || 'Campus Event'}
                          </h4>
                          <Badge variant="teal">{tkt.checkInStatus || 'VALID'}</Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Qty: {tkt.quantity || 1} • {tkt.ticketTypeName || 'Standard Pass'}
                        </p>
                      </div>
                      <Link
                        to={`/tickets/${tkt.ticketId}`}
                        className="text-xs font-semibold text-[#714B67] hover:underline shrink-0"
                      >
                        View Ticket
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Secondary 2-Column Content: Announcements & Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Latest Announcements */}
          <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9] mb-4">
              <h3 className="text-lg font-bold text-[#000000] flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-[#714B67]" aria-hidden="true" />
                Latest Announcements
              </h3>
              <Link
                to="/announcements"
                className="text-xs font-semibold text-[#714B67] hover:text-[#5d3d54] inline-flex items-center gap-1 hover:underline focus:outline-none focus:ring-1 focus:ring-[#714B67] rounded"
              >
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex-1">
              {latestAnnouncements.length === 0 ? (
                <EmptyState
                  icon={Megaphone}
                  title="No announcements"
                  description="No organizational announcements posted at this time."
                />
              ) : (
                <div className="space-y-3">
                  {latestAnnouncements.map((ann) => (
                    <div
                      key={ann.announcementId}
                      className="p-3.5 border border-[#e2e5e9] rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-sm font-semibold text-[#000000] line-clamp-1">
                          {ann.title}
                        </h4>
                        <Link
                          to={`/announcements/${ann.announcementId}`}
                          className="text-xs font-semibold text-[#714B67] hover:underline shrink-0"
                        >
                          Read
                        </Link>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                        {ann.content}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1.5">
                        {formatDate(ann.publishedDate)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Orders Section */}
          <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9] mb-4">
              <h3 className="text-lg font-bold text-[#000000] flex items-center gap-2">
                <Package className="w-5 h-5 text-[#E4A900]" aria-hidden="true" />
                Recent Orders
              </h3>
              <Link
                to="/orders"
                className="text-xs font-semibold text-[#714B67] hover:text-[#5d3d54] inline-flex items-center gap-1 hover:underline focus:outline-none focus:ring-1 focus:ring-[#714B67] rounded"
              >
                All Orders <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex-1">
              {recentOrders.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No recent orders"
                  description="Browse merchandise to purchase student association gear."
                />
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((ord) => (
                    <div
                      key={ord.orderId}
                      className="p-3.5 border border-[#e2e5e9] rounded-lg hover:border-gray-300 transition-colors flex justify-between items-center gap-3"
                    >
                      <div>
                        <p className="text-xs font-mono font-semibold text-gray-700">
                          Order #{ord.orderId?.slice(0, 8)}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(ord.orderDate)}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="purple">{ord.status || 'PLACED'}</Badge>
                          <Badge variant="teal">{ord.paymentStatus || 'PAID'}</Badge>
                          <span className="text-xs font-semibold text-gray-800">
                            {formatCurrency(ord.totalAmount)}
                          </span>
                        </div>
                      </div>
                      <Link
                        to={`/orders/${ord.orderId}`}
                        className="text-xs font-semibold text-[#714B67] hover:underline shrink-0"
                      >
                        Details
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 5. Common Quick Navigation Actions */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">
            Quick Access
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Link
              to="/events"
              className="p-3 rounded-lg border border-[#e2e5e9] hover:border-[#714B67] hover:bg-[#714B67]/5 transition-colors text-center flex flex-col items-center gap-2 group"
            >
              <Calendar className="w-5 h-5 text-[#714B67]" aria-hidden="true" />
              <span className="text-xs font-semibold text-gray-800 group-hover:text-[#714B67]">
                Browse Events
              </span>
            </Link>

            <Link
              to="/tickets"
              className="p-3 rounded-lg border border-[#e2e5e9] hover:border-[#017E84] hover:bg-[#017E84]/5 transition-colors text-center flex flex-col items-center gap-2 group"
            >
              <Ticket className="w-5 h-5 text-[#017E84]" aria-hidden="true" />
              <span className="text-xs font-semibold text-gray-800 group-hover:text-[#017E84]">
                My Tickets
              </span>
            </Link>

            <Link
              to="/membership"
              className="p-3 rounded-lg border border-[#e2e5e9] hover:border-[#017E84] hover:bg-[#017E84]/5 transition-colors text-center flex flex-col items-center gap-2 group"
            >
              <CreditCard className="w-5 h-5 text-[#017E84]" aria-hidden="true" />
              <span className="text-xs font-semibold text-gray-800 group-hover:text-[#017E84]">
                Membership
              </span>
            </Link>

            <Link
              to="/merchandise"
              className="p-3 rounded-lg border border-[#e2e5e9] hover:border-[#E4A900] hover:bg-[#E4A900]/5 transition-colors text-center flex flex-col items-center gap-2 group"
            >
              <ShoppingBag className="w-5 h-5 text-[#8a6500]" aria-hidden="true" />
              <span className="text-xs font-semibold text-gray-800 group-hover:text-[#8a6500]">
                Merchandise
              </span>
            </Link>

            <Link
              to="/orders"
              className="p-3 rounded-lg border border-[#e2e5e9] hover:border-[#714B67] hover:bg-[#714B67]/5 transition-colors text-center flex flex-col items-center gap-2 group"
            >
              <Package className="w-5 h-5 text-[#714B67]" aria-hidden="true" />
              <span className="text-xs font-semibold text-gray-800 group-hover:text-[#714B67]">
                My Orders
              </span>
            </Link>

            <Link
              to="/payments"
              className="p-3 rounded-lg border border-[#e2e5e9] hover:border-[#017E84] hover:bg-[#017E84]/5 transition-colors text-center flex flex-col items-center gap-2 group"
            >
              <Receipt className="w-5 h-5 text-[#017E84]" aria-hidden="true" />
              <span className="text-xs font-semibold text-gray-800 group-hover:text-[#017E84]">
                Payments
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
