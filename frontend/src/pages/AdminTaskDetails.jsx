import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  Calendar,
  Clock,
  UserCheck,
  UserPlus,
  Trash2,
  Edit3,
  Play,
  Check,
  Ban,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  X,
  Mail,
  Phone,
} from 'lucide-react';
import { adminService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
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
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

export default function AdminTaskDetails() {
  const { taskId } = useParams();
  const navigate = useNavigate();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Toast notification
  const [notification, setNotification] = useState(null);
  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Status transition state
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Edit Task Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: '',
  });

  // Assign Volunteer Modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [availableVolunteers, setAvailableVolunteers] = useState([]);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Unassign confirmation modal
  const [unassignTarget, setUnassignTarget] = useState(null);
  const [unassignSubmitting, setUnassignSubmitting] = useState(false);
  const [unassignError, setUnassignError] = useState('');

  // Fetch Authoritative Task Detail
  const fetchTaskDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getAdminTask(taskId);
      const data = res.data?.data || {};
      setTask(data);

      setEditForm({
        title: data.title || '',
        description: data.description || '',
        priority: data.priority || 'MEDIUM',
        dueDate: data.dueDate ? String(data.dueDate).split('T')[0] : '',
      });
    } catch (err) {
      if (err.response?.status === 404) {
        setError('404: Task not found or has been deleted.');
      } else if (err.response?.status === 403) {
        setError('403 Forbidden: Administrator privileges required.');
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to load task details.';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTaskDetails();
  }, [fetchTaskDetails]);

  // Load available volunteers when assign modal opens
  const openAssignModal = async () => {
    setAssignError('');
    setSelectedVolunteerId('');
    setAssignModalOpen(true);
    try {
      const res = await adminService.getAdminVolunteers({ limit: 100 });
      const all = res.data?.data?.volunteers || [];
      const assignedIds = new Set((task?.assignedVolunteers || []).map((v) => v.volunteerId || v.id));
      const filtered = all.filter((v) => !assignedIds.has(v.id));
      setAvailableVolunteers(filtered);
      if (filtered.length > 0) {
        setSelectedVolunteerId(filtered[0].id);
      }
    } catch {
      setAssignError('Failed to load volunteers.');
    }
  };

  // Submit Volunteer Assignment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVolunteerId) {
      setAssignError('Please select a volunteer to assign.');
      return;
    }
    setAssignSubmitting(true);
    setAssignError('');

    try {
      await adminService.assignAdminTask(taskId, selectedVolunteerId);
      showToast('Volunteer assigned successfully.', 'success');
      setAssignModalOpen(false);
      fetchTaskDetails();
    } catch (err) {
      if (err.response?.status === 409) {
        setAssignError('Conflict (409): Volunteer is already assigned to this task.');
        fetchTaskDetails();
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to assign volunteer.';
        setAssignError(msg);
      }
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Remove Volunteer Assignment
  const handleUnassignSubmit = async () => {
    if (!unassignTarget) return;
    setUnassignSubmitting(true);
    setUnassignError('');

    try {
      const targetAssignmentId = unassignTarget.assignmentId || unassignTarget.id;
      await adminService.removeAdminTaskAssignment(taskId, targetAssignmentId);
      showToast('Assignment removed successfully.', 'success');
      setUnassignTarget(null);
      fetchTaskDetails();
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to remove assignment.';
      setUnassignError(msg);
    } finally {
      setUnassignSubmitting(false);
    }
  };

  // Submit Task Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const titleTrim = editForm.title.trim();
    if (!titleTrim) {
      setEditError('Title is required and cannot be empty.');
      return;
    }

    setEditSubmitting(true);
    setEditError('');

    try {
      const payload = {
        title: titleTrim,
        description: editForm.description.trim(),
        priority: editForm.priority,
        dueDate: editForm.dueDate || null,
      };

      await adminService.updateAdminTask(taskId, payload);
      showToast('Task details updated successfully.', 'success');
      setEditModalOpen(false);
      fetchTaskDetails();
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to update task details.';
      setEditError(msg);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Execute Status Transition
  const handleStatusTransition = async () => {
    if (!pendingStatus) return;
    setStatusSubmitting(true);
    setStatusError('');

    try {
      await adminService.updateAdminTaskStatus(taskId, pendingStatus);
      showToast(`Task status updated to ${pendingStatus}.`, 'success');
      setStatusConfirmOpen(false);
      setPendingStatus('');
      fetchTaskDetails();
    } catch (err) {
      if (err.response?.status === 409) {
        setStatusError(
          err.response?.data?.error?.message ||
            'Conflict (409): Status transition is not allowed by the backend lifecycle.'
        );
        fetchTaskDetails();
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to transition task status.';
        setStatusError(msg);
      }
    } finally {
      setStatusSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3 bg-white rounded-lg border border-[#e2e5e9]">
        <LoadingSpinner size="lg" className="text-[#714B67]" />
        <p className="text-sm text-gray-500">Loading Task Command Center...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="p-8 bg-white border border-[#e2e5e9] rounded-lg text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" aria-hidden="true" />
        <h2 className="text-lg font-bold text-gray-900 mb-1">Task Unavailable</h2>
        <p className="text-sm text-gray-600 mb-4">{error || 'Task could not be loaded.'}</p>
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={() => navigate('/admin/tasks')}
            variant="outline"
            className="text-xs inline-flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Tasks</span>
          </Button>
          <Button
            onClick={fetchTaskDetails}
            className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </Button>
        </div>
      </div>
    );
  }

  const isPending = task.status === 'PENDING' || task.status === 'TODO';
  const isInProgress = task.status === 'IN_PROGRESS';
  const isCompleted = task.status === 'COMPLETED' || task.status === 'DONE';
  const isCancelled = task.status === 'CANCELLED';

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

      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/admin/tasks" className="hover:text-[#714B67] flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" />
          <span>Tasks</span>
        </Link>
        <span>/</span>
        <span className="font-semibold text-gray-900 truncate max-w-md">{task.title}</span>
      </div>

      {/* Command Center Hero */}
      <div className="bg-white p-6 rounded-lg border border-[#e2e5e9] shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#e2e5e9]">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{task.title}</h1>
              <Badge>{task.status}</Badge>
              <Badge>{task.priority || 'MEDIUM'}</Badge>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-3">
              <span>Task ID: <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">{task.id}</code></span>
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {!isCompleted && !isCancelled && (
              <Button
                onClick={() => setEditModalOpen(true)}
                variant="outline"
                className="text-xs inline-flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Task</span>
              </Button>
            )}

            {isPending && (
              <>
                <Button
                  onClick={() => {
                    setPendingStatus('IN_PROGRESS');
                    setStatusError('');
                    setStatusConfirmOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 px-3 py-2"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Task</span>
                </Button>
                <Button
                  onClick={() => {
                    setPendingStatus('CANCELLED');
                    setStatusError('');
                    setStatusConfirmOpen(true);
                  }}
                  variant="outline"
                  className="text-red-700 border-red-200 hover:bg-red-50 text-xs inline-flex items-center gap-1.5 px-3 py-2"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel Task</span>
                </Button>
              </>
            )}

            {isInProgress && (
              <>
                <Button
                  onClick={() => {
                    setPendingStatus('COMPLETED');
                    setStatusError('');
                    setStatusConfirmOpen(true);
                  }}
                  className="bg-[#017E84] hover:bg-[#01656a] text-white text-xs font-semibold inline-flex items-center gap-1.5 px-3 py-2"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Complete Task</span>
                </Button>
                <Button
                  onClick={() => {
                    setPendingStatus('CANCELLED');
                    setStatusError('');
                    setStatusConfirmOpen(true);
                  }}
                  variant="outline"
                  className="text-red-700 border-red-200 hover:bg-red-50 text-xs inline-flex items-center gap-1.5 px-3 py-2"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel Task</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Operational Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
          <div className="p-3 bg-gray-50 rounded-lg border border-[#e2e5e9]">
            <span className="text-xs text-gray-500 font-medium block mb-1">Due Date</span>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Calendar className="w-4 h-4 text-gray-400" aria-hidden="true" />
              <span>{formatDateDisplay(task.dueDate)}</span>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-[#e2e5e9]">
            <span className="text-xs text-gray-500 font-medium block mb-1">Progress</span>
            <div className="text-sm font-semibold text-gray-900">
              {task.progress !== null && task.progress !== undefined ? (
                <div>
                  <div className="flex justify-between text-xs mb-1">
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
                '—'
              )}
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-[#e2e5e9]">
            <span className="text-xs text-gray-500 font-medium block mb-1">Created At</span>
            <div className="flex items-center gap-1.5 text-xs text-gray-700">
              <Clock className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
              <span>{formatDateTimeDisplay(task.createdAt)}</span>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-[#e2e5e9]">
            <span className="text-xs text-gray-500 font-medium block mb-1">Last Updated</span>
            <div className="flex items-center gap-1.5 text-xs text-gray-700">
              <Clock className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
              <span>{formatDateTimeDisplay(task.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Task Description */}
        <div className="pt-2">
          <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Description</h2>
          <div className="p-4 bg-gray-50/70 border border-[#e2e5e9] rounded-lg text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {task.description || <span className="italic text-gray-400">No description provided for this task.</span>}
          </div>
        </div>
      </div>

      {/* Volunteer Assignment Section */}
      <div className="bg-white p-6 rounded-lg border border-[#e2e5e9] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9]">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#017E84]" aria-hidden="true" />
            <h2 className="text-base font-bold text-gray-900">Assigned Volunteers</h2>
            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold">
              {(task.assignedVolunteers || []).length}
            </span>
          </div>
          {!isCompleted && !isCancelled && (
            <Button
              onClick={openAssignModal}
              className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs font-semibold inline-flex items-center gap-1.5 px-3 py-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Assign Volunteer</span>
            </Button>
          )}
        </div>

        {(task.assignedVolunteers || []).length === 0 ? (
          <div className="p-8 text-center bg-gray-50/50 rounded-lg border border-dashed border-[#e2e5e9]">
            <UserCheck className="w-10 h-10 text-gray-300 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-semibold text-gray-800 mb-1">This task is currently unassigned.</p>
            <p className="text-xs text-gray-500 mb-4">
              Assign active volunteers from LDCE Student Association to execute this task.
            </p>
            {!isCompleted && !isCancelled && (
              <Button
                onClick={openAssignModal}
                variant="outline"
                className="text-xs inline-flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#714B67]" />
                <span>Assign Volunteer Now</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {task.assignedVolunteers.map((vol) => {
              const volunteerId = vol.volunteerId || vol.id;
              const assignmentId = vol.assignmentId || vol.id;

              return (
                <div
                  key={assignmentId || volunteerId}
                  className="p-4 rounded-lg border border-[#e2e5e9] bg-gray-50/40 flex items-start justify-between gap-3 hover:border-gray-300 transition-colors"
                >
                  <div className="space-y-1">
                    <Link
                      to={`/admin/volunteers/${volunteerId}`}
                      className="font-semibold text-sm text-gray-900 hover:text-[#714B67] flex items-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4 text-[#017E84]" />
                      <span>{vol.name}</span>
                    </Link>
                    {vol.email && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span>{vol.email}</span>
                      </div>
                    )}
                    {vol.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>{vol.phone}</span>
                      </div>
                    )}
                  </div>

                  {!isCompleted && !isCancelled && (
                    <button
                      type="button"
                      onClick={() => {
                        setUnassignTarget(vol);
                        setUnassignError('');
                      }}
                      className="text-xs text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                      title="Remove volunteer from task"
                      aria-label={`Remove ${vol.name} from task`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* EDIT TASK MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-none">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-task-modal-title"
            className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl w-full max-w-lg overflow-hidden flex flex-col"
          >
            <div className="px-6 py-4 border-b border-[#e2e5e9] flex items-center justify-between">
              <h2 id="edit-task-modal-title" className="text-lg font-bold text-gray-900">
                Edit Task Details
              </h2>
              <button
                type="button"
                onClick={() => !editSubmitting && setEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close edit task modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label htmlFor="edit-task-title" className="block text-xs font-semibold text-gray-800 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <Input
                  id="edit-task-title"
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="text-sm"
                />
              </div>

              <div>
                <label htmlFor="edit-task-description" className="block text-xs font-semibold text-gray-800 mb-1">
                  Description
                </label>
                <textarea
                  id="edit-task-description"
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full p-2.5 text-sm bg-white border border-[#e2e5e9] rounded focus:outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-task-priority" className="block text-xs font-semibold text-gray-800 mb-1">
                    Priority
                  </label>
                  <select
                    id="edit-task-priority"
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    className="w-full h-10 px-3 text-sm bg-white border border-[#e2e5e9] rounded focus:outline-none focus:ring-2 focus:ring-[#714B67]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="edit-task-dueDate" className="block text-xs font-semibold text-gray-800 mb-1">
                    Due Date
                  </label>
                  <input
                    id="edit-task-dueDate"
                    type="date"
                    value={editForm.dueDate}
                    onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    className="w-full h-10 px-3 text-sm bg-white border border-[#e2e5e9] rounded focus:outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#e2e5e9] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={editSubmitting}
                  onClick={() => setEditModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editSubmitting}
                  className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs font-semibold px-4"
                >
                  {editSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <LoadingSpinner size="sm" />
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN VOLUNTEER MODAL */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-none">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-modal-title"
            className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl w-full max-w-md overflow-hidden p-6"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9] mb-4">
              <h2 id="assign-modal-title" className="text-base font-bold text-gray-900">
                Assign Volunteer to Task
              </h2>
              <button
                type="button"
                onClick={() => !assignSubmitting && setAssignModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close assign modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {assignError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{assignError}</span>
              </div>
            )}

            {availableVolunteers.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600 mb-3">No unassigned active volunteers found.</p>
                <Button onClick={() => setAssignModalOpen(false)} variant="outline" className="text-xs">
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleAssignSubmit} className="space-y-4">
                <div>
                  <label htmlFor="select-volunteer" className="block text-xs font-semibold text-gray-800 mb-1">
                    Select Active Volunteer
                  </label>
                  <select
                    id="select-volunteer"
                    value={selectedVolunteerId}
                    onChange={(e) => setSelectedVolunteerId(e.target.value)}
                    className="w-full h-10 px-3 text-sm bg-white border border-[#e2e5e9] rounded focus:outline-none focus:ring-2 focus:ring-[#714B67]"
                  >
                    {availableVolunteers.map((vol) => (
                      <option key={vol.id} value={vol.id}>
                        {vol.name} {vol.email ? `(${vol.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={assignSubmitting}
                    onClick={() => setAssignModalOpen(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={assignSubmitting}
                    className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs font-semibold px-4"
                  >
                    {assignSubmitting ? (
                      <span className="flex items-center gap-1.5">
                        <LoadingSpinner size="sm" />
                        Assigning...
                      </span>
                    ) : (
                      'Confirm Assignment'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* UNASSIGN CONFIRMATION MODAL */}
      {unassignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-none">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unassign-modal-title"
            className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl w-full max-w-md p-6"
          >
            <h2 id="unassign-modal-title" className="text-base font-bold text-gray-900 mb-2">
              Remove Volunteer Assignment
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to remove{' '}
              <span className="font-semibold text-gray-900">{unassignTarget.name}</span> from this task?
            </p>

            {unassignError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{unassignError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={unassignSubmitting}
                onClick={() => setUnassignTarget(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={unassignSubmitting}
                onClick={handleUnassignSubmit}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4"
              >
                {unassignSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <LoadingSpinner size="sm" />
                    Removing...
                  </span>
                ) : (
                  'Remove'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS TRANSITION CONFIRMATION MODAL */}
      {statusConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-none">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-status-confirm-title"
            className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl w-full max-w-md p-6"
          >
            <h2 id="task-status-confirm-title" className="text-base font-bold text-gray-900 mb-2">
              Confirm Status Transition
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to transition this task from{' '}
              <span className="font-semibold">{task.status}</span> to{' '}
              <span className="font-semibold text-[#714B67]">{pendingStatus}</span>?
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
                onClick={() => setStatusConfirmOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={statusSubmitting}
                onClick={handleStatusTransition}
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
