import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Clock,
  Calendar,
  CheckSquare,
  AlertCircle,
  RotateCcw,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import { adminService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

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

const formatDateTimeDisplay = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

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

export default function AdminVolunteerDetails() {
  const { volunteerId } = useParams();
  const navigate = useNavigate();

  const [volunteer, setVolunteer] = useState(null);
  const [loadingVolunteer, setLoadingVolunteer] = useState(true);
  const [volunteerError, setVolunteerError] = useState('');

  // Assigned Tasks state
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState('');
  const [tasksPagination, setTasksPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [tasksPage, setTasksPage] = useState(1);

  // Filters for volunteer tasks
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');

  // Sorting for volunteer tasks
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch Volunteer Detail
  const fetchVolunteer = useCallback(async () => {
    setLoadingVolunteer(true);
    setVolunteerError('');
    try {
      const res = await adminService.getAdminVolunteer(volunteerId);
      setVolunteer(res.data?.data || null);
    } catch (err) {
      if (err.response?.status === 404) {
        setVolunteerError('404: Volunteer not found.');
      } else if (err.response?.status === 403) {
        setVolunteerError('403 Forbidden: Administrator privileges required.');
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to load volunteer details.';
        setVolunteerError(msg);
      }
    } finally {
      setLoadingVolunteer(false);
    }
  }, [volunteerId]);

  // Fetch Assigned Tasks (server-side)
  const fetchAssignedTasks = useCallback(
    async (pageToLoad = tasksPage) => {
      setTasksLoading(true);
      setTasksError('');
      try {
        const params = {
          page: pageToLoad,
          limit: 10,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          dueDateFrom: dueDateFrom || undefined,
          dueDateTo: dueDateTo || undefined,
          sortBy,
          sortOrder,
        };

        const res = await adminService.getAdminVolunteerTasks(volunteerId, params);
        const data = res.data?.data || {};
        const items = data.tasks || [];
        const pag = data.pagination || {};

        setTasks(items);
        setTasksPagination({
          page: pag.page || pageToLoad,
          limit: pag.limit || 10,
          total: pag.totalItems !== undefined ? pag.totalItems : pag.total !== undefined ? pag.total : items.length,
          totalPages: pag.totalPages !== undefined ? pag.totalPages : Math.ceil((pag.total || items.length) / 10) || 1,
        });
      } catch (err) {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to load assigned tasks.';
        setTasksError(msg);
        setTasks([]);
      } finally {
        setTasksLoading(false);
      }
    },
    [volunteerId, tasksPage, statusFilter, priorityFilter, dueDateFrom, dueDateTo, sortBy, sortOrder]
  );

  useEffect(() => {
    fetchVolunteer();
  }, [fetchVolunteer]);

  useEffect(() => {
    fetchAssignedTasks(tasksPage);
  }, [fetchAssignedTasks, tasksPage]);

  // Handle Sort Change (server-side)
  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnKey);
      setSortOrder(columnKey === 'dueDate' ? 'asc' : 'desc');
    }
    setTasksPage(1);
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setDueDateFrom('');
    setDueDateTo('');
    setTasksPage(1);
  };

  const hasActiveFilters =
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    Boolean(dueDateFrom) ||
    Boolean(dueDateTo);

  if (loadingVolunteer) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3 bg-white rounded-lg border border-[#e2e5e9]">
        <LoadingSpinner size="lg" className="text-[#017E84]" />
        <p className="text-sm text-gray-500">Loading volunteer profile...</p>
      </div>
    );
  }

  if (volunteerError || !volunteer) {
    return (
      <div className="p-8 bg-white border border-[#e2e5e9] rounded-lg text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" aria-hidden="true" />
        <h2 className="text-lg font-bold text-gray-900 mb-1">Volunteer Unavailable</h2>
        <p className="text-sm text-gray-600 mb-4">{volunteerError || 'Volunteer could not be loaded.'}</p>
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={() => navigate('/admin/volunteers')}
            variant="outline"
            className="text-xs inline-flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Volunteers</span>
          </Button>
          <Button
            onClick={fetchVolunteer}
            className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/admin/volunteers" className="hover:text-[#714B67] flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          <span>Volunteers</span>
        </Link>
        <span>/</span>
        <span className="font-semibold text-gray-900 truncate max-w-md">{volunteer.name}</span>
      </div>

      {/* Volunteer Profile Hero */}
      <div className="bg-white p-6 rounded-lg border border-[#e2e5e9] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#e2e5e9]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#017E84]/10 text-[#017E84] flex items-center justify-center font-bold text-xl shrink-0">
              {volunteer.name ? volunteer.name.charAt(0).toUpperCase() : 'V'}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{volunteer.name}</h1>
                <Badge>{volunteer.status}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 mt-1">
                {volunteer.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{volunteer.email}</span>
                  </span>
                )}
                {volunteer.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{volunteer.phone}</span>
                  </span>
                )}
                {volunteer.createdAt && (
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>Registered {formatDateTimeDisplay(volunteer.createdAt)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Workload Summary Cards (Backend-derived metrics only) */}
        <div>
          <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2.5">
            Workload Distribution
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-[#e2e5e9]">
              <span className="text-xs font-medium text-gray-500 block mb-1">Total Assigned Tasks</span>
              <div className="text-2xl font-bold text-gray-900">
                {volunteer.assignedTaskCount || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">All operational tasks assigned</p>
            </div>

            <div className="p-4 bg-[#714B67]/5 rounded-lg border border-[#714B67]/20">
              <span className="text-xs font-medium text-[#714B67] block mb-1">Active Tasks</span>
              <div className="text-2xl font-bold text-[#714B67]">
                {volunteer.activeTaskCount || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">Pending and in progress</p>
            </div>

            <div className="p-4 bg-[#017E84]/5 rounded-lg border border-[#017E84]/20">
              <span className="text-xs font-medium text-[#017E84] block mb-1">Completed Tasks</span>
              <div className="text-2xl font-bold text-[#017E84]">
                {volunteer.completedTaskCount || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">Successfully completed work</p>
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Tasks Section */}
      <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#e2e5e9]">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#714B67]" aria-hidden="true" />
            <h2 className="text-base font-bold text-gray-900">Assigned Tasks</h2>
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold">
              {tasksPagination.total}
            </span>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setTasksPage(1);
              }}
              className="h-8 px-2 text-xs bg-white border border-[#e2e5e9] rounded focus:outline-none focus:ring-1 focus:ring-[#714B67]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setTasksPage(1);
              }}
              className="h-8 px-2 text-xs bg-white border border-[#e2e5e9] rounded focus:outline-none focus:ring-1 focus:ring-[#714B67]"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-[#714B67] hover:underline font-semibold flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {tasksLoading ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2">
            <LoadingSpinner size="md" className="text-[#714B67]" />
            <p className="text-xs text-gray-500">Loading assigned tasks...</p>
          </div>
        ) : tasksError ? (
          <div className="p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-gray-900 mb-2">{tasksError}</p>
            <Button
              onClick={() => fetchAssignedTasks(tasksPage)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Retry
            </Button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center bg-gray-50/50 rounded-lg border border-dashed border-[#e2e5e9]">
            <CheckSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-semibold text-gray-800 mb-1">
              {hasActiveFilters ? 'No tasks match your selected filters.' : 'No tasks are currently assigned.'}
            </p>
            <p className="text-xs text-gray-500 mb-3">
              {hasActiveFilters
                ? 'Try clearing the task status or priority filters.'
                : 'Assign tasks to this volunteer from the Task Command Center.'}
            </p>
            {hasActiveFilters && (
              <Button onClick={handleClearFilters} variant="outline" size="sm" className="text-xs">
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-y border-[#e2e5e9] text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th scope="col" className="py-2.5 px-5">
                      <button
                        type="button"
                        onClick={() => handleSort('title')}
                        className="inline-flex items-center gap-1 hover:text-gray-900 focus:outline-none"
                      >
                        <span>Task Title</span>
                        {sortBy === 'title' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-[#714B67]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[#714B67]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th scope="col" className="py-2.5 px-4">
                      <span>Priority</span>
                    </th>
                    <th scope="col" className="py-2.5 px-4">
                      <span>Status</span>
                    </th>
                    <th scope="col" className="py-2.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleSort('dueDate')}
                        className="inline-flex items-center gap-1 hover:text-gray-900 focus:outline-none"
                      >
                        <span>Due Date</span>
                        {sortBy === 'dueDate' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-[#714B67]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[#714B67]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th scope="col" className="py-2.5 px-4">
                      <span>Progress</span>
                    </th>
                    <th scope="col" className="py-2.5 px-5 text-right">
                      <span>Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e5e9]">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-5">
                        <Link
                          to={`/admin/tasks/${task.id}`}
                          className="font-semibold text-gray-900 hover:text-[#714B67]"
                        >
                          {task.title}
                        </Link>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge>{task.priority || 'MEDIUM'}</Badge>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge>{task.status}</Badge>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-gray-600">
                        {formatDateDisplay(task.dueDate)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {task.progress !== null && task.progress !== undefined ? (
                          <div className="w-20">
                            <span className="text-xs text-gray-600 block mb-0.5">{task.progress}%</span>
                            <div className="w-full bg-gray-200 rounded-full h-1">
                              <div
                                className="bg-[#017E84] h-1 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <Link
                          to={`/admin/tasks/${task.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#714B67] bg-[#714B67]/10 hover:bg-[#714B67]/20 rounded transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Task</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tasks Pagination */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
              <div>
                Showing page <span className="font-semibold text-gray-900">{tasksPagination.page}</span> of{' '}
                <span className="font-semibold text-gray-900">{tasksPagination.totalPages || 1}</span>{' '}
                ({tasksPagination.total} total {tasksPagination.total === 1 ? 'task' : 'tasks'})
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={tasksPagination.page <= 1}
                  onClick={() => setTasksPage((p) => Math.max(1, p - 1))}
                  className="flex items-center gap-1 text-xs py-1 px-2"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={tasksPagination.page >= tasksPagination.totalPages}
                  onClick={() => setTasksPage((p) => p + 1)}
                  className="flex items-center gap-1 text-xs py-1 px-2"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
