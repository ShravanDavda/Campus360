import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Megaphone,
  Search,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Send,
  Archive,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Users,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { adminService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Audiences' },
  { value: 'ALL_MEMBERS', label: 'All Members' },
];

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

const formatAudienceLabel = (aud) => {
  if (!aud) return 'All Members';
  if (aud === 'ALL_MEMBERS') return 'All Members';
  return aud;
};

export default function AdminAnnouncements() {
  const navigate = useNavigate();

  // Authentication check
  const [authError] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role && user.role !== 'admin') {
        return '403 Forbidden: Administrator privileges required to access Admin Announcements.';
      }
    } catch {
      // rely on backend auth
    }
    return '';
  });

  // Announcements list & pagination state
  const [announcements, setAnnouncements] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Search state — DEBOUNCED LIVE SEARCH ONLY (~350ms)
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filters state
  const [statusFilter, setStatusFilter] = useState('all');
  const [audienceFilter, setAudienceFilter] = useState('all');

  // Sorting state (server-side)
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Request sequencing to prevent stale search responses
  const activeRequestIdRef = useRef(0);

  // Notification / Toast
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Create Announcement Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    title: '',
    content: '',
    audience: 'ALL_MEMBERS',
  });

  // Quick Status Action Modal (Publish / Archive)
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusTargetAnnouncement, setStatusTargetAnnouncement] = useState(null);
  const [statusTargetValue, setStatusTargetValue] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Debounce search input (~350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Authoritative fetch call
  const fetchAnnouncements = useCallback(
    async (pageToLoad = currentPage) => {
      const requestId = ++activeRequestIdRef.current;
      setLoading(true);
      setTableError('');

      try {
        const params = {
          page: pageToLoad,
          limit: 20,
          search: debouncedSearch || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          audience: audienceFilter !== 'all' ? audienceFilter : undefined,
          sortBy,
          sortOrder,
        };

        const res = await adminService.getAdminAnnouncements(params);

        // Prevent stale responses
        if (requestId !== activeRequestIdRef.current) return;

        const data = res.data?.data || {};
        const items = data.announcements || [];
        const pag = data.pagination || {};

        setAnnouncements(items);
        setPagination({
          page: pag.page || pageToLoad,
          limit: pag.limit || 20,
          totalItems: pag.totalItems !== undefined ? pag.totalItems : items.length,
          totalPages: pag.totalPages !== undefined ? pag.totalPages : Math.max(1, Math.ceil((pag.totalItems || items.length) / 20)),
        });
      } catch (err) {
        if (requestId !== activeRequestIdRef.current) return;

        if (err.response?.status === 403) {
          setTableError('403 Forbidden: Administrator privileges required.');
        } else if (err.response?.status === 401) {
          setTableError('401 Unauthorized: Session expired. Please sign in again.');
        } else {
          const msg =
            err.response?.data?.error?.message ||
            err.response?.data?.message ||
            'Failed to load announcements. Please retry.';
          setTableError(msg);
        }
        setAnnouncements([]);
      } finally {
        if (requestId === activeRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [currentPage, debouncedSearch, statusFilter, audienceFilter, sortBy, sortOrder]
  );

  useEffect(() => {
    fetchAnnouncements(currentPage);
  }, [fetchAnnouncements, currentPage]);

  // Handle Sort Change (server-side)
  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnKey);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (columnKey) => {
    if (sortBy !== columnKey) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-700" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-[#714B67]" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[#714B67]" />
    );
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setAudienceFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = debouncedSearch || statusFilter !== 'all' || audienceFilter !== 'all';

  // Handle Create Announcement
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim()) {
      setCreateError('Title is required.');
      return;
    }
    if (!createForm.content.trim()) {
      setCreateError('Content is required.');
      return;
    }

    setCreateSubmitting(true);
    setCreateError('');

    try {
      const payload = {
        title: createForm.title.trim(),
        content: createForm.content.trim(),
        audience: createForm.audience || 'ALL_MEMBERS',
      };

      const res = await adminService.createAdminAnnouncement(payload);
      const created = res.data?.data?.announcement || res.data?.data;

      showToast(`Announcement "${created?.title || payload.title}" created successfully.`);
      setCreateModalOpen(false);
      setCreateForm({
        title: '',
        content: '',
        audience: 'ALL_MEMBERS',
      });
      fetchAnnouncements(1);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to create announcement. Please check inputs and try again.';
      setCreateError(msg);
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Handle Status Update (Publish / Archive)
  const handleStatusSubmit = async () => {
    if (!statusTargetAnnouncement || !statusTargetValue) return;

    setStatusSubmitting(true);
    setStatusError('');

    try {
      const annId = statusTargetAnnouncement.id || statusTargetAnnouncement._id;
      await adminService.updateAdminAnnouncementStatus(annId, statusTargetValue);

      showToast(
        `Announcement marked as ${statusTargetValue === 'PUBLISHED' ? 'Published' : 'Archived'} successfully.`
      );
      setStatusModalOpen(false);
      setStatusTargetAnnouncement(null);
      fetchAnnouncements(currentPage);
    } catch (err) {
      if (err.response?.status === 409) {
        setStatusError(
          err.response?.data?.error?.message ||
            'Invalid status transition: This announcement cannot transition to the requested state.'
        );
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to update status. Please try again.';
        setStatusError(msg);
      }
    } finally {
      setStatusSubmitting(false);
    }
  };

  if (authError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-red-900">Access Restricted</h2>
            <p className="text-sm text-red-700">{authError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="mt-2"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between shadow-sm transition-all ${
            notification.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-[#017E84]/10 border border-[#017E84]/30 text-[#017E84]'
          }`}
          role="status"
        >
          <div className="flex items-center gap-2">
            {notification.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-[#017E84]" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#e2e5e9] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Admin Announcements
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            LDCE Student Association • Publish organizational news, official notices, and bulletins to members.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAnnouncements(currentPage)}
            className="flex items-center gap-1.5"
            disabled={loading}
          >
            <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setCreateError('');
              setCreateModalOpen(true);
            }}
            className="bg-[#714B67] hover:bg-[#5a3b52] text-white flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Create Announcement</span>
          </Button>
        </div>
      </div>

      {/* 2. Search & Filters Toolbar */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* DEBOUNCED LIVE SEARCH ONLY — No search button, no search-mode toggle */}
          <div className="relative flex-1">
            <label htmlFor="announcement-search" className="sr-only">
              Search announcements
            </label>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="announcement-search"
              type="text"
              placeholder="Live search by announcement title or content..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-9 w-full"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                aria-label="Clear search input"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-[280px]">
            {/* Status Filter */}
            <div>
              <label htmlFor="status-filter" className="sr-only">
                Filter by Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-sm border border-[#e2e5e9] rounded-md px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Audience Filter */}
            <div>
              <label htmlFor="audience-filter" className="sr-only">
                Filter by Audience
              </label>
              <select
                id="audience-filter"
                value={audienceFilter}
                onChange={(e) => {
                  setAudienceFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-sm border border-[#e2e5e9] rounded-md px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]"
              >
                {AUDIENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#f1f3f5]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Filter className="h-3 w-3" /> Active:
              </span>
              {debouncedSearch && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#714B67]/10 text-[#714B67] border border-[#714B67]/20">
                  Search: "{debouncedSearch}"
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="hover:text-red-600 ml-0.5"
                    aria-label="Remove search filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                  Status: {statusFilter}
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('all');
                      setCurrentPage(1);
                    }}
                    className="hover:text-red-600 ml-0.5"
                    aria-label="Remove status filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {audienceFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                  Audience: {formatAudienceLabel(audienceFilter)}
                  <button
                    type="button"
                    onClick={() => {
                      setAudienceFilter('all');
                      setCurrentPage(1);
                    }}
                    className="hover:text-red-600 ml-0.5"
                    aria-label="Remove audience filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs text-gray-600 hover:text-gray-900"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>

      {/* Error Banner with Retry */}
      {tableError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between text-sm text-red-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <span>{tableError}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchAnnouncements(currentPage)}
            className="flex items-center gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* 3. Announcements Table */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#e2e5e9] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Announcements List</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Official publications and bulletin records
            </p>
          </div>
          <div className="text-xs text-gray-500 font-medium">
            {loading ? (
              <span className="flex items-center gap-1.5">
                <LoadingSpinner size="sm" /> Loading announcements...
              </span>
            ) : (
              <span>
                Showing {announcements.length} of {pagination.totalItems} announcement
                {pagination.totalItems === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#e2e5e9] text-left text-sm">
            <thead className="bg-[#F8F9FA] text-xs font-semibold uppercase tracking-wider text-gray-600">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3.5 cursor-pointer group hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Title</span>
                    {getSortIcon('title')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 cursor-pointer group hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    {getSortIcon('status')}
                  </div>
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Audience / Visibility
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 cursor-pointer group hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('publishedAt')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Published At</span>
                    {getSortIcon('publishedAt')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 cursor-pointer group hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('updatedAt')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Updated At</span>
                    {getSortIcon('updatedAt')}
                  </div>
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e5e9] bg-white">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-48"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="h-8 bg-gray-200 rounded w-20 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-gray-400">
                        <Megaphone className="h-6 w-6" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">
                        No announcements found
                      </h3>
                      <p className="text-sm text-gray-500">
                        {hasActiveFilters
                          ? 'No announcements match the selected search and filter criteria.'
                          : 'No announcements have been created yet.'}
                      </p>
                      {hasActiveFilters ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearFilters}
                          className="mt-2"
                        >
                          Clear Filters
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setCreateError('');
                            setCreateModalOpen(true);
                          }}
                          className="mt-2 bg-[#714B67] hover:bg-[#5a3b52] text-white"
                        >
                          Create Announcement
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                announcements.map((ann) => {
                  const annId = ann.id || ann._id;
                  const isDraft = String(ann.status).toUpperCase() === 'DRAFT';
                  const isPublished = String(ann.status).toUpperCase() === 'PUBLISHED';

                  return (
                    <tr key={annId} className="hover:bg-gray-50/80 transition-colors">
                      {/* Title */}
                      <td className="px-4 py-3.5 font-medium text-gray-900 max-w-xs sm:max-w-sm truncate">
                        <Link
                          to={`/admin/announcements/${annId}`}
                          className="text-[#714B67] hover:underline font-semibold"
                        >
                          {ann.title || 'Untitled Announcement'}
                        </Link>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <Badge>{ann.status || 'DRAFT'}</Badge>
                      </td>

                      {/* Audience */}
                      <td className="px-4 py-3.5 text-xs text-gray-600">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Users className="h-3.5 w-3.5 text-gray-400" />
                          {formatAudienceLabel(ann.audience)}
                        </span>
                      </td>

                      {/* Published At */}
                      <td className="px-4 py-3.5 text-xs text-gray-600">
                        {ann.publishedAt ? formatDateDisplay(ann.publishedAt) : <span className="text-gray-400">—</span>}
                      </td>

                      {/* Updated At */}
                      <td className="px-4 py-3.5 text-xs text-gray-600">
                        {formatDateDisplay(ann.updatedAt || ann.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/announcements/${annId}`)}
                            className="h-8 px-2 text-[#714B67] hover:text-[#5a3b52] hover:bg-[#714B67]/10"
                            aria-label={`View announcement ${ann.title}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>

                          {isDraft && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setStatusTargetAnnouncement(ann);
                                setStatusTargetValue('PUBLISHED');
                                setStatusError('');
                                setStatusModalOpen(true);
                              }}
                              className="h-8 px-2 text-[#017E84] hover:text-[#015f64] hover:bg-[#017E84]/10"
                              aria-label={`Publish announcement ${ann.title}`}
                            >
                              <Send className="h-3.5 w-3.5 mr-1" />
                              Publish
                            </Button>
                          )}

                          {isPublished && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setStatusTargetAnnouncement(ann);
                                setStatusTargetValue('ARCHIVED');
                                setStatusError('');
                                setStatusModalOpen(true);
                              }}
                              className="h-8 px-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                              aria-label={`Archive announcement ${ann.title}`}
                            >
                              <Archive className="h-3.5 w-3.5 mr-1" />
                              Archive
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Server-side Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-[#e2e5e9] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F8F9FA]">
            <div className="text-xs text-gray-600">
              Page <span className="font-semibold text-gray-900">{pagination.page}</span> of{' '}
              <span className="font-semibold text-gray-900">{pagination.totalPages}</span> (
              {pagination.totalItems} total announcements)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1 || loading}
                className="flex items-center gap-1 text-xs"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="flex items-center gap-1 text-xs"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Announcement Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl w-full max-w-xl overflow-hidden">
            <div className="p-5 border-b border-[#e2e5e9] flex items-center justify-between bg-[#F8F9FA]">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-[#714B67]" />
                <h3 className="text-base font-bold text-gray-900">Create Announcement</h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label htmlFor="create-ann-title" className="text-xs font-semibold text-gray-700">
                  Announcement Title <span className="text-red-500">*</span>
                </label>
                <Input
                  id="create-ann-title"
                  type="text"
                  placeholder="e.g. Annual Technical Festival 2026 Announced"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full"
                  required
                />
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <label htmlFor="create-ann-content" className="text-xs font-semibold text-gray-700">
                  Notice Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="create-ann-content"
                  rows={5}
                  placeholder="Enter the full official announcement text for members..."
                  value={createForm.content}
                  onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                  className="w-full text-sm border border-[#e2e5e9] rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[#714B67] bg-white text-gray-900"
                  required
                />
              </div>

              {/* Audience */}
              <div className="space-y-1.5">
                <label htmlFor="create-ann-audience" className="text-xs font-semibold text-gray-700">
                  Target Audience
                </label>
                <select
                  id="create-ann-audience"
                  value={createForm.audience}
                  onChange={(e) => setCreateForm({ ...createForm, audience: e.target.value })}
                  className="w-full text-sm border border-[#e2e5e9] rounded-md px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]"
                >
                  <option value="ALL_MEMBERS">All Members (LDCE Student Association)</option>
                </select>
                <p className="text-xs text-gray-500">
                  Announcements are initially created in DRAFT state and can be reviewed before publishing.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[#e2e5e9] flex justify-end items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={createSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createSubmitting}
                  className="bg-[#714B67] hover:bg-[#5a3b52] text-white flex items-center gap-1.5"
                >
                  {createSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Announcement</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Status Modal (Publish / Archive) */}
      {statusModalOpen && statusTargetAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-[#e2e5e9] flex items-center justify-between bg-[#F8F9FA]">
              <h3 className="text-base font-bold text-gray-900">
                {statusTargetValue === 'PUBLISHED' ? 'Publish Announcement' : 'Archive Announcement'}
              </h3>
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {statusError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span>{statusError}</span>
                </div>
              )}

              <p className="text-sm text-gray-700">
                Are you sure you want to mark "
                <span className="font-semibold text-gray-900">{statusTargetAnnouncement.title}</span>
                " as{' '}
                <span className="font-bold text-[#714B67]">
                  {statusTargetValue === 'PUBLISHED' ? 'PUBLISHED' : 'ARCHIVED'}
                </span>
                ?
              </p>

              {statusTargetValue === 'PUBLISHED' ? (
                <p className="text-xs text-gray-500">
                  Once published, this announcement will become visible to all active organization members on their bulletins board.
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  Archiving retires this notice from active member view while keeping it preserved in the association historical record.
                </p>
              )}

              <div className="pt-3 border-t border-[#e2e5e9] flex justify-end items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusModalOpen(false)}
                  disabled={statusSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleStatusSubmit}
                  disabled={statusSubmitting}
                  className={
                    statusTargetValue === 'PUBLISHED'
                      ? 'bg-[#017E84] hover:bg-[#015f64] text-white flex items-center gap-1.5'
                      : 'bg-gray-800 hover:bg-gray-900 text-white flex items-center gap-1.5'
                  }
                >
                  {statusSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Confirm {statusTargetValue === 'PUBLISHED' ? 'Publish' : 'Archive'}</span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
