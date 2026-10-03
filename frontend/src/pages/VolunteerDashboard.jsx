import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Clock,
  RotateCw,
  CheckCircle2,
  HeartHandshake,
  ShieldCheck,
  Building2,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { volunteerService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { EmptyState } from '../components/ui/EmptyState';

const formatNumber = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN');
};

function VolunteerDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading volunteer dashboard">
      {/* Top Banner Skeleton */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-8 bg-gray-300 rounded w-72"></div>
          <div className="h-4 bg-gray-100 rounded w-96 max-w-full"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-32"></div>
      </div>

      {/* KPI Cards Skeleton (4 cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-[#e2e5e9] rounded-lg p-4 h-32 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-8 bg-gray-300 rounded w-16"></div>
            <div className="h-3 bg-gray-100 rounded w-28"></div>
          </div>
        ))}
      </div>

      {/* Tasks Table Skeleton */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-[#e2e5e9] pb-4">
          <div className="h-6 bg-gray-200 rounded w-40"></div>
          <div className="h-4 bg-gray-100 rounded w-20"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>

      {/* Fundraisers Skeleton */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 space-y-4">
        <div className="h-6 bg-gray-200 rounded w-36"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function VolunteerDashboard() {
  const navigate = useNavigate();

  // Role notice for non-volunteer users
  const [roleNotice] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role && user.role !== 'volunteer' && user.role !== 'admin') {
        return `Notice: You are currently signed in as "${user.role}". The Volunteer Dashboard is designated for the volunteer role.`;
      }
    } catch {
      // Backend remains authoritative
    }
    return '';
  });

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const fetchDashboard = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const response = await volunteerService.getDashboard();
      if (response.data?.success && response.data?.data) {
        setDashboardData(response.data.data);
      } else {
        setError('Failed to load volunteer dashboard data.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('401 Unauthorized: Session expired. Please sign in again.');
      } else if (err.response?.status === 403) {
        setError('403 Forbidden: Volunteer privileges required to access this dashboard.');
      } else if (err.response?.status === 404) {
        setError('Volunteer dashboard endpoint (GET /api/volunteer/dashboard) is not yet mounted on the server.');
      } else if (!err.response) {
        setError('Unable to connect to the server. Please check your network connection.');
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to load volunteer dashboard. Please retry.';
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

  // Task Status Update Handler (re-fetches authoritative dashboard on success)
  const handleStatusChange = async (taskId, newStatus) => {
    const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE'];
    if (!validStatuses.includes(newStatus)) return;
    if (updatingTaskId) return; // Prevent duplicate submissions

    setUpdatingTaskId(taskId);
    setActionError('');

    try {
      await volunteerService.updateTaskStatus(taskId, newStatus);
      // Re-fetch authoritative dashboard data
      await fetchDashboard(false);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to update task status. Please retry.';
      setActionError(msg);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const summary = dashboardData?.summary || {
    totalTasks: 0,
    todoTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
  };

  const tasks = Array.isArray(dashboardData?.tasks) ? dashboardData.tasks : [];
  const fundraisers = Array.isArray(dashboardData?.fundraisers) ? dashboardData.fundraisers : [];

  // Helper map for fundraiser names
  const fundraiserNameMap = fundraisers.reduce((acc, f) => {
    if (f?.id) acc[f.id] = f.name;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Top Banner / Volunteer Command Center Header */}
      <div className="bg-white border-2 border-[#714B67]/20 rounded-lg p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#714B67] text-white text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-white" aria-hidden="true" />
              VOLUNTEER COMMAND CENTER
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#017E84]/10 text-[#017E84] text-xs font-semibold">
              <Building2 className="w-3 h-3" aria-hidden="true" />
              LDCE Student Association
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#000000]">
            Volunteer Command Center
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage your assigned tasks and fundraiser activity.
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
            aria-label="Refresh volunteer dashboard data"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </Button>
        </div>
      </div>

      {/* Role notice if non-volunteer */}
      {roleNotice && (
        <Alert variant="warning" title="Role Notice">
          {roleNotice}
        </Alert>
      )}

      {/* Mutation Action Error Alert */}
      {actionError && (
        <Alert variant="error" title="Task Update Error">
          {actionError}
        </Alert>
      )}

      {/* Error State */}
      {error && (
        <div className="space-y-3">
          <Alert variant="error" title="Volunteer Dashboard Notice">
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
      {loading && !dashboardData && <VolunteerDashboardSkeleton />}

      {/* Loaded Dashboard Content */}
      {!loading && dashboardData && (
        <>
          {/* Summary KPIs: Exactly 4 Cards */}
          <section aria-label="Volunteer Tasks Summary">
            <h2 className="sr-only">Volunteer Tasks Summary Metrics</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Assigned Tasks */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm hover:border-[#714B67]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                      Assigned Tasks
                    </span>
                    <div className="p-1 rounded bg-[#714B67]/10 text-[#714B67]">
                      <CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl lg:text-3xl font-extrabold text-gray-900 block">
                      {formatNumber(summary.totalTasks)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5 block">
                      Total assigned
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. To Do */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm hover:border-[#E4A900]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                      To Do
                    </span>
                    <div className="p-1 rounded bg-[#E4A900]/15 text-[#8a6500]">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl lg:text-3xl font-extrabold text-[#8a6500] block">
                      {formatNumber(summary.todoTasks)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5 block">
                      Pending startup
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. In Progress */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm hover:border-[#714B67]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                      In Progress
                    </span>
                    <div className="p-1 rounded bg-[#714B67]/10 text-[#714B67]">
                      <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl lg:text-3xl font-extrabold text-[#714B67] block">
                      {formatNumber(summary.inProgressTasks)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5 block">
                      Active execution
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Completed */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm hover:border-[#017E84]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                      Completed
                    </span>
                    <div className="p-1 rounded bg-[#017E84]/10 text-[#017E84]">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl lg:text-3xl font-extrabold text-[#017E84] block">
                      {formatNumber(summary.completedTasks)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5 block">
                      Finished tasks
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Assigned Tasks Section */}
          <section aria-labelledby="assigned-tasks-title" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="assigned-tasks-title" className="text-lg font-bold text-[#000000]">
                    Assigned Tasks
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#714B67]/10 text-[#714B67]">
                    {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update task status as you make progress on your responsibilities.
                </p>
              </div>
            </div>

            {/* Empty Tasks State */}
            {tasks.length === 0 ? (
              <EmptyState
                icon={CheckSquare}
                title="No tasks assigned yet."
                description="You currently have no volunteer tasks assigned to you."
              />
            ) : (
              <>
                {/* Desktop / Tablet Table View */}
                <div className="hidden sm:block bg-white border border-[#e2e5e9] rounded-lg overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-[#e2e5e9] text-xs font-bold text-gray-700 uppercase tracking-wider">
                          <th scope="col" className="py-3 px-4">Task</th>
                          <th scope="col" className="py-3 px-4">Fundraiser</th>
                          <th scope="col" className="py-3 px-4">Description</th>
                          <th scope="col" className="py-3 px-4">Status</th>
                          <th scope="col" className="py-3 px-4 text-right">Update Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e5e9]">
                        {tasks.map((task) => {
                          const isUpdating = updatingTaskId === task.id;
                          const fundraiserName = fundraiserNameMap[task.fundraiserId];

                          return (
                            <tr key={task.id} className="hover:bg-gray-50/80 transition-colors">
                              {/* Task Title & ID */}
                              <td className="py-3.5 px-4">
                                <span className="font-semibold text-gray-900 block">
                                  {task.title}
                                </span>
                                <span className="text-[11px] text-gray-400 font-mono block mt-0.5">
                                  ID: {task.id}
                                </span>
                              </td>

                              {/* Fundraiser Name / ID */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <HeartHandshake className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                                  <div>
                                    <span className="text-xs font-medium text-gray-800 block">
                                      {fundraiserName || 'Fundraiser'}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-mono block">
                                      {task.fundraiserId}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Description */}
                              <td className="py-3.5 px-4 text-gray-600 max-w-xs">
                                <p className="line-clamp-2 text-xs" title={task.description}>
                                  {task.description || '—'}
                                </p>
                              </td>

                              {/* Status Badge */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <Badge>{task.status}</Badge>
                              </td>

                              {/* Status Update Control */}
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-2">
                                  {isUpdating && (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#714B67]" aria-hidden="true" />
                                  )}
                                  <select
                                    value={task.status}
                                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                    disabled={isUpdating || Boolean(updatingTaskId)}
                                    className="text-xs font-semibold border border-[#e2e5e9] rounded px-2.5 py-1 bg-white text-gray-800 hover:border-[#714B67] focus:outline-none focus:ring-1 focus:ring-[#714B67] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    aria-label={`Change status for task ${task.title}`}
                                  >
                                    <option value="TODO">To Do</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="DONE">Done</option>
                                  </select>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards View */}
                <div className="sm:hidden space-y-3">
                  {tasks.map((task) => {
                    const isUpdating = updatingTaskId === task.id;
                    const fundraiserName = fundraiserNameMap[task.fundraiserId];

                    return (
                      <div
                        key={task.id}
                        className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm">{task.title}</h3>
                            <span className="text-[10px] text-gray-400 font-mono block">
                              ID: {task.id}
                            </span>
                          </div>
                          <Badge>{task.status}</Badge>
                        </div>

                        {/* Fundraiser Tag */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                          <HeartHandshake className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                          <span className="font-medium text-gray-800 truncate">
                            {fundraiserName || 'Fundraiser'}
                          </span>
                        </div>

                        {/* Description */}
                        {task.description && (
                          <p className="text-xs text-gray-600">
                            {task.description}
                          </p>
                        )}

                        {/* Status Update Dropdown */}
                        <div className="pt-2 border-t border-[#e2e5e9] flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-700">Update Status:</span>
                          <div className="flex items-center gap-2">
                            {isUpdating && (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#714B67]" aria-hidden="true" />
                            )}
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.id, e.target.value)}
                              disabled={isUpdating || Boolean(updatingTaskId)}
                              className="text-xs font-semibold border border-[#e2e5e9] rounded px-2 py-1 bg-white text-gray-800 hover:border-[#714B67] focus:outline-none focus:ring-1 focus:ring-[#714B67] disabled:opacity-50"
                              aria-label={`Change status for task ${task.title}`}
                            >
                              <option value="TODO">To Do</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="DONE">Done</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* My Fundraisers Section */}
          <section aria-labelledby="my-fundraisers-title" className="space-y-4 border-t border-[#e2e5e9] pt-6">
            <div className="flex items-center gap-2">
              <h2 id="my-fundraisers-title" className="text-lg font-bold text-[#000000]">
                My Fundraisers
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#017E84]/10 text-[#017E84]">
                {fundraisers.length} {fundraisers.length === 1 ? 'fundraiser' : 'fundraisers'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Fundraisers in which you are actively participating as an assigned volunteer.
            </p>

            {/* Empty Fundraisers State */}
            {fundraisers.length === 0 ? (
              <EmptyState
                icon={HeartHandshake}
                title="No fundraiser activity yet."
                description="You are not currently assigned to any fundraiser tasks."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {fundraisers.map((f) => (
                  <div
                    key={f.id}
                    className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm hover:border-[#017E84]/40 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#e2e5e9]">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 rounded bg-[#017E84]/10 text-[#017E84] shrink-0">
                            <HeartHandshake className="w-4 h-4" aria-hidden="true" />
                          </div>
                          <h3 className="text-sm font-bold text-gray-900 truncate" title={f.name}>
                            {f.name}
                          </h3>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#017E84]/10 text-[#017E84] uppercase whitespace-nowrap">
                          Assigned
                        </span>
                      </div>
                      <div className="mt-2.5">
                        <span className="text-[10px] text-gray-400 font-mono block mb-1">
                          ID: {f.id}
                        </span>
                        <p className="text-xs text-gray-600 line-clamp-3">
                          {f.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
