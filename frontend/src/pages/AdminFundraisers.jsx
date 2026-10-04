import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HeartHandshake,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Users,
  Edit3,
} from 'lucide-react';
import { adminService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const formatCurrency = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).split('T')[0];
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export default function AdminFundraisers() {
  const navigate = useNavigate();

  // Authentication check
  const [authError] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role && user.role !== 'admin') {
        return '403 Forbidden: Administrator privileges required to access Admin Fundraiser Management.';
      }
    } catch {
      // rely on backend auth
    }
    return '';
  });

  // Fundraiser list & pagination state
  const [fundraisers, setFundraisers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Search state management (Explicit Search Button / Enter only)
  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');

  // Filters state
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Sorting state (server-side)
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  // Feedback banners
  const [bannerAlert, setBannerAlert] = useState(null); // { type: 'success' | 'error', message: '' }

  // Create Fundraiser Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    targetAmount: '',
    startDate: '',
    endDate: '',
  });

  // Edit Fundraiser Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [selectedFundraiser, setSelectedFundraiser] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    targetAmount: '',
    startDate: '',
    endDate: '',
  });

  // Status Action Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    fundraiserId: null,
    fundraiserTitle: '',
    newStatus: '',
    loading: false,
  });

  // Request sequencing reference for stale response protection
  const requestIdRef = useRef(0);

  // Redirect to login if token is missing
  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // Search button / Enter trigger
  const handleButtonSearch = (e) => {
    if (e) e.preventDefault();
    if (loading) return;
    setSubmittedSearch(searchInput.trim());
    setCurrentPage(1);
  };

  // Fetch fundraisers from backend
  const fetchFundraisers = useCallback(async () => {
    if (authError) {
      setLoading(false);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setTableError('');

    try {
      const params = {
        page: currentPage,
        limit: pagination.limit || 20,
        sortBy,
        sortOrder,
      };

      if (submittedSearch) {
        params.search = submittedSearch;
      }
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (dateFrom) {
        params.dateFrom = dateFrom;
      }
      if (dateTo) {
        params.dateTo = dateTo;
      }

      const res = await adminService.getAdminFundraisers(params);

      // Stale response safety: ignore if another request started later
      if (currentRequestId !== requestIdRef.current) return;

      const data = res.data?.data || {};
      const list = Array.isArray(data.fundraisers) ? data.fundraisers : [];
      setFundraisers(list);

      setPagination({
        page: data.pagination?.page || currentPage,
        limit: data.pagination?.limit || 20,
        totalItems: data.pagination?.totalItems !== undefined ? data.pagination.totalItems : list.length,
        totalPages: data.pagination?.totalPages || 1,
      });
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return;

      const status = err.response?.status;
      if (status === 401) {
        setTableError('Authentication session expired. Please sign in again.');
        setTimeout(() => navigate('/login'), 1500);
      } else if (status === 403) {
        setTableError('403 Forbidden: You do not have permission to view fundraisers.');
      } else {
        const errorMsg =
          err.response?.data?.error?.message ||
          err.message ||
          'Failed to load fundraisers from server. Please retry.';
        setTableError(errorMsg);
      }
      setFundraisers([]);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [authError, currentPage, pagination.limit, sortBy, sortOrder, submittedSearch, statusFilter, dateFrom, dateTo, navigate]);

  useEffect(() => {
    fetchFundraisers();
  }, [fetchFundraisers]);

  // Sort toggle handler
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-700 ml-1 inline" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-[#714B67] ml-1 inline" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[#714B67] ml-1 inline" />
    );
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchInput('');
    setSubmittedSearch('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(submittedSearch) ||
    statusFilter !== 'all' ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  // Create Fundraiser Form Handlers
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');

    const title = createForm.title.trim();
    const description = createForm.description.trim();
    const targetAmount = parseFloat(createForm.targetAmount);
    const startDate = createForm.startDate;
    const endDate = createForm.endDate;

    if (!title) {
      setCreateError('Title is required.');
      return;
    }
    if (!description) {
      setCreateError('Description is required.');
      return;
    }
    if (isNaN(targetAmount) || targetAmount <= 0) {
      setCreateError('Target amount must be a number greater than 0.');
      return;
    }
    if (!startDate) {
      setCreateError('Start date is required.');
      return;
    }
    if (!endDate) {
      setCreateError('End date is required.');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setCreateError('End date cannot be earlier than start date.');
      return;
    }

    setCreateSubmitting(true);
    try {
      const payload = {
        title,
        description,
        targetAmount,
        startDate,
        endDate,
      };

      const res = await adminService.createAdminFundraiser(payload);
      setCreateModalOpen(false);
      setCreateForm({
        title: '',
        description: '',
        targetAmount: '',
        startDate: '',
        endDate: '',
      });

      setBannerAlert({
        type: 'success',
        message: res.data?.message || 'Fundraiser created successfully.',
      });

      // Refresh list
      fetchFundraisers();

      // If fundraiserId returned, navigate to detail
      const newId = res.data?.data?.fundraiserId || res.data?.data?.fundraiser?.id;
      if (newId) {
        navigate(`/admin/fundraisers/${newId}`);
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to create fundraiser. Please verify fields and try again.';
      setCreateError(msg);
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (fundraiser) => {
    setSelectedFundraiser(fundraiser);
    setEditForm({
      title: fundraiser.title || '',
      description: fundraiser.description || '',
      targetAmount: fundraiser.targetAmount || '',
      startDate: fundraiser.startDate ? String(fundraiser.startDate).split('T')[0] : '',
      endDate: fundraiser.endDate ? String(fundraiser.endDate).split('T')[0] : '',
    });
    setEditError('');
    setEditModalOpen(true);
  };

  // Submit Edit Form
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFundraiser) return;
    setEditError('');

    const title = editForm.title.trim();
    const description = editForm.description.trim();
    const targetAmount = parseFloat(editForm.targetAmount);
    const startDate = editForm.startDate;
    const endDate = editForm.endDate;

    if (!title) {
      setEditError('Title cannot be empty.');
      return;
    }
    if (!description) {
      setEditError('Description cannot be empty.');
      return;
    }
    if (isNaN(targetAmount) || targetAmount <= 0) {
      setEditError('Target amount must be a number greater than 0.');
      return;
    }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setEditError('End date cannot be earlier than start date.');
      return;
    }

    setEditSubmitting(true);
    try {
      const payload = {
        title,
        description,
        targetAmount,
        startDate,
        endDate,
      };

      await adminService.updateAdminFundraiser(selectedFundraiser.id, payload);
      setEditModalOpen(false);
      setBannerAlert({
        type: 'success',
        message: 'Fundraiser updated successfully.',
      });
      fetchFundraisers();
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to update fundraiser.';
      setEditError(msg);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Prompt Status Confirmation
  const promptStatusChange = (fundraiser, newStatus) => {
    setConfirmDialog({
      open: true,
      fundraiserId: fundraiser.id,
      fundraiserTitle: fundraiser.title,
      newStatus,
      loading: false,
    });
  };

  // Execute Status Change
  const handleConfirmStatusChange = async () => {
    if (!confirmDialog.fundraiserId || !confirmDialog.newStatus) return;

    setConfirmDialog((prev) => ({ ...prev, loading: true }));
    try {
      await adminService.updateAdminFundraiserStatus(
        confirmDialog.fundraiserId,
        confirmDialog.newStatus
      );

      setBannerAlert({
        type: 'success',
        message: `Fundraiser status updated to ${confirmDialog.newStatus}.`,
      });
      setConfirmDialog({ open: false, fundraiserId: null, fundraiserTitle: '', newStatus: '', loading: false });
      fetchFundraisers();
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Status update failed. Transition may not be allowed.';
      setBannerAlert({ type: 'error', message: msg });
      setConfirmDialog({ open: false, fundraiserId: null, fundraiserTitle: '', newStatus: '', loading: false });
      fetchFundraisers();
    }
  };

  if (authError) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="font-medium text-sm">{authError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e2e5e9] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#000000]">
              Fundraisers
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#714B67]/10 text-[#714B67] border border-[#714B67]/20">
              Admin
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            LDCE Student Association Campaign Management & Financial Traceability
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-[#714B67] hover:bg-[#5a3b52] text-white flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Fundraiser</span>
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {bannerAlert && (
        <div
          role="alert"
          className={`p-4 rounded-md border flex items-center justify-between gap-3 text-sm ${
            bannerAlert.type === 'success'
              ? 'bg-teal-50 border-teal-200 text-teal-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {bannerAlert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#017E84] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{bannerAlert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerAlert(null)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
          {/* Search Bar with Search Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 max-w-2xl">
            <form onSubmit={handleButtonSearch} className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by title or description..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 pr-8 h-10 w-full"
                  aria-label="Search fundraisers"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setSubmittedSearch('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    aria-label="Clear search text"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <Button
                type="submit"
                className="bg-[#714B67] hover:bg-[#5a3b52] text-white shrink-0 h-10 px-4"
              >
                Search
              </Button>
            </form>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="status-select" className="text-xs font-medium text-gray-700 whitespace-nowrap">
                Status:
              </label>
              <select
                id="status-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs h-9 border border-[#e2e5e9] rounded bg-white px-2.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="date-from" className="text-xs font-medium text-gray-700 whitespace-nowrap">
                From:
              </label>
              <input
                type="date"
                id="date-from"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs h-9 border border-[#e2e5e9] rounded bg-white px-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
              />
            </div>

            {/* Date To */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="date-to" className="text-xs font-medium text-gray-700 whitespace-nowrap">
                To:
              </label>
              <input
                type="date"
                id="date-to"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs h-9 border border-[#e2e5e9] rounded bg-white px-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
              />
            </div>

            {/* Clear All Filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="h-9 text-xs text-gray-600 hover:text-gray-900 border-dashed"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs">
            <span className="text-gray-500 font-medium">Active Filters:</span>
            {submittedSearch && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                Search: "{submittedSearch}"
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setSubmittedSearch('');
                    setCurrentPage(1);
                  }}
                  className="hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                Status: {statusFilter}
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setCurrentPage(1);
                  }}
                  className="hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {dateFrom && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                From: {dateFrom}
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom('');
                    setCurrentPage(1);
                  }}
                  className="hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {dateTo && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                To: {dateTo}
                <button
                  type="button"
                  onClick={() => {
                    setDateTo('');
                    setCurrentPage(1);
                  }}
                  className="hover:text-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Fundraiser Table Container */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg shadow-sm overflow-hidden">
        {tableError ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-gray-900 font-semibold mb-1">Failed to Load Fundraisers</p>
            <p className="text-sm text-gray-500 mb-4">{tableError}</p>
            <Button onClick={fetchFundraisers} variant="outline" className="border-[#714B67] text-[#714B67]">
              Retry
            </Button>
          </div>
        ) : loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <LoadingSpinner size="lg" className="text-[#714B67]" />
            <p className="text-sm text-gray-500 font-medium">Fetching real campaign data from PostgreSQL...</p>
          </div>
        ) : fundraisers.length === 0 ? (
          <div className="p-12 text-center">
            <HeartHandshake className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">No Fundraisers Found</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
              {hasActiveFilters
                ? 'No fundraisers match your current filters. Try resetting search or filter parameters.'
                : 'There are no active or draft fundraisers in the system yet.'}
            </p>
            {hasActiveFilters ? (
              <Button onClick={handleClearFilters} variant="outline" size="sm">
                Clear Filters
              </Button>
            ) : (
              <Button
                onClick={() => setCreateModalOpen(true)}
                className="bg-[#714B67] hover:bg-[#5a3b52] text-white"
                size="sm"
              >
                Create First Fundraiser
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-[#e2e5e9] text-xs font-semibold text-gray-600 uppercase tracking-wider select-none">
                  <th scope="col" className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSort('title')}
                      className="group inline-flex items-center font-semibold text-gray-700 hover:text-[#714B67]"
                    >
                      Fundraiser
                      {renderSortIcon('title')}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('targetAmount')}
                      className="group inline-flex items-center font-semibold text-gray-700 hover:text-[#714B67]"
                    >
                      Target
                      {renderSortIcon('targetAmount')}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleSort('collectedAmount')}
                      className="group inline-flex items-center font-semibold text-gray-700 hover:text-[#714B67]"
                    >
                      Collected
                      {renderSortIcon('collectedAmount')}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-4 w-36">
                    Progress
                  </th>
                  <th scope="col" className="py-3 px-4 text-center">
                    Contributors
                  </th>
                  <th scope="col" className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleSort('startDate')}
                      className="group inline-flex items-center font-semibold text-gray-700 hover:text-[#714B67]"
                    >
                      Timeline
                      {renderSortIcon('startDate')}
                    </button>
                  </th>
                  <th scope="col" className="py-3 px-4 text-center">
                    Status
                  </th>
                  <th scope="col" className="py-3 px-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e5e9]">
                {fundraisers.map((f) => {
                  const target = Number(f.targetAmount) || 0;
                  const collected = Number(f.collectedAmount) || 0;
                  const progress = Number(f.progressPercent) || 0;
                  const isClosedOrTerminal = f.status === 'COMPLETED' || f.status === 'CANCELLED';

                  return (
                    <tr key={f.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Fundraiser Info */}
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/admin/fundraisers/${f.id}`}
                          className="font-semibold text-gray-900 hover:text-[#714B67] hover:underline"
                        >
                          {f.title || 'Untitled Campaign'}
                        </Link>
                        {f.description && (
                          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5 max-w-xs sm:max-w-md">
                            {f.description}
                          </p>
                        )}
                      </td>

                      {/* Target Amount */}
                      <td className="py-3.5 px-4 text-right font-medium text-gray-800 whitespace-nowrap">
                        {formatCurrency(target)}
                      </td>

                      {/* Collected Amount */}
                      <td className="py-3.5 px-4 text-right font-semibold text-[#017E84] whitespace-nowrap">
                        {formatCurrency(collected)}
                      </td>

                      {/* Progress */}
                      <td className="py-3.5 px-4">
                        <div className="w-full">
                          <div className="flex items-center justify-between text-xs font-semibold mb-1">
                            <span className="text-gray-700">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                progress >= 100
                                  ? 'bg-[#017E84]'
                                  : 'bg-[#714B67]'
                              }`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                              role="progressbar"
                              aria-valuenow={progress}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            />
                          </div>
                        </div>
                      </td>

                      {/* Contributors */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap text-gray-700 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-medium">{f.contributorCount || 0}</span>
                        </span>
                      </td>

                      {/* Timeline */}
                      <td className="py-3.5 px-4 text-xs text-gray-600 whitespace-nowrap">
                        <div>{formatDateDisplay(f.startDate)}</div>
                        <div className="text-gray-400 text-[11px]">to {formatDateDisplay(f.endDate)}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <Badge>{f.status || 'DRAFT'}</Badge>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/fundraisers/${f.id}`)}
                            className="h-8 px-2 text-gray-600 hover:text-[#714B67]"
                            title="View Command Center"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {!isClosedOrTerminal && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(f)}
                              className="h-8 px-2 text-gray-600 hover:text-gray-900"
                              title="Edit Fundraiser"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          )}

                          {/* Contextual Status Action Buttons */}
                          {f.status === 'DRAFT' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => promptStatusChange(f, 'ACTIVE')}
                              className="h-7 px-2 text-xs border-[#017E84] text-[#017E84] hover:bg-[#017E84]/10"
                            >
                              Activate
                            </Button>
                          )}

                          {f.status === 'ACTIVE' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => promptStatusChange(f, 'CLOSED')}
                              className="h-7 px-2 text-xs text-gray-700 hover:bg-gray-100"
                            >
                              Close
                            </Button>
                          )}

                          {f.status === 'CLOSED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => promptStatusChange(f, 'COMPLETED')}
                              className="h-7 px-2 text-xs border-[#017E84] text-[#017E84] hover:bg-[#017E84]/10"
                            >
                              Complete
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
        )}

        {/* Server-side Pagination Bar */}
        {!tableError && fundraisers.length > 0 && (
          <div className="px-4 py-3 border-t border-[#e2e5e9] bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <div>
              Showing <span className="font-semibold">{fundraisers.length}</span> of{' '}
              <span className="font-semibold">{pagination.totalItems}</span> campaigns (Page{' '}
              <span className="font-semibold">{pagination.page}</span> of{' '}
              <span className="font-semibold">{pagination.totalPages}</span>)
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage <= 1 || loading}
                className="h-8 px-2.5"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pagination.totalPages))}
                disabled={currentPage >= pagination.totalPages || loading}
                className="h-8 px-2.5"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE FUNDRAISER MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#e2e5e9] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Create New Fundraiser</h3>
                <p className="text-xs text-gray-500">Initial campaign will be saved in DRAFT status</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto">
              {createError && (
                <div className="p-3 rounded bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Campaign Title <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Annual Student Tech Symposium"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  required
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Detailed goals and objectives of this fundraising campaign..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full text-xs border border-[#e2e5e9] rounded-md p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target Amount (INR) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 50000"
                  value={createForm.targetAmount}
                  onChange={(e) => setCreateForm({ ...createForm, targetAmount: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={createForm.startDate}
                    onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={createForm.endDate}
                    onChange={(e) => setCreateForm({ ...createForm, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#e2e5e9] flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={createSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createSubmitting}
                  className="bg-[#714B67] hover:bg-[#5a3b52] text-white flex items-center gap-2"
                >
                  {createSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Create Campaign</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FUNDRAISER MODAL */}
      {editModalOpen && selectedFundraiser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#e2e5e9] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Fundraiser</h3>
                <p className="text-xs text-gray-500">Update campaign parameters</p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto">
              {editError && (
                <div className="p-3 rounded bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Campaign Title <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  required
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full text-xs border border-[#e2e5e9] rounded-md p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target Amount (INR) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={editForm.targetAmount}
                  onChange={(e) => setEditForm({ ...editForm, targetAmount: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
                  <Input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#e2e5e9] flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditModalOpen(false)}
                  disabled={editSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editSubmitting}
                  className="bg-[#714B67] hover:bg-[#5a3b52] text-white flex items-center gap-2"
                >
                  {editSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS CONFIRMATION DIALOG */}
      {confirmDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">
              Confirm Status Transition
            </h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to transition campaign{' '}
              <strong className="text-gray-900 font-semibold">"{confirmDialog.fundraiserTitle}"</strong> to{' '}
              <span className="font-bold text-[#714B67]">{confirmDialog.newStatus}</span>?
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmDialog({ open: false, fundraiserId: null, fundraiserTitle: '', newStatus: '', loading: false })}
                disabled={confirmDialog.loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmStatusChange}
                disabled={confirmDialog.loading}
                className="bg-[#714B67] hover:bg-[#5a3b52] text-white flex items-center gap-2"
              >
                {confirmDialog.loading && <LoadingSpinner size="sm" />}
                <span>Confirm {confirmDialog.newStatus}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
