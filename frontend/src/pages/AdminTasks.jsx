import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  CheckSquare,
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
  Calendar,
  UserCheck,
  Play,
  Check,
  Ban,
} from 'lucide-react';
import { adminService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const ASSIGNMENT_OPTIONS = [
  { value: 'ALL', label: 'All Assignments' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'UNASSIGNED', label: 'Unassigned' },
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

export default function AdminTasks() {
  const navigate = useNavigate();

  // Authentication check
  const [authError] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role && user.role !== 'admin') {
        return '403 Forbidden: Administrator privileges required to access Admin Task Management.';
      }
    } catch {
      // rely on backend auth
    }
    return '';
  });

  // Task list & pagination state
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
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
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('ALL');
  const [volunteerFilter, setVolunteerFilter] = useState('all');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');

  // Volunteers dropdown list (loaded from real backend)
  const [volunteersList, setVolunteersList] = useState([]);

  // Sorting state (server-side)
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Request sequencing to prevent stale search responses
  const activeRequestIdRef = useRef(0);

  // Create Task Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
  });

  // Quick Status Confirmation modal state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusTargetTask, setStatusTargetTask] = useState(null);
  const [statusTargetValue, setStatusTargetValue] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Notification / Toast banner
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Load volunteers list for the volunteer filter dropdown
  useEffect(() => {
    let isMounted = true;
    adminService
      .getAdminVolunteers({ limit: 100 })
      .then((res) => {
        if (!isMounted) return;
        const list = res.data?.data?.volunteers || [];
        setVolunteersList(list);
      })
      .catch(() => {
        // non-blocking
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounce search input (~350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Fetch tasks authoritative method
  const fetchTasks = useCallback(
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
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          assignment: assignmentFilter !== 'ALL' ? assignmentFilter : undefined,
          volunteerId: volunteerFilter !== 'all' ? volunteerFilter : undefined,
          dueDateFrom: dueDateFrom || undefined,
          dueDateTo: dueDateTo || undefined,
          sortBy,
          sortOrder,
        };

        const res = await adminService.getAdminTasks(params);

        // Discard stale response
        if (requestId !== activeRequestIdRef.current) return;

        const data = res.data?.data || {};
        const items = data.tasks || [];
        const pag = data.pagination || {};

        setTasks(items);
        setPagination({
          page: pag.page || pageToLoad,
          limit: pag.limit || 20,
          total: pag.totalItems !== undefined ? pag.totalItems : pag.total !== undefined ? pag.total : items.length,
          totalPages: pag.totalPages !== undefined ? pag.totalPages : Math.ceil((pag.total || items.length) / 20) || 1,
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
            'Failed to load tasks. Please try again.';
          setTableError(msg);
        }
        setTasks([]);
      } finally {
        if (requestId === activeRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [
      currentPage,
      debouncedSearch,
      statusFilter,
      priorityFilter,
      assignmentFilter,
      volunteerFilter,
      dueDateFrom,
      dueDateTo,
      sortBy,
      sortOrder,
    ]
  );

  useEffect(() => {
    fetchTasks(currentPage);
  }, [fetchTasks, currentPage]);

  // Handle Sort Change (server-side)
  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnKey);
      setSortOrder(columnKey === 'dueDate' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setAssignmentFilter('ALL');
    setVolunteerFilter('all');
    setDueDateFrom('');
    setDueDateTo('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    assignmentFilter !== 'ALL' ||
    volunteerFilter !== 'all' ||
    Boolean(dueDateFrom) ||
    Boolean(dueDateTo);

  // Handle Create Task Submission
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');

    const titleTrim = createForm.title.trim();
    if (!titleTrim) {
      setCreateError('Title is required and cannot be empty.');
      return;
    }

    if (createForm.dueDate) {
      const d = new Date(createForm.dueDate);
      if (isNaN(d.getTime())) {
        setCreateError('Please enter a valid due date.');
        return;
      }
    }

    setCreateSubmitting(true);
    try {
      const payload = {
        title: titleTrim,
        description: createForm.description.trim(),
        priority: createForm.priority,
        dueDate: createForm.dueDate || null,
      };

      const res = await adminService.createAdminTask(payload);
      showToast('Task created successfully.', 'success');
      setCreateModalOpen(false);
      setCreateForm({
        title: '',
        description: '',
        priority: 'MEDIUM',
        dueDate: '',
      });

      const newTaskId = res.data?.data?.taskId || res.data?.data?.id;
      if (newTaskId) {
        navigate(`/admin/tasks/${newTaskId}`);
      } else {
        fetchTasks(1);
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to create task. Please verify your inputs.';
      setCreateError(msg);
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Quick Status confirmation modal
  const openStatusConfirm = (task, targetStatus) => {
    setStatusTargetTask(task);
    setStatusTargetValue(targetStatus);
    setStatusError('');
    setStatusModalOpen(true);
  };

  // Execute Quick Status change
  const handleExecuteStatusChange = async () => {
    if (!statusTargetTask || !statusTargetValue) return;
    setStatusSubmitting(true);
    setStatusError('');

    try {
      await adminService.updateAdminTaskStatus(statusTargetTask.id, statusTargetValue);
      showToast(`Task status updated to ${statusTargetValue}.`, 'success');
      setStatusModalOpen(false);
      setStatusTargetTask(null);
      fetchTasks(currentPage);
    } catch (err) {
      if (err.response?.status === 409) {
        setStatusError(
          err.response?.data?.error?.message ||
            'Conflict (409): The status could not be transitioned. State will be refreshed.'
        );
        fetchTasks(currentPage);
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to update status.';
        setStatusError(msg);
      }
    } finally {
      setStatusSubmitting(false);
    }
  };

  if (authError) {
    return (
      <div className="p-6 bg-white border border-red-200 rounded-lg text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" aria-hidden="true" />
        <h2 className="text-lg font-bold text-gray-900 mb-1">Access Denied</h2>
        <p className="text-sm text-gray-600 mb-4">{authError}</p>
        <Button onClick={() => navigate('/dashboard')} className="bg-[#714B67] hover:bg-[#5a3a52] text-white">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center justify-between p-4 rounded-lg border text-sm font-medium transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-gray-500 hover:text-gray-700 p-1"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-lg border border-[#e2e5e9] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-6 h-6 text-[#714B67]" aria-hidden="true" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#000000]">Task Management</h1>
          </div>
          <p className="text-sm text-gray-600">
            Create, assign, execute, and monitor volunteer operations across CAMPUS360.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/volunteers"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded border border-[#e2e5e9] transition-colors"
          >
            <UserCheck className="w-4 h-4 text-[#017E84]" aria-hidden="true" />
            <span>Volunteers</span>
          </Link>
          <Button
            id="create-task-button"
            onClick={() => {
              setCreateError('');
              setCreateModalOpen(true);
            }}
            className="bg-[#714B67] hover:bg-[#5a3a52] text-white flex items-center gap-2 text-xs sm:text-sm font-semibold px-4 py-2"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Create Task</span>
          </Button>
        </div>
      </div>

      {/* Filter & Live Search Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-[#e2e5e9] space-y-3 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Debounced Live Search */}
          <div className="md:col-span-2 relative">
            <label htmlFor="task-search-input" className="sr-only">
              Search Tasks
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <Input
                id="task-search-input"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search tasks by title or description..."
                className="pl-9 pr-8 text-sm"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  aria-label="Clear search text"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="task-status-filter" className="sr-only">
              Filter by Status
            </label>
            <select
              id="task-status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3 text-sm bg-white border border-[#e2e5e9] rounded focus:outline-none focus:ring-2 focus:ring-[#714B67]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label htmlFor="task-priority-filter" className="sr-only">
              Filter by Priority
            </label>
            <select
              id="task-priority-filter"
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3 text-sm bg-white border border-[#e2e5e9] rounded focus:outline-none focus:ring-2 focus:ring-[#714B67]"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Filters row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-[#e2e5e9]">
          {/* Assignment Filter */}
          <div>
            <label htmlFor="task-assignment-filter" className="block text-xs font-medium text-gray-600 mb-1">
              Assignment
            </label>
            <select
              id="task-assignment-filter"
              value={assignmentFilter}
              onChange={(e) => {
                setAssignmentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-2 text-xs sm:text-sm bg-white border border-[#e2e5e9] rounded focus:outline-none focus:ring-1 focus:ring-[#714B67]"
            >
              {ASSIGNMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Volunteer Filter */}
          <div>
            <label htmlFor="task-volunteer-filter" className="block text-xs font-medium text-gray-600 mb-1">
              Volunteer
            </label>
            <select
              id="task-volunteer-filter"
              value={volunteerFilter}
              onChange={(e) => {
                setVolunteerFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-2 text-xs sm:text-sm bg-white border border-[#e2e5e9] rounded focus:outline-none focus:ring-1 focus:ring-[#714B67]"
            >
              <option value="all">All Volunteers</option>
              {volunteersList.map((vol) => (
                <option key={vol.id} value={vol.id}>
                  {vol.name}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date From */}
          <div>
            <label htmlFor="task-date-from" className="block text-xs font-medium text-gray-600 mb-1">
              Due Date From
            </label>
            <input
              id="task-date-from"
              type="date"
              value={dueDateFrom}
              onChange={(e) => {
                setDueDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-2 text-xs sm:text-sm bg-white border border-[#e2e5e9] rounded focus:outline-none focus:ring-1 focus:ring-[#714B67]"
            />
          </div>

          {/* Due Date To */}
          <div>
            <label htmlFor="task-date-to" className="block text-xs font-medium text-gray-600 mb-1">
              Due Date To
            </label>
            <input
              id="task-date-to"
              type="date"
              value={dueDateTo}
              onChange={(e) => {
                setDueDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-9 px-2 text-xs sm:text-sm bg-white border border-[#e2e5e9] rounded focus:outline-none focus:ring-1 focus:ring-[#714B67]"
            />
          </div>
        </div>

        {/* Active Filter Chips & Clear Action */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#e2e5e9]">
            <span className="text-xs font-medium text-gray-500">Active Filters:</span>
            {debouncedSearch && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800 border border-gray-200">
                Search: "{debouncedSearch}"
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  aria-label="Remove search filter"
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800 border border-gray-200">
                Status: {statusFilter}
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  aria-label="Remove status filter"
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {priorityFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800 border border-gray-200">
                Priority: {priorityFilter}
                <button
                  type="button"
                  onClick={() => setPriorityFilter('all')}
                  aria-label="Remove priority filter"
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {assignmentFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800 border border-gray-200">
                Assignment: {assignmentFilter}
                <button
                  type="button"
                  onClick={() => setAssignmentFilter('ALL')}
                  aria-label="Remove assignment filter"
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {volunteerFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800 border border-gray-200">
                Volunteer: {volunteersList.find((v) => v.id === volunteerFilter)?.name || volunteerFilter}
                <button
                  type="button"
                  onClick={() => setVolunteerFilter('all')}
                  aria-label="Remove volunteer filter"
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {(dueDateFrom || dueDateTo) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800 border border-gray-200">
                Due: {dueDateFrom || 'Start'} → {dueDateTo || 'End'}
                <button
                  type="button"
                  onClick={() => {
                    setDueDateFrom('');
                    setDueDateTo('');
                  }}
                  aria-label="Remove due date filters"
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-[#714B67] hover:underline font-semibold ml-auto flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Table / Content Section */}
      <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <LoadingSpinner size="lg" className="text-[#714B67]" />
            <p className="text-sm text-gray-500">Loading tasks from authoritative backend...</p>
          </div>
        ) : tableError ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-semibold text-gray-900 mb-1">{tableError}</p>
            <Button
              onClick={() => fetchTasks(currentPage)}
              variant="outline"
              className="mt-3 text-xs inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </Button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center">
            <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              {hasActiveFilters ? 'No tasks match your current filters.' : 'No tasks found.'}
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
              {hasActiveFilters
                ? 'Try adjusting your search query, priority, or status filters.'
                : 'Get started by creating the first operational task for your volunteers.'}
            </p>
            {hasActiveFilters ? (
              <Button onClick={handleClearFilters} variant="outline" className="text-xs">
                Clear Filters
              </Button>
            ) : (
              <Button
                onClick={() => setCreateModalOpen(true)}
                className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Create Task
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-[#e2e5e9] text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th scope="col" className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleSort('title')}
                        className="inline-flex items-center gap-1 hover:text-gray-900 focus:outline-none"
                      >
                        <span>Task</span>
                        {sortBy === 'title' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#714B67]" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-[#714B67]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th scope="col" className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleSort('priority')}
                        className="inline-flex items-center gap-1 hover:text-gray-900 focus:outline-none"
                      >
                        <span>Priority</span>
                        {sortBy === 'priority' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#714B67]" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-[#714B67]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th scope="col" className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleSort('status')}
                        className="inline-flex items-center gap-1 hover:text-gray-900 focus:outline-none"
                      >
                        <span>Status</span>
                        {sortBy === 'status' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#714B67]" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-[#714B67]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th scope="col" className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleSort('dueDate')}
                        className="inline-flex items-center gap-1 hover:text-gray-900 focus:outline-none"
                      >
                        <span>Due Date</span>
                        {sortBy === 'dueDate' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#714B67]" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-[#714B67]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th scope="col" className="py-3 px-4">
                      <span>Assigned Volunteers</span>
                    </th>
                    <th scope="col" className="py-3 px-4">
                      <span>Progress</span>
                    </th>
                    <th scope="col" className="py-3 px-4 text-right">
                      <span>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e5e9]">
                  {tasks.map((task) => {
                    const volunteers = task.assignedVolunteers || [];
                    const isPending = task.status === 'PENDING' || task.status === 'TODO';
                    const isInProgress = task.status === 'IN_PROGRESS';

                    return (
                      <tr key={task.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-4 max-w-xs">
                          <Link
                            to={`/admin/tasks/${task.id}`}
                            className="font-semibold text-gray-900 hover:text-[#714B67] line-clamp-1"
                          >
                            {task.title}
                          </Link>
                          {task.description && (
                            <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{task.description}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge>{task.priority || 'MEDIUM'}</Badge>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge>{task.status}</Badge>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-xs text-gray-600">
                          {task.dueDate ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
                              {formatDateDisplay(task.dueDate)}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {volunteers.length === 0 ? (
                            <span className="text-xs text-gray-400 italic">Unassigned</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {volunteers.map((vol) => (
                                <Link
                                  key={vol.id || vol.volunteerId}
                                  to={`/admin/volunteers/${vol.volunteerId || vol.id}`}
                                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-[#017E84]/10 text-[#017E84] hover:bg-[#017E84]/20 transition-colors"
                                >
                                  <UserCheck className="w-3 h-3" />
                                  <span>{vol.name}</span>
                                </Link>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {task.progress !== null && task.progress !== undefined ? (
                            <div className="w-24">
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>{task.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-[#017E84] h-1.5 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => openStatusConfirm(task, 'IN_PROGRESS')}
                                title="Start Task"
                                className="p-1.5 rounded text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition-colors"
                                aria-label={`Start task ${task.title}`}
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isInProgress && (
                              <button
                                type="button"
                                onClick={() => openStatusConfirm(task, 'COMPLETED')}
                                title="Mark Completed"
                                className="p-1.5 rounded text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition-colors"
                                aria-label={`Mark task ${task.title} completed`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {(isPending || isInProgress) && (
                              <button
                                type="button"
                                onClick={() => openStatusConfirm(task, 'CANCELLED')}
                                title="Cancel Task"
                                className="p-1.5 rounded text-red-700 hover:bg-red-50 border border-red-200 transition-colors"
                                aria-label={`Cancel task ${task.title}`}
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <Link
                              to={`/admin/tasks/${task.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#714B67] bg-[#714B67]/10 hover:bg-[#714B67]/20 rounded transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>View</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 bg-gray-50/70 border-t border-[#e2e5e9] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-gray-600">
              <div>
                Showing page <span className="font-semibold text-gray-900">{pagination.page}</span> of{' '}
                <span className="font-semibold text-gray-900">{pagination.totalPages || 1}</span>{' '}
                ({pagination.total} total {pagination.total === 1 ? 'task' : 'tasks'})
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="flex items-center gap-1 text-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="flex items-center gap-1 text-xs"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* CREATE TASK MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-none">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-task-modal-title"
            className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
          >
            <div className="px-6 py-4 border-b border-[#e2e5e9] flex items-center justify-between">
              <h2 id="create-task-modal-title" className="text-lg font-bold text-gray-900">
                Create New Task
              </h2>
              <button
                type="button"
                onClick={() => !createSubmitting && setCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close create task modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label htmlFor="create-task-title" className="block text-xs font-semibold text-gray-800 mb-1">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <Input
                  id="create-task-title"
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Venue Setup and AV Check"
                  className="text-sm"
                />
              </div>

              <div>
                <label htmlFor="create-task-description" className="block text-xs font-semibold text-gray-800 mb-1">
                  Description
                </label>
                <textarea
                  id="create-task-description"
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Provide detailed instructions for volunteers..."
                  className="w-full p-2.5 text-sm bg-white border border-[#e2e5e9] rounded focus:outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="create-task-priority" className="block text-xs font-semibold text-gray-800 mb-1">
                    Priority
                  </label>
                  <select
                    id="create-task-priority"
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full h-10 px-3 text-sm bg-white border border-[#e2e5e9] rounded focus:outline-none focus:ring-2 focus:ring-[#714B67]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="create-task-duedate" className="block text-xs font-semibold text-gray-800 mb-1">
                    Due Date
                  </label>
                  <input
                    id="create-task-duedate"
                    type="date"
                    value={createForm.dueDate}
                    onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    className="w-full h-10 px-3 text-sm bg-white border border-[#e2e5e9] rounded focus:outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#e2e5e9] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={createSubmitting}
                  onClick={() => setCreateModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createSubmitting}
                  className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs font-semibold px-4"
                >
                  {createSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <LoadingSpinner size="sm" />
                      Creating...
                    </span>
                  ) : (
                    'Create Task'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK STATUS TRANSITION CONFIRMATION MODAL */}
      {statusModalOpen && statusTargetTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-none">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-modal-title"
            className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl w-full max-w-md overflow-hidden p-6"
          >
            <h2 id="status-modal-title" className="text-base font-bold text-gray-900 mb-2">
              Confirm Status Transition
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to transition task{' '}
              <span className="font-semibold text-gray-900">"{statusTargetTask.title}"</span> from{' '}
              <span className="font-semibold">{statusTargetTask.status}</span> to{' '}
              <span className="font-semibold text-[#714B67]">{statusTargetValue}</span>?
            </p>

            {statusError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{statusError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={statusSubmitting}
                onClick={() => setStatusModalOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={statusSubmitting}
                onClick={handleExecuteStatusChange}
                className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs font-semibold px-4"
              >
                {statusSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <LoadingSpinner size="sm" />
                    Updating...
                  </span>
                ) : (
                  'Confirm Update'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
