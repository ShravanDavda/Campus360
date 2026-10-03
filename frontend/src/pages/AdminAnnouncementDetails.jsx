import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Megaphone,
  Calendar,
  Clock,
  Users,
  Edit2,
  Send,
  Archive,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { adminService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const formatDateTime = (dateStr) => {
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

const formatAudienceLabel = (aud) => {
  if (!aud) return 'All Members';
  if (aud === 'ALL_MEMBERS') return 'All Members';
  return aud;
};

export default function AdminAnnouncementDetails() {
  const { announcementId } = useParams();
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

  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  // Notification / Toast
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    audience: 'ALL_MEMBERS',
  });

  // Status Modal State (Publish / Archive)
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusTargetValue, setStatusTargetValue] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Fetch Announcement Details
  const fetchAnnouncementDetail = useCallback(async () => {
    if (!announcementId) return;
    setLoading(true);
    setError('');
    setNotFound(false);

    try {
      const res = await adminService.getAdminAnnouncement(announcementId);
      const ann = res.data?.data?.announcement || res.data?.data || null;
      if (!ann) {
        setNotFound(true);
      } else {
        setAnnouncement(ann);
        setEditForm({
          title: ann.title || '',
          content: ann.content || '',
          audience: ann.audience || 'ALL_MEMBERS',
        });
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else if (err.response?.status === 403) {
        setError('403 Forbidden: Administrator privileges required.');
      } else if (err.response?.status === 401) {
        setError('401 Unauthorized: Session expired. Please sign in again.');
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to load announcement details. Please retry.';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [announcementId]);

  useEffect(() => {
    fetchAnnouncementDetail();
  }, [fetchAnnouncementDetail]);

  // Handle Edit Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim()) {
      setEditError('Title is required.');
      return;
    }
    if (!editForm.content.trim()) {
      setEditError('Content is required.');
      return;
    }

    setEditSubmitting(true);
    setEditError('');

    try {
      const payload = {
        title: editForm.title.trim(),
        content: editForm.content.trim(),
        audience: editForm.audience || 'ALL_MEMBERS',
      };

      const res = await adminService.updateAdminAnnouncement(announcementId, payload);
      const updated = res.data?.data?.announcement || res.data?.data;

      showToast('Announcement updated successfully.');
      setEditModalOpen(false);
      if (updated) {
        setAnnouncement(updated);
      } else {
        fetchAnnouncementDetail();
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to update announcement. Please check inputs and try again.';
      setEditError(msg);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle Status Update (Publish / Archive)
  const handleStatusSubmit = async () => {
    if (!statusTargetValue) return;

    setStatusSubmitting(true);
    setStatusError('');

    try {
      await adminService.updateAdminAnnouncementStatus(announcementId, statusTargetValue);

      showToast(
        `Announcement marked as ${statusTargetValue === 'PUBLISHED' ? 'Published' : 'Archived'} successfully.`
      );
      setStatusModalOpen(false);
      fetchAnnouncementDetail();
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-red-900">Access Restricted</h2>
            <p className="text-sm text-red-700">{authError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/announcements')}
              className="mt-2"
            >
              Return to Announcements
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="h-4 bg-gray-200 rounded w-36 animate-pulse"></div>
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-72"></div>
          <div className="h-4 bg-gray-100 rounded w-48"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
            <Megaphone className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Announcement Not Found</h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            No announcement record was found for ID: <span className="font-mono text-gray-800">{announcementId}</span>. It may have been archived or removed.
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/announcements')}
              className="inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Admin Announcements
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start justify-between shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-red-900">Error Loading Notice</h2>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnnouncementDetail}
            className="flex items-center gap-1"
          >
            <RotateCcw className="h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const isDraft = String(announcement?.status).toUpperCase() === 'DRAFT';
  const isPublished = String(announcement?.status).toUpperCase() === 'PUBLISHED';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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

      {/* Navigation Breadcrumb */}
      <div>
        <Link
          to="/admin/announcements"
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5 text-gray-500" />
          Back to Admin Announcements
        </Link>
      </div>

      {/* Main Announcement Card */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg shadow-sm overflow-hidden">
        {/* Header Banner */}
        <div className="p-6 border-b border-[#e2e5e9] bg-[#F8F9FA] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Official Bulletin
              </span>
              <Badge>{announcement.status || 'DRAFT'}</Badge>
              <span className="inline-flex items-center gap-1 text-xs text-gray-600 font-medium">
                <Users className="h-3.5 w-3.5 text-gray-400" />
                {formatAudienceLabel(announcement.audience)}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {announcement.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditError('');
                setEditForm({
                  title: announcement.title || '',
                  content: announcement.content || '',
                  audience: announcement.audience || 'ALL_MEMBERS',
                });
                setEditModalOpen(true);
              }}
              className="flex items-center gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5 text-gray-600" />
              <span>Edit</span>
            </Button>

            {isDraft && (
              <Button
                size="sm"
                onClick={() => {
                  setStatusTargetValue('PUBLISHED');
                  setStatusError('');
                  setStatusModalOpen(true);
                }}
                className="bg-[#017E84] hover:bg-[#015f64] text-white flex items-center gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Publish</span>
              </Button>
            )}

            {isPublished && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusTargetValue('ARCHIVED');
                  setStatusError('');
                  setStatusModalOpen(true);
                }}
                className="text-gray-700 hover:text-gray-900 flex items-center gap-1.5"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Archive</span>
              </Button>
            )}
          </div>
        </div>

        {/* Content Body — Content Display Safety: Plain text rendering with preserved newlines */}
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Notice Content
            </h2>
            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-gray-50/50 p-5 rounded-lg border border-[#e2e5e9]">
              {announcement.content}
            </div>
          </div>

          {/* Audit / Metadata Grid */}
          <div className="border-t border-[#e2e5e9] pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-600">
            <div className="space-y-1">
              <span className="text-gray-400 font-medium block uppercase tracking-wider">
                Published At
              </span>
              <p className="text-gray-800 font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#714B67]" />
                {announcement.publishedAt ? formatDateTime(announcement.publishedAt) : 'Not published yet'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-gray-400 font-medium block uppercase tracking-wider">
                Created At
              </span>
              <p className="text-gray-800 font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                {formatDateTime(announcement.createdAt)}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-gray-400 font-medium block uppercase tracking-wider">
                Last Updated
              </span>
              <p className="text-gray-800 font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                {formatDateTime(announcement.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F8F9FA] border-t border-[#e2e5e9] flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/announcements')}
            className="flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Announcements
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnnouncementDetail}
            className="flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Edit Announcement Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl w-full max-w-xl overflow-hidden">
            <div className="p-5 border-b border-[#e2e5e9] flex items-center justify-between bg-[#F8F9FA]">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-[#714B67]" />
                <h3 className="text-base font-bold text-gray-900">Edit Announcement</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label htmlFor="edit-ann-title" className="text-xs font-semibold text-gray-700">
                  Announcement Title <span className="text-red-500">*</span>
                </label>
                <Input
                  id="edit-ann-title"
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full"
                  required
                />
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <label htmlFor="edit-ann-content" className="text-xs font-semibold text-gray-700">
                  Notice Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="edit-ann-content"
                  rows={6}
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  className="w-full text-sm border border-[#e2e5e9] rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[#714B67] bg-white text-gray-900"
                  required
                />
              </div>

              {/* Audience */}
              <div className="space-y-1.5">
                <label htmlFor="edit-ann-audience" className="text-xs font-semibold text-gray-700">
                  Target Audience
                </label>
                <select
                  id="edit-ann-audience"
                  value={editForm.audience}
                  onChange={(e) => setEditForm({ ...editForm, audience: e.target.value })}
                  className="w-full text-sm border border-[#e2e5e9] rounded-md px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]"
                >
                  <option value="ALL_MEMBERS">All Members (LDCE Student Association)</option>
                </select>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[#e2e5e9] flex justify-end items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModalOpen(false)}
                  disabled={editSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={editSubmitting}
                  className="bg-[#714B67] hover:bg-[#5a3b52] text-white flex items-center gap-1.5"
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

      {/* Status Modal (Publish / Archive) */}
      {statusModalOpen && (
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
                Are you sure you want to change the status of "
                <span className="font-semibold text-gray-900">{announcement.title}</span>
                " to{' '}
                <span className="font-bold text-[#714B67]">{statusTargetValue}</span>?
              </p>

              {statusTargetValue === 'PUBLISHED' ? (
                <p className="text-xs text-gray-500">
                  This bulletin will immediately become visible to all active organization members.
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  Archiving hides this notice from the active member feed while preserving audit history.
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
