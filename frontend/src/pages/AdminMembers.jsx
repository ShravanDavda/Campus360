import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  RotateCcw,
  Shield,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import { adminService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';

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
    case 'membershipOfficer':
      return 'Membership Officer';
    case 'student':
      return 'Student';
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
  if (norm === 'rejected') {
    return <Badge variant="danger">Rejected</Badge>;
  }
  return <Badge variant="gray">{status || '—'}</Badge>;
};

export default function AdminMembers() {
  const navigate = useNavigate();

  // Authentication & authorization state
  const [authError] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role && user.role !== 'admin') {
        return '403 Forbidden: Administrator privileges required to access Admin Member Management.';
      }
    } catch {
      // Proceed to rely on backend authorization
    }
    return '';
  });

  // Member list & pagination state
  const [members, setMembers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState('');

  // Filter & Search state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Activation & Action feedback
  const [activatingId, setActivatingId] = useState(null);
  const [bannerAlert, setBannerAlert] = useState(null); // { type: 'success' | 'error', message: '' }

  // Reject Member Modal state
  const [rejectModal, setRejectModal] = useState({
    open: false,
    member: null,
    loading: false,
    error: '',
  });

  // Member Detail Modal state
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [memberDetail, setMemberDetail] = useState(null);
  const [detailError, setDetailError] = useState('');
  const [modalRole, setModalRole] = useState('');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Tab & Membership Plans State (Admin Authoritative)
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'plans'
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState('');
  const [editingPlan, setEditingPlan] = useState(null);
  const [editPriceInput, setEditPriceInput] = useState('');
  const [editActiveInput, setEditActiveInput] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [editPlanError, setEditPlanError] = useState('');

  const fetchPlans = async () => {
    setPlansLoading(true);
    setPlansError('');
    try {
      const res = await adminService.getAdminMembershipPlans();
      if (res.data?.success) {
        setPlans(res.data.data.plans || []);
      }
    } catch (err) {
      setPlansError(err.response?.data?.error?.message || 'Failed to load membership plans.');
    } finally {
      setPlansLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'plans') {
      fetchPlans();
    }
  }, [activeTab]);

  const openEditPlan = (plan) => {
    setEditingPlan(plan);
    setEditPriceInput(String(plan.price));
    setEditActiveInput(Boolean(plan.isActive));
    setEditPlanError('');
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    const priceNum = Number(editPriceInput);
    if (isNaN(priceNum) || priceNum < 0) {
      setEditPlanError('Price must be a valid number greater than or equal to 0.');
      return;
    }
    setSavingPlan(true);
    setEditPlanError('');
    try {
      const res = await adminService.updateAdminMembershipPlan(editingPlan.id, {
        price: priceNum,
        isActive: editActiveInput,
      });
      if (res.data?.success) {
        setPlans((prev) =>
          prev.map((p) => (p.id === editingPlan.id ? res.data.data.plan : p))
        );
        setBannerAlert({
          type: 'success',
          message: `Plan "${editingPlan.name}" updated successfully to ₹${priceNum.toFixed(2)}.`,
        });
        setEditingPlan(null);
      }
    } catch (err) {
      setEditPlanError(err.response?.data?.error?.message || 'Failed to update plan.');
    } finally {
      setSavingPlan(false);
    }
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1); // Reset to page 1 on search change
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Auth check for missing token
  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch Members from Backend API
  useEffect(() => {
    if (authError) return;

    let isSubscribed = true;

    async function loadMembers() {
      setLoading(true);
      setTableError('');
      try {
        const params = {
          page: currentPage,
          limit: 20,
        };

        if (debouncedSearch) {
          params.search = debouncedSearch;
        }
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        if (roleFilter !== 'all') {
          params.role = roleFilter;
        }

        const response = await adminService.getAdminMembers(params);

        if (!isSubscribed) return;

        if (response.data?.success) {
          const data = response.data.data;
          const fetchedMembers = Array.isArray(data?.members) ? data.members : [];
          setMembers(fetchedMembers);

          if (data?.pagination) {
            setPagination({
              page: data.pagination.page ?? currentPage,
              limit: data.pagination.limit ?? 20,
              total: data.pagination.total ?? fetchedMembers.length,
              totalPages: data.pagination.totalPages ?? 1,
            });
          }
        } else {
          setTableError('Failed to load members from server.');
        }
      } catch (err) {
        if (!isSubscribed) return;
        if (!err.response) {
          setTableError('Unable to connect to the server. Please check your network connection.');
        } else if (err.response.status === 401) {
          navigate('/login');
        } else if (err.response.status === 403) {
          setTableError('403 Forbidden: You do not have permission to access admin member data.');
        } else {
          setTableError(err.response.data?.error?.message || 'An error occurred while fetching members.');
        }
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    }

    loadMembers();

    return () => {
      isSubscribed = false;
    };
  }, [authError, currentPage, debouncedSearch, statusFilter, roleFilter, refreshKey, navigate]);

  // Open Member Details Modal
  const openMemberModal = async (memberId) => {
    setSelectedMemberId(memberId);
    setDetailLoading(true);
    setDetailError('');
    setMemberDetail(null);

    try {
      const response = await adminService.getAdminMember(memberId);
      if (response.data?.success && response.data?.data) {
        setMemberDetail(response.data.data);
        setModalRole(response.data.data.role);
      } else {
        setDetailError('Unable to retrieve member details.');
      }
    } catch (err) {
      if (!err.response) {
        setDetailError('Network error. Unable to load member details.');
      } else if (err.response.status === 404) {
        setDetailError('Member record not found.');
      } else if (err.response.status === 403) {
        setDetailError('Permission Denied: You do not have permission to view member details.');
      } else {
        setDetailError(err.response.data?.error?.message || 'Failed to load member details.');
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const closeMemberModal = () => {
    setSelectedMemberId(null);
    setMemberDetail(null);
    setDetailError('');
    setModalRole('');
  };

  const handleRoleUpdateModal = async () => {
    if (!memberDetail || !modalRole || modalRole === memberDetail.role || isUpdatingRole) return;
    setIsUpdatingRole(true);
    try {
      const response = await adminService.updateAdminMemberRole(memberDetail.id, { role: modalRole });
      if (response.data?.success) {
        setMemberDetail((prev) => ({ ...prev, role: modalRole }));
        setMembers((prev) =>
          prev.map((m) => (m.id === memberDetail.id ? { ...m, role: modalRole } : m))
        );
        setBannerAlert({
          type: 'success',
          message: response.data.message || `Member role updated to ${formatRole(modalRole)}.`,
        });
      }
    } catch (err) {
      setBannerAlert({
        type: 'error',
        message: err.response?.data?.error?.message || 'Failed to update member role.',
      });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedMemberId) {
        closeMemberModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMemberId]);

  // Handle Approve / Activate Member (PATCH /api/admin/members/:userId/status)
  const handleActivateMember = async (userId) => {
    if (activatingId) return; // Prevent duplicate submission

    setActivatingId(userId);
    setBannerAlert(null);

    try {
      const response = await adminService.updateAdminMemberStatus(userId, {
        status: 'active',
      });

      if (response.data?.success) {
        const successMsg = response.data.message || 'Member account activated.';
        setBannerAlert({
          type: 'success',
          message: successMsg,
        });

        // Authoritatively update list state immediately
        setMembers((prev) =>
          prev.map((m) => (m.id === userId ? { ...m, status: 'active' } : m))
        );

        // Update detail modal state if currently open
        if (memberDetail && memberDetail.id === userId) {
          setMemberDetail((prev) => ({
            ...prev,
            status: 'active',
          }));
        }

        // Refresh member list data in background
        setRefreshKey((k) => k + 1);
      } else {
        setBannerAlert({
          type: 'error',
          message: 'Failed to activate member.',
        });
      }
    } catch (err) {
      if (!err.response) {
        setBannerAlert({
          type: 'error',
          message: 'Network error. Unable to connect to server.',
        });
        return;
      }

      const status = err.response.status;
      const data = err.response.data || {};
      const errorCode = data.error?.code;
      const errorMsg = data.error?.message;

      if (status === 409 || errorCode === 'INVALID_STATUS_TRANSITION') {
        setBannerAlert({
          type: 'error',
          message: errorMsg || 'Invalid status transition. The member may already be active.',
        });
        // Do NOT retry automatically. Refresh member list
        setRefreshKey((k) => k + 1);
      } else if (status === 404 || errorCode === 'MEMBER_NOT_FOUND') {
        setBannerAlert({
          type: 'error',
          message: errorMsg || 'Member not found.',
        });
      } else if (status === 400 || errorCode === 'VALIDATION_ERROR') {
        setBannerAlert({
          type: 'error',
          message: errorMsg || 'Validation error while activating member.',
        });
      } else if (status === 401) {
        navigate('/login');
      } else if (status === 403) {
        setBannerAlert({
          type: 'error',
          message: 'Permission Denied: You do not have permission to activate members.',
        });
      } else {
        setBannerAlert({
          type: 'error',
          message: errorMsg || 'Server error occurred while activating member.',
        });
      }
    } finally {
      setActivatingId(null);
    }
  };

  // Handle Reject Member Registration (PATCH /api/admin/members/:userId/status)
  const handleConfirmReject = async () => {
    if (!rejectModal.member || rejectModal.loading) return;

    const targetUser = rejectModal.member;
    setRejectModal((prev) => ({ ...prev, loading: true, error: '' }));

    try {
      const response = await adminService.updateAdminMemberStatus(targetUser.id, {
        status: 'rejected',
      });

      if (response.data?.success) {
        const successMsg = response.data.message || 'Member registration rejected.';
        setBannerAlert({
          type: 'success',
          message: successMsg,
        });

        // Authoritatively update list state immediately
        setMembers((prev) =>
          prev.map((m) => (m.id === targetUser.id ? { ...m, status: 'rejected' } : m))
        );

        // Update detail modal state if currently open for this member
        if (memberDetail && memberDetail.id === targetUser.id) {
          setMemberDetail((prev) => ({
            ...prev,
            status: 'rejected',
          }));
        }

        // Close modal
        setRejectModal({ open: false, member: null, loading: false, error: '' });

        // Refresh member list data in background
        setRefreshKey((k) => k + 1);
      } else {
        setRejectModal((prev) => ({
          ...prev,
          loading: false,
          error: 'Failed to reject member.',
        }));
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to reject member registration.';
      setRejectModal((prev) => ({
        ...prev,
        loading: false,
        error: errorMsg,
      }));
    }
  };

  const hasActiveFilters = Boolean(
    searchInput.trim() || statusFilter !== 'all' || roleFilter !== 'all'
  );

  const clearAllFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setRoleFilter('all');
    setCurrentPage(1);
  };

  // If user is forbidden by role UX check
  if (authError) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto py-8">
        <Alert variant="error" title="Access Denied">
          {authError}
        </Alert>
        <div className="text-center pt-2">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#714B67]/10 text-[#714B67] text-xs font-semibold uppercase mb-2">
            <Users className="w-3.5 h-3.5 text-[#714B67]" aria-hidden="true" />
            <span>Administration</span>
          </div>
          <h1 className="text-2xl font-bold text-[#000000]">Member Management</h1>
          <p className="text-sm text-[#555555] mt-1">
            Review organization members, inspect membership records, and activate pending accounts.
          </p>
        </div>

        {pagination.total > 0 && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Total Registered:</span>
            <span className="px-2.5 py-1 bg-white border border-[#e2e5e9] rounded text-xs font-semibold text-gray-800 shadow-sm">
              {pagination.total} {pagination.total === 1 ? 'Member' : 'Members'}
            </span>
          </div>
        )}
      </div>

      {/* Banner Feedback Alert */}
      {bannerAlert && (
        <Alert
          variant={bannerAlert.type}
          title={bannerAlert.type === 'success' ? 'Success' : 'Error'}
          className="transition-all"
        >
          {bannerAlert.message}
        </Alert>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[#e2e5e9] space-x-6">
        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'members'
              ? 'border-[#714B67] text-[#714B67]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Members List</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'plans'
              ? 'border-[#714B67] text-[#714B67]'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Membership Plans & Pricing</span>
        </button>
      </div>

      {/* TAB 2: MEMBERSHIP PLANS MANAGEMENT */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm">
            <div className="border-b border-[#e2e5e9] pb-4 mb-6">
              <h2 className="text-lg font-bold text-gray-900">Authoritative Membership Plans</h2>
              <p className="text-xs text-gray-500 mt-1">
                Admin controls authoritative membership-plan pricing and active status. Historical financial records preserve the actual price paid.
              </p>
            </div>

            {plansLoading ? (
              <LoadingSpinner message="Loading membership plans..." />
            ) : plansError ? (
              <Alert variant="error">{plansError}</Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="border border-[#e2e5e9] rounded-lg p-5 bg-[#F8F9FA] flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-base text-gray-900">{plan.name}</h3>
                        <Badge variant={plan.isActive ? 'teal' : 'secondary'}>
                          {plan.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold text-[#714B67] mb-2">
                        ₹{Number(plan.price).toFixed(2)}
                      </div>
                      <p className="text-xs text-gray-600">
                        Term Duration: <strong>{plan.durationMonths} {plan.durationMonths === 1 ? 'calendar month' : 'calendar months'}</strong>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-200">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openEditPlan(plan)}
                        className="w-full text-xs"
                      >
                        Edit Price & Status
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: MEMBERS LIST */}
      {activeTab === 'members' && (
        <div className="space-y-6">
      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="h-4 w-4" aria-hidden="true" />
            </div>
            <Input
              type="text"
              placeholder="Search by full name, email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-8"
              aria-label="Search members"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by account status"
              className="h-10 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-[#714B67] focus:border-[#714B67]"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="sm:col-span-3">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by system role"
              className="h-10 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-[#714B67] focus:border-[#714B67]"
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
              <option value="eventOrganizer">Event Organizer</option>
              <option value="volunteer">Volunteer</option>
              <option value="treasurer">Treasurer</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="sm:col-span-1 flex justify-end">
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs text-gray-600 hover:text-[#714B67]"
                title="Clear all filters"
                aria-label="Clear all filters"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table-Level Error Alert */}
      {tableError && (
        <div className="space-y-3">
          <Alert variant="error">{tableError}</Alert>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            Retry Loading
          </Button>
        </div>
      )}

      {/* Main Table Content */}
      {loading ? (
        <LoadingSpinner message="Loading member directory..." />
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members found"
          description={
            hasActiveFilters
              ? 'No member accounts match the active search or filter criteria.'
              : 'There are currently no registered member records in the system.'
          }
          action={
            hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                Clear Filters
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="bg-white border border-[#e2e5e9] rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#F8F9FA] border-b border-[#e2e5e9] text-gray-600 uppercase text-[11px] font-semibold tracking-wider">
                <tr>
                  <th scope="col" className="py-3.5 px-4 sm:px-6">Full Name</th>
                  <th scope="col" className="py-3.5 px-4 sm:px-6">Email</th>
                  <th scope="col" className="py-3.5 px-4 sm:px-6">Phone</th>
                  <th scope="col" className="py-3.5 px-4 sm:px-6">Role</th>
                  <th scope="col" className="py-3.5 px-4 sm:px-6 text-center">Status</th>
                  <th scope="col" className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e5e9]">
                {members.map((member) => {
                  const isPending = member.status?.toLowerCase() === 'pending';
                  const isActivatingThis = activatingId === member.id;

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-gray-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-gray-900">
                        {member.fullName}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-gray-600 font-mono text-xs">
                        {member.email}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-gray-600">
                        {member.phoneNumber || '—'}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-gray-800 font-medium">
                        {formatRole(member.role)}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-center">
                        {getStatusBadge(member.status)}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openMemberModal(member.id)}
                            className="text-xs gap-1"
                            aria-label={`View details for ${member.fullName}`}
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>View</span>
                          </Button>

                          {isPending && (
                            <>
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                isLoading={isActivatingThis}
                                disabled={isActivatingThis || activatingId !== null || rejectModal.loading}
                                onClick={() => handleActivateMember(member.id)}
                                className="text-xs gap-1"
                                aria-label={`Activate member account for ${member.fullName}`}
                              >
                                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Activate</span>
                              </Button>

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isActivatingThis || activatingId !== null || rejectModal.loading}
                                onClick={() =>
                                  setRejectModal({
                                    open: true,
                                    member,
                                    loading: false,
                                    error: '',
                                  })
                                }
                                className="text-xs gap-1 border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                aria-label={`Reject member registration for ${member.fullName}`}
                              >
                                <X className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Reject</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="bg-[#F8F9FA] border-t border-[#e2e5e9] px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-gray-600">
            <div>
              {pagination.total > 0 ? (
                <span>
                  Showing{' '}
                  <span className="font-semibold text-gray-900">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-semibold text-gray-900">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of{' '}
                  <span className="font-semibold text-gray-900">{pagination.total}</span> members
                </span>
              ) : (
                <span>No members to display</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 mr-2">
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || pagination.totalPages === 0 || loading}
                onClick={() => setCurrentPage((p) => p + 1)}
                aria-label="Next page"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}

      {/* Member Details Modal / Drawer */}
      {selectedMemberId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-none"
        >
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#e2e5e9] flex items-center justify-between bg-[#F8F9FA]">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#714B67]" aria-hidden="true" />
                <h3 id="member-modal-title" className="text-lg font-bold text-[#000000]">
                  Member Profile & Membership
                </h3>
              </div>
              <button
                type="button"
                onClick={closeMemberModal}
                className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-[#714B67]"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {detailLoading ? (
                <LoadingSpinner message="Retrieving member details..." />
              ) : detailError ? (
                <Alert variant="error">{detailError}</Alert>
              ) : memberDetail ? (
                <div className="space-y-6">
                  {/* Overview Card */}
                  <div className="flex items-center justify-between p-4 bg-[#F8F9FA] rounded-lg border border-[#e2e5e9]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#714B67]/10 flex items-center justify-center text-[#714B67] font-bold text-base">
                        {memberDetail.fullName?.charAt(0)?.toUpperCase() || 'M'}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-base">{memberDetail.fullName}</h4>
                        <p className="text-xs text-gray-500 font-mono">{memberDetail.email}</p>
                      </div>
                    </div>
                    <div>{getStatusBadge(memberDetail.status)}</div>
                  </div>

                  {/* Personal Information */}
                  <div>
                    <h4 className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-3 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#714B67]" />
                      Personal Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-white p-4 rounded border border-[#e2e5e9]">
                      <div>
                        <span className="text-xs text-gray-500 block">Full Name</span>
                        <span className="font-semibold text-gray-900">{memberDetail.fullName || '—'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Email Address</span>
                        <span className="font-mono text-xs font-semibold text-gray-900">{memberDetail.email || '—'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Phone Number</span>
                        <span className="font-semibold text-gray-900">{memberDetail.phoneNumber || '—'}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">System Role</span>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="font-semibold text-gray-900">{formatRole(memberDetail.role)}</span>
                          {memberDetail.role !== 'admin' && (
                            <div className="flex items-center gap-1.5 ml-auto">
                              <select
                                value={modalRole || memberDetail.role}
                                onChange={(e) => setModalRole(e.target.value)}
                                disabled={isUpdatingRole}
                                className="h-7 text-xs rounded border border-gray-300 bg-white px-2 py-0.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                                aria-label="Assign System Role"
                              >
                                <option value="student">Student</option>
                                <option value="eventOrganizer">Event Organizer</option>
                                <option value="volunteer">Volunteer</option>
                                <option value="treasurer">Treasurer</option>
                              </select>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleRoleUpdateModal}
                                isLoading={isUpdatingRole}
                                disabled={isUpdatingRole || !modalRole || modalRole === memberDetail.role}
                                className="h-7 px-2 text-xs"
                              >
                                Update
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 block">Account Status</span>
                        <div className="mt-1">{getStatusBadge(memberDetail.status)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Membership Information */}
                  <div>
                    <h4 className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-3 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#017E84]" />
                      Membership Details
                    </h4>
                    {memberDetail.membership ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-white p-4 rounded border border-[#e2e5e9]">
                        <div>
                          <span className="text-xs text-gray-500 block">Membership ID</span>
                          <span className="font-mono text-xs font-semibold text-gray-800 select-all">
                            {memberDetail.membership.membershipId || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Membership Status</span>
                          <div className="mt-1">
                            {memberDetail.membership.status ? (
                              <Badge variant={memberDetail.membership.status === 'ACTIVE' ? 'teal' : 'gray'}>
                                {memberDetail.membership.status}
                              </Badge>
                            ) : (
                              '—'
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Start Date</span>
                          <span className="font-semibold text-gray-900">
                            {memberDetail.membership.startDate || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Expiry Date</span>
                          <span className="font-semibold text-gray-900">
                            {memberDetail.membership.expiryDate || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Dues Amount</span>
                          <span className="font-semibold text-gray-900">
                            {memberDetail.membership.duesAmount != null
                              ? `₹${memberDetail.membership.duesAmount}`
                              : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Payment Status</span>
                          <div className="mt-1">
                            {memberDetail.membership.paymentStatus ? (
                              <Badge
                                variant={
                                  memberDetail.membership.paymentStatus === 'PAID'
                                    ? 'teal'
                                    : 'gold'
                                }
                              >
                                {memberDetail.membership.paymentStatus}
                              </Badge>
                            ) : (
                              '—'
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-gray-50 border border-[#e2e5e9] rounded text-center text-xs text-gray-500">
                        No active membership record associated with this account.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-[#e2e5e9] bg-[#F8F9FA] flex flex-wrap items-center justify-between gap-3">
              <div>
                {memberDetail && (
                  <Link
                    to={`/admin/members/${memberDetail.id}`}
                    className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-[#714B67] font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open full page view
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeMemberModal}
                >
                  Close
                </Button>

                {memberDetail && memberDetail.status?.toLowerCase() === 'pending' && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    isLoading={activatingId === memberDetail.id}
                    disabled={activatingId !== null}
                    onClick={() => handleActivateMember(memberDetail.id)}
                    className="gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Activate Member
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* REJECT MEMBER CONFIRMATION MODAL */}
      {rejectModal.open && rejectModal.member && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-none">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-member-modal-title"
            className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl w-full max-w-md p-6"
          >
            <h2 id="reject-member-modal-title" className="text-base font-bold text-gray-900 mb-2">
              Reject Member Registration
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              Are you sure you want to reject this member registration?
            </p>
            <div className="p-3 bg-gray-50 rounded border border-[#e2e5e9] text-xs text-gray-700 mb-4 space-y-1">
              <div><span className="font-semibold text-gray-900">Name:</span> {rejectModal.member.fullName}</div>
              <div><span className="font-semibold text-gray-900">Email:</span> {rejectModal.member.email}</div>
              <div><span className="font-semibold text-gray-900">Role:</span> {formatRole(rejectModal.member.role)}</div>
            </div>

            {rejectModal.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 mb-4 flex items-center gap-2">
                <span>{rejectModal.error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={rejectModal.loading}
                onClick={() =>
                  setRejectModal({ open: false, member: null, loading: false, error: '' })
                }
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={rejectModal.loading}
                onClick={handleConfirmReject}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4"
              >
                {rejectModal.loading ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* EDIT MEMBERSHIP PLAN MODAL */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-plan-modal-title"
            className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h2 id="edit-plan-modal-title" className="text-base font-bold text-gray-900">
                Edit Membership Plan: {editingPlan.name}
              </h2>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Plan Term Duration
                </label>
                <input
                  type="text"
                  disabled
                  value={`${editingPlan.durationMonths} ${
                    editingPlan.durationMonths === 1 ? 'calendar month' : 'calendar months'
                  }`}
                  className="w-full h-9 px-3 py-1.5 border border-gray-200 rounded text-xs bg-gray-100 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Plan Price (₹)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editPriceInput}
                  onChange={(e) => setEditPriceInput(e.target.value)}
                  placeholder="e.g. 100.00"
                  className="w-full text-sm"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Authoritative price charged for new applications and renewals. Historical payments will not be modified.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="planIsActive"
                  checked={editActiveInput}
                  onChange={(e) => setEditActiveInput(e.target.checked)}
                  className="h-4 w-4 text-[#714B67] rounded border-gray-300 focus:ring-[#714B67]"
                />
                <label htmlFor="planIsActive" className="text-xs font-medium text-gray-800">
                  Plan is Active (available to students)
                </label>
              </div>

              {editPlanError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  {editPlanError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingPlan(null)}
                  disabled={savingPlan}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#714B67] hover:bg-[#5b3c53] text-white"
                  isLoading={savingPlan}
                  disabled={savingPlan}
                >
                  Save Plan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
