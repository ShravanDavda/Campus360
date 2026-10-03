import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
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
  Clock,
  MapPin,
} from 'lucide-react';
import { adminService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'COMPLETED', label: 'Completed' },
];

const CAPACITY_OPTIONS = [
  { value: 'all', label: 'All Capacities' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'NEARLY_FULL', label: 'Nearly Full' },
  { value: 'SOLD_OUT', label: 'Sold Out' },
];

const formatDateDisplay = (dateStr) => {
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

export default function AdminEvents() {
  const navigate = useNavigate();

  // Authentication & authorization check
  const [authError] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role && user.role !== 'admin') {
        return '403 Forbidden: Administrator privileges required to access Admin Event Management.';
      }
    } catch {
      // Proceed to rely on backend authorization
    }
    return '';
  });

  // Event list & pagination state
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Search state management (Mode 1: Live Search vs Mode 2: Search Button)
  const [searchMode, setSearchMode] = useState('live'); // 'live' | 'button'
  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');

  // Filters state
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [capacityFilter, setCapacityFilter] = useState('all');

  // Sorting state (server-side)
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  // Feedback banners
  const [bannerAlert, setBannerAlert] = useState(null); // { type: 'success' | 'error', message: '' }

  // Create Event Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    capacity: '',
  });

  // Stale request protection counter
  const requestIdRef = useRef(0);

  // Redirect to login if token missing
  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // Mode 1: Live debounced search effect
  useEffect(() => {
    if (searchMode !== 'live') return;

    const timer = setTimeout(() => {
      setSubmittedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput, searchMode]);

  // Mode 2: Button search trigger
  const handleButtonSearch = (e) => {
    if (e) e.preventDefault();
    if (loading) return; // Prevent duplicate requests while loading
    setSubmittedSearch(searchInput.trim());
    setCurrentPage(1);
  };

  // Switch search mode cleanly
  const handleModeChange = (mode) => {
    setSearchMode(mode);
    if (mode === 'live') {
      // In live mode, sync submittedSearch with current input
      setSubmittedSearch(searchInput.trim());
      setCurrentPage(1);
    }
  };

  // Clear search query
  const handleClearSearch = () => {
    setSearchInput('');
    setSubmittedSearch('');
    setCurrentPage(1);
  };

  // Clear all filters & search
  const handleClearAllFilters = () => {
    setSearchInput('');
    setSubmittedSearch('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setCapacityFilter('all');
    setCurrentPage(1);
  };

  // Toggle Column Sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Fetch Events from Backend API
  const fetchEvents = useCallback(async () => {
    if (authError) return;

    const currentReqId = ++requestIdRef.current;
    setLoading(true);
    setTableError('');

    try {
      const params = {
        page: currentPage,
        limit: 20,
        sortBy,
        sortOrder,
      };

      if (submittedSearch) {
        params.search = submittedSearch;
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (dateFrom) {
        params.dateFrom = dateFrom;
      }
      if (dateTo) {
        params.dateTo = dateTo;
      }
      if (capacityFilter !== 'all') {
        params.capacityState = capacityFilter;
      }

      const response = await adminService.getAdminEvents(params);

      // Stale response protection: discard if a newer request was dispatched
      if (currentReqId !== requestIdRef.current) {
        return;
      }

      if (response.data?.success) {
        const data = response.data.data;
        const fetchedEvents = Array.isArray(data?.events) ? data.events : [];
        setEvents(fetchedEvents);

        if (data?.pagination) {
          setPagination({
            page: data.pagination.page || currentPage,
            limit: data.pagination.limit || 20,
            total: data.pagination.total ?? fetchedEvents.length,
            totalPages: data.pagination.totalPages || Math.ceil((data.pagination.total || fetchedEvents.length) / 20) || 1,
          });
        } else {
          // If backend returns unpaginated events array, adapt to total count
          setPagination({
            page: currentPage,
            limit: 20,
            total: fetchedEvents.length,
            totalPages: Math.max(1, Math.ceil(fetchedEvents.length / 20)),
          });
        }
      } else {
        setTableError('Unexpected response format from server.');
      }
    } catch (err) {
      if (currentReqId !== requestIdRef.current) return;

      if (err.response?.status === 401) {
        setTableError('Authentication session expired. Please sign in again.');
      } else if (err.response?.status === 403) {
        setTableError('403 Forbidden: You do not have permission to view admin events.');
      } else {
        const errorMsg = err.response?.data?.message || err.message || 'Unable to load events.';
        setTableError(errorMsg);
      }
    } finally {
      if (currentReqId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [authError, currentPage, submittedSearch, statusFilter, dateFrom, dateTo, capacityFilter, sortBy, sortOrder]);

  // Load events on dependency change
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Create Event Form Handlers
  const handleCreateInputChange = (e) => {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');

    // Frontend validation per contract
    if (!createForm.title.trim()) {
      setCreateError('Title is required.');
      return;
    }
    if (!createForm.description.trim()) {
      setCreateError('Description is required.');
      return;
    }
    if (!createForm.date) {
      setCreateError('Event date is required.');
      return;
    }
    if (!createForm.startTime) {
      setCreateError('Start time is required.');
      return;
    }
    if (!createForm.endTime) {
      setCreateError('End time is required.');
      return;
    }
    if (createForm.endTime <= createForm.startTime) {
      setCreateError('End time must be strictly after start time.');
      return;
    }
    if (!createForm.location.trim()) {
      setCreateError('Location is required.');
      return;
    }
    const capNum = Number(createForm.capacity);
    if (!Number.isInteger(capNum) || capNum <= 0) {
      setCreateError('Capacity must be a positive integer.');
      return;
    }

    setCreateSubmitting(true);
    try {
      const payload = {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        date: createForm.date,
        startTime: createForm.startTime,
        endTime: createForm.endTime,
        location: createForm.location.trim(),
        capacity: capNum,
      };

      const res = await adminService.createAdminEvent(payload);
      if (res.data?.success) {
        setBannerAlert({
          type: 'success',
          message: 'Event created successfully as DRAFT.',
        });
        setCreateModalOpen(false);
        setCreateForm({
          title: '',
          description: '',
          date: '',
          startTime: '',
          endTime: '',
          location: '',
          capacity: '',
        });
        // Revalidate event list
        fetchEvents();
      }
    } catch (err) {
      if (err.response?.status === 400) {
        setCreateError(err.response?.data?.message || 'Invalid event parameters.');
      } else if (err.response?.status === 403) {
        setCreateError('403 Forbidden: You do not have permission to create events.');
      } else if (err.response?.status === 409) {
        setCreateError(err.response?.data?.message || 'A conflicting event already exists.');
      } else {
        setCreateError(err.response?.data?.message || 'Failed to create event. Please try again.');
      }
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Helper for sort indicator icon
  const renderSortIndicator = (field) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-[#714B67]" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[#714B67]" aria-hidden="true" />
    );
  };

  // Active filter chip count & detection
  const hasActiveFilters =
    Boolean(submittedSearch) ||
    statusFilter !== 'all' ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    capacityFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Top Banner Alert */}
      {bannerAlert && (
        <div
          className={`p-4 rounded-lg border flex items-center justify-between shadow-sm transition-all ${
            bannerAlert.type === 'success'
              ? 'bg-teal-50 border-[#017E84]/30 text-[#017E84]'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
          role="alert"
        >
          <div className="flex items-center gap-3">
            {bannerAlert.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-[#017E84]" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            )}
            <span className="text-sm font-medium">{bannerAlert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerAlert(null)}
            className="p-1 rounded hover:bg-black/5 text-gray-500 focus:outline-none"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Auth Error Banner */}
      {authError && (
        <Alert variant="danger" title="Access Denied">
          {authError}
        </Alert>
      )}

      {/* Header Section */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#000000] tracking-tight">
              Event Management
            </h1>
            <Badge variant="purple">Admin</Badge>
          </div>
          <p className="text-sm text-[#8F8F8F] mt-1">
            Create, monitor, and manage campus events, capacity, and ticketing for LDCE Student Association.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setCreateModalOpen(true)}
          className="shrink-0 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Event</span>
        </Button>
      </div>

      {/* Search and Controls Section */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm space-y-4">
        {/* Search Mode Selector & Input */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Mode Switcher */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Search Mode:
            </span>
            <div className="inline-flex rounded border border-[#e2e5e9] p-0.5 bg-gray-50">
              <button
                type="button"
                onClick={() => handleModeChange('live')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                  searchMode === 'live'
                    ? 'bg-[#714B67] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-pressed={searchMode === 'live'}
              >
                Live Search (Debounced)
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('button')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                  searchMode === 'button'
                    ? 'bg-[#714B67] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-pressed={searchMode === 'button'}
              >
                Search Button
              </button>
            </div>
          </div>

          {/* Search Box Form */}
          <form
            onSubmit={handleButtonSearch}
            className="flex-1 flex items-center gap-2 max-w-xl"
          >
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                aria-hidden="true"
              />
              <Input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={
                  searchMode === 'live'
                    ? 'Type to live search events...'
                    : 'Type event title or location...'
                }
                className="pl-9 pr-8 h-10 w-full text-sm"
                aria-label="Search events"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Clear search text"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {searchMode === 'button' && (
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
                isLoading={loading}
                className="shrink-0 h-10"
              >
                Search
              </Button>
            )}
          </form>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-[#e2e5e9]">
          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="block text-xs font-semibold text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 text-xs rounded border border-[#e2e5e9] bg-white px-2.5 py-1 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label htmlFor="date-from" className="block text-xs font-semibold text-gray-700 mb-1">
              Date From
            </label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 text-xs"
            />
          </div>

          {/* Date To */}
          <div>
            <label htmlFor="date-to" className="block text-xs font-semibold text-gray-700 mb-1">
              Date To
            </label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 text-xs"
            />
          </div>

          {/* Capacity State Filter */}
          <div>
            <label htmlFor="capacity-filter" className="block text-xs font-semibold text-gray-700 mb-1">
              Capacity State
            </label>
            <select
              id="capacity-filter"
              value={capacityFilter}
              onChange={(e) => {
                setCapacityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 text-xs rounded border border-[#e2e5e9] bg-white px-2.5 py-1 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
            >
              {CAPACITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#e2e5e9]">
            <span className="text-xs text-gray-500 font-medium">Active Filters:</span>

            {submittedSearch && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#714B67]/10 text-[#714B67] text-xs font-semibold border border-[#714B67]/20">
                Search: "{submittedSearch}"
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="hover:text-red-700 focus:outline-none"
                  aria-label="Remove search filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#017E84]/10 text-[#017E84] text-xs font-semibold border border-[#017E84]/20">
                Status: {statusFilter}
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setCurrentPage(1);
                  }}
                  className="hover:text-red-700 focus:outline-none"
                  aria-label="Remove status filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {(dateFrom || dateTo) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E4A900]/15 text-[#8a6500] text-xs font-semibold border border-[#E4A900]/30">
                Date: {dateFrom || 'Any'} → {dateTo || 'Any'}
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setCurrentPage(1);
                  }}
                  className="hover:text-red-700 focus:outline-none"
                  aria-label="Remove date range filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {capacityFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-100 text-gray-800 text-xs font-semibold border border-gray-300">
                Capacity: {capacityFilter}
                <button
                  type="button"
                  onClick={() => {
                    setCapacityFilter('all');
                    setCurrentPage(1);
                  }}
                  className="hover:text-red-700 focus:outline-none"
                  aria-label="Remove capacity filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-xs text-red-600 hover:text-red-800 font-semibold underline ml-1 focus:outline-none"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Result Count Summary */}
      <div className="flex items-center justify-between text-xs text-gray-600 px-1">
        <div>
          {!loading && (
            <span>
              Showing{' '}
              <strong className="text-gray-900">
                {events.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}
              </strong>
              –
              <strong className="text-gray-900">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </strong>{' '}
              of <strong className="text-gray-900">{pagination.total}</strong> events
            </span>
          )}
        </div>
      </div>

      {/* Table & Content States */}
      {loading ? (
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-12 text-center shadow-sm">
          <LoadingSpinner className="mx-auto h-8 w-8 text-[#714B67]" />
          <p className="mt-3 text-sm text-gray-500 font-medium">Loading events from server...</p>
        </div>
      ) : tableError ? (
        <div className="bg-white border border-red-200 rounded-lg p-8 text-center shadow-sm space-y-3">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
          <h2 className="text-base font-bold text-gray-900">Unable to load events</h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto">{tableError}</p>
          <Button
            variant="outline"
            onClick={fetchEvents}
            className="inline-flex items-center gap-2 mt-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry</span>
          </Button>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-12 text-center shadow-sm">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-base font-bold text-gray-900">
            {submittedSearch || statusFilter !== 'all' || dateFrom || dateTo || capacityFilter !== 'all'
              ? 'No events match your search or filters.'
              : 'No events found.'}
          </h2>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            {hasActiveFilters
              ? 'Try modifying your search criteria or resetting filters.'
              : 'Get started by creating your first student organization event.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            {hasActiveFilters ? (
              <Button variant="outline" onClick={handleClearAllFilters}>
                Clear Filters
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Create Event
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Event Table */
        <div className="bg-white border border-[#e2e5e9] rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#e2e5e9]">
              <thead className="bg-[#F8F9FA]">
                <tr>
                  {/* Event Title */}
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Event</span>
                      {renderSortIndicator('title')}
                    </div>
                  </th>

                  {/* Date & Time */}
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date & Time</span>
                      {renderSortIndicator('date')}
                    </div>
                  </th>

                  {/* Location */}
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider"
                  >
                    Location
                  </th>

                  {/* Capacity */}
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('capacity')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Capacity</span>
                      {renderSortIndicator('capacity')}
                    </div>
                  </th>

                  {/* Sold Tickets */}
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('soldTickets')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Sold</span>
                      {renderSortIndicator('soldTickets')}
                    </div>
                  </th>

                  {/* Remaining */}
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('remainingCapacity')}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Remaining</span>
                      {renderSortIndicator('remainingCapacity')}
                    </div>
                  </th>

                  {/* Status */}
                  <th
                    scope="col"
                    className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Status</span>
                      {renderSortIndicator('status')}
                    </div>
                  </th>

                  {/* Actions */}
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e5e9] bg-white">
                {events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Event Title */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-sm text-[#000000]">
                        <Link
                          to={`/admin/events/${evt.id}`}
                          className="hover:text-[#714B67] hover:underline"
                        >
                          {evt.title}
                        </Link>
                      </div>
                      {evt.description && (
                        <div className="text-xs text-gray-500 line-clamp-1 mt-0.5 max-w-xs">
                          {evt.description}
                        </div>
                      )}
                    </td>

                    {/* Date & Time */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="text-xs font-medium text-gray-900">
                        {formatDateDisplay(evt.date)}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span>
                          {evt.startTime || '—'} – {evt.endTime || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3.5 text-xs text-gray-700 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate max-w-[150px]">{evt.location || '—'}</span>
                      </div>
                    </td>

                    {/* Capacity */}
                    <td className="px-4 py-3.5 text-xs text-right font-medium text-gray-900 whitespace-nowrap">
                      {Number(evt.capacity || 0).toLocaleString()}
                    </td>

                    {/* Sold Tickets */}
                    <td className="px-4 py-3.5 text-xs text-right font-semibold text-[#714B67] whitespace-nowrap">
                      {Number(evt.soldTickets || 0).toLocaleString()}
                    </td>

                    {/* Remaining Capacity */}
                    <td className="px-4 py-3.5 text-xs text-right font-medium whitespace-nowrap">
                      <span
                        className={
                          (evt.remainingCapacity ?? evt.capacity) <= 0
                            ? 'text-red-600 font-bold'
                            : 'text-[#017E84] font-semibold'
                        }
                      >
                        {Number(evt.remainingCapacity ?? evt.capacity).toLocaleString()}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <Badge>{evt.status}</Badge>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <Link
                        to={`/admin/events/${evt.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-[#714B67]/10 text-[#714B67] hover:bg-[#714B67] hover:text-white transition-colors"
                        title="View Event Command Center"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-[#e2e5e9] bg-[#F8F9FA] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-600">
              Page <strong className="text-gray-900">{pagination.page}</strong> of{' '}
              <strong className="text-gray-900">{pagination.totalPages}</strong>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 text-xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="flex items-center gap-1 text-xs"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-event-modal-title"
        >
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#e2e5e9]">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#714B67]" />
                <h2 id="create-event-modal-title" className="text-lg font-bold text-gray-900">
                  Create New Event
                </h2>
              </div>
              <button
                type="button"
                onClick={() => !createSubmitting && setCreateModalOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="Close dialog"
                disabled={createSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mt-4 p-3 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              {/* Event Title */}
              <div>
                <label htmlFor="evt-title" className="block text-xs font-semibold text-gray-700 mb-1">
                  Event Title <span className="text-red-500">*</span>
                </label>
                <Input
                  id="evt-title"
                  name="title"
                  type="text"
                  required
                  value={createForm.title}
                  onChange={handleCreateInputChange}
                  placeholder="e.g. LDCE Annual Tech Symposium"
                  className="w-full text-sm"
                  disabled={createSubmitting}
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="evt-desc" className="block text-xs font-semibold text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="evt-desc"
                  name="description"
                  required
                  rows={3}
                  value={createForm.description}
                  onChange={handleCreateInputChange}
                  placeholder="Provide comprehensive details about this student event..."
                  className="w-full rounded border border-[#e2e5e9] p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  disabled={createSubmitting}
                />
              </div>

              {/* Date & Times */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="evt-date" className="block text-xs font-semibold text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="evt-date"
                    name="date"
                    type="date"
                    required
                    value={createForm.date}
                    onChange={handleCreateInputChange}
                    className="w-full text-xs"
                    disabled={createSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="evt-start" className="block text-xs font-semibold text-gray-700 mb-1">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="evt-start"
                    name="startTime"
                    type="time"
                    required
                    value={createForm.startTime}
                    onChange={handleCreateInputChange}
                    className="w-full text-xs"
                    disabled={createSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="evt-end" className="block text-xs font-semibold text-gray-700 mb-1">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="evt-end"
                    name="endTime"
                    type="time"
                    required
                    value={createForm.endTime}
                    onChange={handleCreateInputChange}
                    className="w-full text-xs"
                    disabled={createSubmitting}
                  />
                </div>
              </div>

              {/* Location & Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="evt-location" className="block text-xs font-semibold text-gray-700 mb-1">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="evt-location"
                    name="location"
                    type="text"
                    required
                    value={createForm.location}
                    onChange={handleCreateInputChange}
                    placeholder="e.g. LDCE Auditorium Block C"
                    className="w-full text-sm"
                    disabled={createSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="evt-capacity" className="block text-xs font-semibold text-gray-700 mb-1">
                    Capacity (Seats) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="evt-capacity"
                    name="capacity"
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={createForm.capacity}
                    onChange={handleCreateInputChange}
                    placeholder="e.g. 500"
                    className="w-full text-sm"
                    disabled={createSubmitting}
                  />
                </div>
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded border border-[#e2e5e9]">
                <strong>Lifecycle Notice:</strong> Newly created events start with status{' '}
                <Badge variant="gold">DRAFT</Badge>. You can configure ticket types and publish the event
                from the Event Command Center.
              </div>

              {/* Modal Actions */}
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
                  variant="primary"
                  disabled={createSubmitting}
                  isLoading={createSubmitting}
                >
                  Create Event
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
