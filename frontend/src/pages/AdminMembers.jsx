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

  // Member Detail Modal state
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [memberDetail, setMemberDetail] = useState(null);
  const [detailError, setDetailError] = useState('');

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
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              isLoading={isActivatingThis}
                              disabled={isActivatingThis || activatingId !== null}
                              onClick={() => handleActivateMember(member.id)}
                              className="text-xs gap-1"
                              aria-label={`Activate member account for ${member.fullName}`}
                            >
                              <Check className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Activate</span>
                            </Button>
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
                        <span className="font-semibold text-gray-900">{formatRole(memberDetail.role)}</span>
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
    </div>
  );
}
