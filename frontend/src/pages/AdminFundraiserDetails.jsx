import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HeartHandshake,
  ChevronLeft,
  Users,
  DollarSign,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { adminService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

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
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

export default function AdminFundraiserDetails() {
  const { fundraiserId } = useParams();
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

  // Fundraiser State
  const [fundraiser, setFundraiser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [notFound, setNotFound] = useState(false);

  // Contributions State
  const [contributions, setContributions] = useState([]);
  const [contributionsLoading, setContributionsLoading] = useState(true);
  const [contribPagination, setContribPagination] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 1,
  });

  // Banner feedback
  const [bannerAlert, setBannerAlert] = useState(null); // { type: 'success' | 'error', message: '' }

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
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
    newStatus: '',
    title: '',
    description: '',
    loading: false,
  });

  // Load authoritative fundraiser detail
  const loadFundraiser = useCallback(async () => {
    if (!fundraiserId) return;

    setLoading(true);
    setFetchError('');
    setNotFound(false);

    try {
      const res = await adminService.getAdminFundraiser(fundraiserId);
      const data = res.data?.data?.fundraiser;
      if (!data) {
        setNotFound(true);
      } else {
        setFundraiser(data);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else if (err.response?.status === 403) {
        setFetchError('403 Forbidden: You do not have permission to view this campaign.');
      } else if (err.response?.status === 401) {
        setFetchError('Authentication expired. Please log in again.');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setFetchError(
          err.response?.data?.error?.message ||
          'Failed to load fundraiser command center. Please retry.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [fundraiserId, navigate]);

  // Load contributions
  const loadContributions = useCallback(async () => {
    if (!fundraiserId) return;

    setContributionsLoading(true);
    try {
      const res = await adminService.getAdminFundraiserContributions(fundraiserId);
      const data = res.data?.data || {};
      setContributions(Array.isArray(data.contributions) ? data.contributions : []);
      if (data.pagination) {
        setContribPagination(data.pagination);
      }
    } catch {
      // Contributions are optional/graceful if empty
      setContributions([]);
    } finally {
      setContributionsLoading(false);
    }
  }, [fundraiserId]);

  useEffect(() => {
    loadFundraiser();
    loadContributions();
  }, [loadFundraiser, loadContributions]);

  // Open Edit Modal
  const openEditModal = () => {
    if (!fundraiser) return;
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

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
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

      await adminService.updateAdminFundraiser(fundraiserId, payload);
      setEditModalOpen(false);
      setBannerAlert({
        type: 'success',
        message: 'Fundraiser updated successfully.',
      });
      loadFundraiser();
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

  // Status prompt
  const promptStatusChange = (newStatus, actionTitle, actionDesc) => {
    setConfirmDialog({
      open: true,
      newStatus,
      title: actionTitle,
      description: actionDesc,
      loading: false,
    });
  };

  // Status confirm
  const handleConfirmStatus = async () => {
    if (!confirmDialog.newStatus) return;

    setConfirmDialog((prev) => ({ ...prev, loading: true }));
    try {
      await adminService.updateAdminFundraiserStatus(fundraiserId, confirmDialog.newStatus);
      setBannerAlert({
        type: 'success',
        message: `Fundraiser status transitioned to ${confirmDialog.newStatus}.`,
      });
      setConfirmDialog({ open: false, newStatus: '', title: '', description: '', loading: false });
      loadFundraiser();
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Status update failed. Transition may not be allowed.';
      setBannerAlert({ type: 'error', message: msg });
      setConfirmDialog({ open: false, newStatus: '', title: '', description: '', loading: false });
      loadFundraiser();
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

  if (notFound) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <HeartHandshake className="w-12 h-12 text-gray-300 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Fundraiser Not Found</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          The requested campaign does not exist or may have been removed.
        </p>
        <Link to="/admin/fundraisers">
          <Button variant="outline" className="border-[#714B67] text-[#714B67]">
            Back to Fundraisers
          </Button>
        </Link>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900">Error Loading Fundraiser</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">{fetchError}</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/admin/fundraisers">
            <Button variant="outline">Back to List</Button>
          </Link>
          <Button onClick={loadFundraiser} className="bg-[#714B67] hover:bg-[#5a3b52] text-white">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (loading || !fundraiser) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3">
        <LoadingSpinner size="lg" className="text-[#714B67]" />
        <p className="text-sm text-gray-500 font-medium">Loading campaign command center...</p>
      </div>
    );
  }

  const target = Number(fundraiser.targetAmount) || 0;
  const collected = Number(fundraiser.collectedAmount) || 0;
  const progress = Number(fundraiser.progressPercent) || 0;
  const status = fundraiser.status || 'DRAFT';
  const isTerminal = status === 'COMPLETED' || status === 'CANCELLED';

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          to="/admin/fundraisers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#714B67] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Fundraisers List</span>
        </Link>
      </div>

      {/* Banner Feedback */}
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
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Campaign Identity & Top Actions Header */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-gray-900">{fundraiser.title}</h1>
              <Badge>{status}</Badge>
            </div>
            {fundraiser.description && (
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line pt-1">
                {fundraiser.description}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start">
            {!isTerminal && (
              <Button
                variant="outline"
                size="sm"
                onClick={openEditModal}
                className="flex items-center gap-1.5 text-gray-700"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Campaign</span>
              </Button>
            )}

            {/* Allowed Contextual Transitions */}
            {status === 'DRAFT' && (
              <>
                <Button
                  size="sm"
                  onClick={() =>
                    promptStatusChange(
                      'ACTIVE',
                      'Activate Campaign',
                      'This will transition the campaign from DRAFT to ACTIVE, opening it to contributions.'
                    )
                  }
                  className="bg-[#017E84] hover:bg-[#01656a] text-white flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Activate</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    promptStatusChange(
                      'CANCELLED',
                      'Cancel Campaign',
                      'Are you sure you want to cancel this campaign? Cancelled is a terminal state.'
                    )
                  }
                  className="border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </Button>
              </>
            )}

            {status === 'ACTIVE' && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    promptStatusChange(
                      'CLOSED',
                      'Close Campaign',
                      'Closing the campaign stops accepting new contributions while preserving operational totals.'
                    )
                  }
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Close</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    promptStatusChange(
                      'COMPLETED',
                      'Complete Campaign',
                      'This will finalize the campaign as COMPLETED.'
                    )
                  }
                  className="bg-[#017E84] hover:bg-[#01656a] text-white flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Complete</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    promptStatusChange(
                      'CANCELLED',
                      'Cancel Campaign',
                      'Are you sure you want to cancel this campaign? Cancelled is a terminal state.'
                    )
                  }
                  className="border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </Button>
              </>
            )}

            {status === 'CLOSED' && (
              <Button
                size="sm"
                onClick={() =>
                  promptStatusChange(
                    'COMPLETED',
                    'Complete Campaign',
                    'This will finalize the campaign as COMPLETED.'
                  )
                }
                className="bg-[#017E84] hover:bg-[#01656a] text-white flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Mark Completed</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Command Center: Financial & Operational Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Target Amount */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <span>Target Goal</span>
            <DollarSign className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(target)}</div>
          <p className="text-[11px] text-gray-400">Authoritative target amount</p>
        </div>

        {/* Collected Amount */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <span>Collected</span>
            <span className="w-2 h-2 rounded-full bg-[#017E84]" />
          </div>
          <div className="text-2xl font-bold text-[#017E84]">{formatCurrency(collected)}</div>
          <p className="text-[11px] text-gray-400">Backend financial summary</p>
        </div>

        {/* Progress Percent */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <span>Progress</span>
            <span className="font-bold text-gray-900">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                progress >= 100 ? 'bg-[#017E84]' : 'bg-[#714B67]'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin="0"
              aria-valuemax="100"
            />
          </div>
          <p className="text-[11px] text-gray-400">
            {progress >= 100 ? 'Goal achieved!' : `${Math.max(0, 100 - progress)}% remaining to target`}
          </p>
        </div>

        {/* Contributor Count */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
            <span>Contributors</span>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{fundraiser.contributorCount || 0}</div>
          <p className="text-[11px] text-gray-400">Individual contribution records</p>
        </div>
      </div>

      {/* Campaign Timeline & Metadata */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
          Campaign Timeline & Audit Trace
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-gray-400 block mb-0.5">Start Date</span>
            <span className="font-semibold text-gray-800">{formatDateDisplay(fundraiser.startDate)}</span>
          </div>
          <div>
            <span className="text-gray-400 block mb-0.5">End Date</span>
            <span className="font-semibold text-gray-800">{formatDateDisplay(fundraiser.endDate)}</span>
          </div>
          <div>
            <span className="text-gray-400 block mb-0.5">Created Date</span>
            <span className="font-semibold text-gray-800">{formatDateDisplay(fundraiser.createdAt)}</span>
          </div>
          <div>
            <span className="text-gray-400 block mb-0.5">Last Updated</span>
            <span className="font-semibold text-gray-800">{formatDateDisplay(fundraiser.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Contributions Inspection Section */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#e2e5e9] flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">Contributions & Donors</h3>
            <p className="text-xs text-gray-500">
              Verified financial contribution ledger for this campaign
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-gray-100 text-gray-700">
            {contribPagination.totalItems || contributions.length} Records (Page {contribPagination.page} of {contribPagination.totalPages})
          </span>
        </div>

        {contributionsLoading ? (
          <div className="p-8 text-center">
            <LoadingSpinner size="md" className="text-[#714B67] mx-auto mb-2" />
            <p className="text-xs text-gray-500">Querying contribution records...</p>
          </div>
        ) : contributions.length === 0 ? (
          <div className="p-10 text-center">
            <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900 mb-0.5">No contributions recorded yet</p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Contributions made to this campaign will appear here with financial reference details.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-[#e2e5e9] text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th scope="col" className="py-3 px-4">Reference ID</th>
                  <th scope="col" className="py-3 px-4 text-right">Amount</th>
                  <th scope="col" className="py-3 px-4 text-center">Status</th>
                  <th scope="col" className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e5e9]">
                {contributions.map((c) => (
                  <tr key={c.id || c.referenceId} className="hover:bg-gray-50/80">
                    <td className="py-3 px-4 font-mono text-xs text-gray-800">
                      {c.referenceId || c.id}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">
                      {formatCurrency(c.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge>{c.status || 'PAID'}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-gray-500">
                      {formatDateDisplay(c.date || c.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#e2e5e9] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Fundraiser</h3>
                <p className="text-xs text-gray-500">Update campaign details</p>
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
                  Title <span className="text-red-500">*</span>
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
              {confirmDialog.title || 'Confirm Status Transition'}
            </h3>
            <p className="text-sm text-gray-600">
              {confirmDialog.description || `Transition this campaign to ${confirmDialog.newStatus}?`}
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setConfirmDialog({ open: false, newStatus: '', title: '', description: '', loading: false })}
                disabled={confirmDialog.loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmStatus}
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
