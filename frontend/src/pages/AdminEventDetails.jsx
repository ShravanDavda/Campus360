import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Ticket,
  ChevronLeft,
  Edit3,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
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
    if (isNaN(d.getTime())) return dateStr;
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

export default function AdminEventDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  // Authentication check
  const [authError] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role && user.role !== 'admin') {
        return '403 Forbidden: Administrator privileges required to access Admin Event Management.';
      }
    } catch {
      // rely on backend auth
    }
    return '';
  });

  // Event State
  const [event, setEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Banner feedback
  const [bannerAlert, setBannerAlert] = useState(null); // { type: 'success' | 'error', message: '' }

  // Lifecycle Action Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    action: null, // 'PUBLISHED' | 'CLOSED' | 'CANCELLED' | 'COMPLETED'
    title: '',
    description: '',
    confirmText: '',
    isDestructive: false,
    loading: false,
  });

  // Edit Event Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    capacity: '',
  });

  // Ticket Type Modal State (Add or Edit)
  const [ticketModal, setTicketModal] = useState({
    open: false,
    mode: 'create', // 'create' | 'edit'
    ticketTypeId: null,
    submitting: false,
    error: '',
    form: {
      name: '',
      memberPrice: '',
      nonMemberPrice: '',
    },
  });

  // Check-In Panel State
  const [checkInTicketId, setCheckInTicketId] = useState('');
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [checkInResult, setCheckInResult] = useState(null); // { success: boolean, message: string, data?: any }

  // Load Event Details from Backend
  const loadEvent = useCallback(async () => {
    if (authError || !eventId) return;

    setLoading(true);
    setFetchError('');
    try {
      const response = await adminService.getAdminEvent(eventId);
      if (response.data?.success) {
        const data = response.data.data;
        const evt = data?.event || data;
        setEvent(evt);

        // Prepopulate edit form
        setEditForm({
          title: evt.title || '',
          description: evt.description || '',
          date: evt.date ? (evt.date.includes('T') ? evt.date.split('T')[0] : evt.date) : '',
          startTime: evt.startTime || evt.start_time || '',
          endTime: evt.endTime || evt.end_time || '',
          location: evt.location || '',
          capacity: evt.capacity || '',
        });

        // Set ticket types if embedded in response
        if (Array.isArray(data?.ticketTypes)) {
          setTicketTypes(data.ticketTypes);
        } else if (Array.isArray(evt.ticketTypes)) {
          setTicketTypes(evt.ticketTypes);
        }
      } else {
        setFetchError('Unexpected response from server.');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setFetchError('404: Event not found.');
      } else if (err.response?.status === 403) {
        setFetchError('403 Forbidden: You do not have permission to view this event.');
      } else {
        setFetchError(err.response?.data?.message || err.message || 'Unable to load event details.');
      }
    } finally {
      setLoading(false);
    }
  }, [authError, eventId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  // Lifecycle Status Transitions
  const promptStatusChange = (newStatus) => {
    if (!event) return;

    let title = '';
    let description = '';
    let confirmText = '';
    let isDestructive = false;

    switch (newStatus) {
      case 'PUBLISHED':
        title = 'Publish Event?';
        description = `Are you sure you want to publish "${event.title}"? The event will become visible to members and tickets will go on sale.`;
        confirmText = 'Publish Event';
        break;
      case 'CLOSED':
        title = 'Close Ticket Sales?';
        description = `Are you sure you want to close ticket sales for "${event.title}"? Members will no longer be able to purchase tickets.`;
        confirmText = 'Close Sales';
        isDestructive = true;
        break;
      case 'CANCELLED':
        title = 'Cancel Event?';
        description = `Are you sure you want to cancel "${event.title}"? This is an irreversible operation.`;
        confirmText = 'Cancel Event';
        isDestructive = true;
        break;
      case 'COMPLETED':
        title = 'Mark Event as Completed?';
        description = `Are you sure you want to mark "${event.title}" as completed? Attendance and check-in records will be locked.`;
        confirmText = 'Complete Event';
        break;
      default:
        title = `Change Status to ${newStatus}?`;
        description = `Are you sure you want to transition this event status to ${newStatus}?`;
        confirmText = 'Confirm Transition';
    }

    setConfirmDialog({
      open: true,
      action: newStatus,
      title,
      description,
      confirmText,
      isDestructive,
      loading: false,
    });
  };

  const handleExecuteStatusChange = async () => {
    if (!confirmDialog.action || !eventId) return;

    setConfirmDialog((prev) => ({ ...prev, loading: true }));
    try {
      const res = await adminService.updateAdminEventStatus(eventId, confirmDialog.action);
      if (res.data?.success) {
        setBannerAlert({
          type: 'success',
          message: `Event status successfully updated to ${confirmDialog.action}.`,
        });
        setConfirmDialog({ open: false, action: null, title: '', description: '', confirmText: '', isDestructive: false, loading: false });
        // Revalidate event details
        loadEvent();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update event status.';
      setBannerAlert({
        type: 'error',
        message: msg,
      });
      setConfirmDialog({ open: false, action: null, title: '', description: '', confirmText: '', isDestructive: false, loading: false });
    }
  };

  // Edit Event Form Handlers
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');

    // Validation
    if (!editForm.title.trim()) {
      setEditError('Title is required.');
      return;
    }
    if (!editForm.description.trim()) {
      setEditError('Description is required.');
      return;
    }
    if (!editForm.date) {
      setEditError('Date is required.');
      return;
    }
    if (!editForm.startTime) {
      setEditError('Start time is required.');
      return;
    }
    if (!editForm.endTime) {
      setEditError('End time is required.');
      return;
    }
    if (editForm.endTime <= editForm.startTime) {
      setEditError('End time must be after start time.');
      return;
    }
    if (!editForm.location.trim()) {
      setEditError('Location is required.');
      return;
    }
    const cap = Number(editForm.capacity);
    if (!Number.isInteger(cap) || cap <= 0) {
      setEditError('Capacity must be a positive integer.');
      return;
    }

    setEditSubmitting(true);
    try {
      const payload = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        date: editForm.date,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        location: editForm.location.trim(),
        capacity: cap,
      };

      const res = await adminService.updateAdminEvent(eventId, payload);
      if (res.data?.success) {
        setBannerAlert({
          type: 'success',
          message: 'Event updated successfully.',
        });
        setEditModalOpen(false);
        // Revalidate
        loadEvent();
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setEditError(err.response?.data?.message || 'Conflict: Unable to modify event in current state.');
      } else if (err.response?.status === 400) {
        setEditError(err.response?.data?.message || 'Invalid input data.');
      } else {
        setEditError(err.response?.data?.message || 'Failed to update event.');
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  // Ticket Type Form Handlers
  const openAddTicketModal = () => {
    setTicketModal({
      open: true,
      mode: 'create',
      ticketTypeId: null,
      submitting: false,
      error: '',
      form: {
        name: '',
        memberPrice: '',
        nonMemberPrice: '',
      },
    });
  };

  const openEditTicketModal = (tt) => {
    setTicketModal({
      open: true,
      mode: 'edit',
      ticketTypeId: tt.id,
      submitting: false,
      error: '',
      form: {
        name: tt.name || '',
        memberPrice: tt.memberPrice ?? tt.member_price ?? '',
        nonMemberPrice: tt.nonMemberPrice ?? tt.non_member_price ?? '',
      },
    });
  };

  const handleTicketTypeSubmit = async (e) => {
    e.preventDefault();
    setTicketModal((prev) => ({ ...prev, error: '' }));

    const { name, memberPrice, nonMemberPrice } = ticketModal.form;
    if (!name.trim()) {
      setTicketModal((prev) => ({ ...prev, error: 'Ticket type name is required.' }));
      return;
    }
    const mPrice = Number(memberPrice);
    const nmPrice = Number(nonMemberPrice);
    if (isNaN(mPrice) || mPrice < 0) {
      setTicketModal((prev) => ({ ...prev, error: 'Member price must be >= 0.' }));
      return;
    }
    if (isNaN(nmPrice) || nmPrice < 0) {
      setTicketModal((prev) => ({ ...prev, error: 'Non-member price must be >= 0.' }));
      return;
    }

    setTicketModal((prev) => ({ ...prev, submitting: true }));
    try {
      const payload = {
        name: name.trim(),
        memberPrice: mPrice,
        nonMemberPrice: nmPrice,
      };

      if (ticketModal.mode === 'create') {
        const res = await adminService.createTicketType(eventId, payload);
        if (res.data?.success) {
          setBannerAlert({
            type: 'success',
            message: `Ticket type "${name}" created successfully.`,
          });
          setTicketModal((prev) => ({ ...prev, open: false }));
          loadEvent();
        }
      } else {
        const res = await adminService.updateTicketType(eventId, ticketModal.ticketTypeId, payload);
        if (res.data?.success) {
          setBannerAlert({
            type: 'success',
            message: `Ticket type "${name}" updated successfully.`,
          });
          setTicketModal((prev) => ({ ...prev, open: false }));
          loadEvent();
        }
      }
    } catch (err) {
      if (err.response?.status === 409) {
        setTicketModal((prev) => ({
          ...prev,
          error: err.response?.data?.message || 'A ticket type with this name already exists for this event.',
        }));
      } else {
        setTicketModal((prev) => ({
          ...prev,
          error: err.response?.data?.message || 'Failed to save ticket type.',
        }));
      }
    } finally {
      setTicketModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Check-In Handler
  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    if (!checkInTicketId.trim()) return;

    setCheckInSubmitting(true);
    setCheckInResult(null);

    try {
      const res = await adminService.checkInTicket(eventId, checkInTicketId.trim());
      if (res.data?.success) {
        setCheckInResult({
          success: true,
          message: 'Attendee ticket checked in successfully!',
          data: res.data.data,
        });
        setCheckInTicketId('');
        // Revalidate event metrics (e.g. checked-in count / sold tickets)
        loadEvent();
      }
    } catch (err) {
      const status = err.response?.status;
      let msg = 'Failed to process check-in.';
      if (status === 404) {
        msg = 'Invalid ticket ID or ticket not found.';
      } else if (status === 409) {
        msg = err.response?.data?.message || 'Ticket conflict: already checked in or invalid for this event.';
      } else if (status === 403) {
        msg = 'Permission denied: Administrator role required.';
      } else {
        msg = err.response?.data?.message || 'Unable to complete check-in.';
      }

      setCheckInResult({
        success: false,
        message: msg,
      });
    } finally {
      setCheckInSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-16 text-center shadow-sm">
        <LoadingSpinner className="mx-auto h-8 w-8 text-[#714B67]" />
        <p className="mt-3 text-sm text-gray-500 font-medium">Loading event command center...</p>
      </div>
    );
  }

  if (fetchError || !event) {
    return (
      <div className="bg-white border border-red-200 rounded-lg p-8 text-center shadow-sm space-y-4">
        <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
        <h2 className="text-lg font-bold text-gray-900">Event Unavailable</h2>
        <p className="text-sm text-gray-600 max-w-md mx-auto">{fetchError || 'Event not found.'}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" onClick={() => navigate('/admin/events')}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Events
          </Button>
          <Button variant="primary" onClick={loadEvent}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Calculate visual occupancy for presentation only
  const capacity = Number(event.capacity || 0);
  const sold = Number(event.soldTickets || 0);
  const remaining = Number(event.remainingCapacity ?? Math.max(0, capacity - sold));
  const occupancyPercent = capacity > 0 ? Math.min(100, Math.round((sold / capacity) * 100)) : 0;

  // Lifecycle action permissions
  const isDraft = event.status === 'DRAFT';
  const isPublished = event.status === 'PUBLISHED';
  const isClosed = event.status === 'CLOSED';
  const isCancelled = event.status === 'CANCELLED';
  const isCompleted = event.status === 'COMPLETED';

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

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link to="/admin/events" className="hover:text-[#714B67] hover:underline flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" />
          Admin Events
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-semibold truncate max-w-xs">{event.title}</span>
      </div>

      {/* Event Header Section */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-[#000000] tracking-tight">{event.title}</h1>
              <Badge>{event.status}</Badge>
            </div>
            {event.description && (
              <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">{event.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600 pt-2">
              <div className="flex items-center gap-1.5 font-medium text-gray-900">
                <Calendar className="w-4 h-4 text-[#714B67]" />
                <span>{formatDateDisplay(event.date)}</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-gray-900">
                <Clock className="w-4 h-4 text-[#714B67]" />
                <span>
                  {event.startTime || event.start_time || '—'} –{' '}
                  {event.endTime || event.end_time || '—'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-gray-900">
                <MapPin className="w-4 h-4 text-[#714B67]" />
                <span>{event.location}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons & Lifecycle Transitions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
            {/* Edit Button */}
            {!isCancelled && !isCompleted && (
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(true)}
                className="flex items-center gap-1.5 text-xs h-9"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Event</span>
              </Button>
            )}

            {/* Lifecycle Status Buttons */}
            {isDraft && (
              <Button
                variant="primary"
                onClick={() => promptStatusChange('PUBLISHED')}
                className="flex items-center gap-1.5 text-xs h-9"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Publish Event</span>
              </Button>
            )}

            {isPublished && (
              <>
                <Button
                  variant="gold"
                  onClick={() => promptStatusChange('CLOSED')}
                  className="flex items-center gap-1.5 text-xs h-9"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Close Sales</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => promptStatusChange('COMPLETED')}
                  className="flex items-center gap-1.5 text-xs h-9"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Complete</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => promptStatusChange('CANCELLED')}
                  className="flex items-center gap-1.5 text-xs h-9 text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Cancel Event</span>
                </Button>
              </>
            )}

            {isClosed && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => promptStatusChange('COMPLETED')}
                  className="flex items-center gap-1.5 text-xs h-9"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Mark Completed</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => promptStatusChange('CANCELLED')}
                  className="flex items-center gap-1.5 text-xs h-9 text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Cancel Event</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Capacity & Sales Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Capacity */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Total Capacity
            </span>
            <Users className="w-4 h-4 text-[#714B67]" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-gray-900 block">
              {capacity.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500 mt-1 block">Maximum allocated attendee seats</span>
          </div>
        </div>

        {/* Sold Tickets */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Tickets Sold
            </span>
            <Ticket className="w-4 h-4 text-[#017E84]" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-[#714B67] block">
              {sold.toLocaleString()}
            </span>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
              <span>Occupancy rate:</span>
              <span className="font-semibold text-gray-700">{occupancyPercent}%</span>
            </div>
            {/* Visual occupancy bar */}
            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-[#714B67] h-1.5 rounded-full transition-all"
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Remaining Capacity */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Remaining Capacity
            </span>
            <Badge variant={remaining <= 0 ? 'danger' : 'teal'}>
              {remaining <= 0 ? 'Sold Out' : 'Available'}
            </Badge>
          </div>
          <div className="mt-3">
            <span
              className={`text-3xl font-extrabold block ${
                remaining <= 0 ? 'text-red-600' : 'text-[#017E84]'
              }`}
            >
              {remaining.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500 mt-1 block">Unsold seats remaining</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Ticket Operations & Admin Check-In */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket Types Operations (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9]">
            <div>
              <h2 className="text-base font-bold text-gray-900">Ticket Types & Pricing</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Configure tiered ticket categories, member discounts, and pricing.
              </p>
            </div>
            {!isCancelled && !isCompleted && (
              <Button
                variant="primary"
                size="sm"
                onClick={openAddTicketModal}
                className="flex items-center gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Ticket Type</span>
              </Button>
            )}
          </div>

          {ticketTypes.length === 0 ? (
            <div className="text-center py-8 bg-[#F8F9FA] rounded-lg border border-dashed border-[#e2e5e9] p-6">
              <Ticket className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">No ticket types configured.</p>
              <p className="text-xs text-gray-500 mt-1">
                Add at least one ticket type so members can register and purchase tickets.
              </p>
              {!isCancelled && !isCompleted && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openAddTicketModal}
                  className="mt-3 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add First Ticket Type
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#e2e5e9] text-left text-xs">
                <thead className="bg-[#F8F9FA] text-gray-700 uppercase font-bold tracking-wider">
                  <tr>
                    <th scope="col" className="px-3.5 py-2.5">Name</th>
                    <th scope="col" className="px-3.5 py-2.5">Member Price</th>
                    <th scope="col" className="px-3.5 py-2.5">Non-Member Price</th>
                    <th scope="col" className="px-3.5 py-2.5">Availability</th>
                    <th scope="col" className="px-3.5 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e5e9] bg-white">
                  {ticketTypes.map((tt) => {
                    const mPrice = tt.memberPrice ?? tt.member_price;
                    const nmPrice = tt.nonMemberPrice ?? tt.non_member_price;
                    const isAvail = (tt.availableQuantity ?? 1) > 0;

                    return (
                      <tr key={tt.id} className="hover:bg-gray-50/80">
                        <td className="px-3.5 py-3 font-semibold text-gray-900">{tt.name}</td>
                        <td className="px-3.5 py-3 text-[#017E84] font-bold">
                          {formatCurrency(mPrice)}
                        </td>
                        <td className="px-3.5 py-3 text-gray-700 font-medium">
                          {formatCurrency(nmPrice)}
                        </td>
                        <td className="px-3.5 py-3">
                          <Badge variant={isAvail ? 'teal' : 'danger'}>
                            {isAvail ? 'Available' : 'Sold Out'}
                          </Badge>
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          {!isCancelled && !isCompleted && (
                            <button
                              type="button"
                              onClick={() => openEditTicketModal(tt)}
                              className="text-xs font-semibold text-[#714B67] hover:underline"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Admin Check-In Operations Panel (1 Col) */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#e2e5e9]">
            <ShieldCheck className="w-5 h-5 text-[#714B67]" />
            <div>
              <h2 className="text-base font-bold text-gray-900">Admin Check-In</h2>
              <p className="text-xs text-gray-500">Scan or enter ticket ID to verify entry.</p>
            </div>
          </div>

          <form onSubmit={handleCheckInSubmit} className="space-y-3">
            <div>
              <label htmlFor="checkin-ticket-id" className="block text-xs font-semibold text-gray-700 mb-1">
                Ticket ID <span className="text-red-500">*</span>
              </label>
              <Input
                id="checkin-ticket-id"
                type="text"
                required
                value={checkInTicketId}
                onChange={(e) => setCheckInTicketId(e.target.value)}
                placeholder="Enter attendee ticket UUID..."
                className="w-full text-xs font-mono"
                disabled={checkInSubmitting || isCancelled}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={checkInSubmitting || !checkInTicketId.trim() || isCancelled}
              isLoading={checkInSubmitting}
              className="w-full text-xs"
            >
              Verify & Check In
            </Button>
          </form>

          {/* Check-In Result Notice */}
          {checkInResult && (
            <div
              className={`p-3 rounded-lg border text-xs ${
                checkInResult.success
                  ? 'bg-teal-50 border-[#017E84]/30 text-[#017E84]'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <div className="flex items-start gap-2">
                {checkInResult.success ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-[#017E84] mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">{checkInResult.message}</p>
                  {checkInResult.data?.checkedInAt && (
                    <p className="text-[11px] mt-1 text-gray-600">
                      Timestamp: {new Date(checkInResult.data.checkedInAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded border border-[#e2e5e9]">
            <strong>Note:</strong> Check-ins are permanently recorded in PostgreSQL. Duplicate check-ins
            or invalid event tickets will be strictly rejected with a conflict error.
          </div>
        </div>
      </div>

      {/* EDIT EVENT MODAL */}
      {editModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-event-modal-title"
        >
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#e2e5e9]">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#714B67]" />
                <h2 id="edit-event-modal-title" className="text-lg font-bold text-gray-900">
                  Edit Event Details
                </h2>
              </div>
              <button
                type="button"
                onClick={() => !editSubmitting && setEditModalOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="Close dialog"
                disabled={editSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-4 p-3 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="edit-title" className="block text-xs font-semibold text-gray-700 mb-1">
                  Event Title <span className="text-red-500">*</span>
                </label>
                <Input
                  id="edit-title"
                  name="title"
                  type="text"
                  required
                  value={editForm.title}
                  onChange={handleEditInputChange}
                  className="w-full text-sm"
                  disabled={editSubmitting}
                />
              </div>

              <div>
                <label htmlFor="edit-desc" className="block text-xs font-semibold text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="edit-desc"
                  name="description"
                  required
                  rows={3}
                  value={editForm.description}
                  onChange={handleEditInputChange}
                  className="w-full rounded border border-[#e2e5e9] p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  disabled={editSubmitting}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="edit-date" className="block text-xs font-semibold text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="edit-date"
                    name="date"
                    type="date"
                    required
                    value={editForm.date}
                    onChange={handleEditInputChange}
                    className="w-full text-xs"
                    disabled={editSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="edit-start" className="block text-xs font-semibold text-gray-700 mb-1">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="edit-start"
                    name="startTime"
                    type="time"
                    required
                    value={editForm.startTime}
                    onChange={handleEditInputChange}
                    className="w-full text-xs"
                    disabled={editSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="edit-end" className="block text-xs font-semibold text-gray-700 mb-1">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="edit-end"
                    name="endTime"
                    type="time"
                    required
                    value={editForm.endTime}
                    onChange={handleEditInputChange}
                    className="w-full text-xs"
                    disabled={editSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-location" className="block text-xs font-semibold text-gray-700 mb-1">
                    Location <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="edit-location"
                    name="location"
                    type="text"
                    required
                    value={editForm.location}
                    onChange={handleEditInputChange}
                    className="w-full text-sm"
                    disabled={editSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="edit-capacity" className="block text-xs font-semibold text-gray-700 mb-1">
                    Capacity <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="edit-capacity"
                    name="capacity"
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={editForm.capacity}
                    onChange={handleEditInputChange}
                    className="w-full text-sm"
                    disabled={editSubmitting}
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
                  variant="primary"
                  disabled={editSubmitting}
                  isLoading={editSubmitting}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TICKET TYPE MODAL (CREATE / EDIT) */}
      {ticketModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ticket-modal-title"
        >
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9]">
              <h2 id="ticket-modal-title" className="text-base font-bold text-gray-900">
                {ticketModal.mode === 'create' ? 'Add Ticket Type' : 'Edit Ticket Type'}
              </h2>
              <button
                type="button"
                onClick={() => !ticketModal.submitting && setTicketModal((prev) => ({ ...prev, open: false }))}
                className="p-1 rounded text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="Close dialog"
                disabled={ticketModal.submitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {ticketModal.error && (
              <div className="mt-3 p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                {ticketModal.error}
              </div>
            )}

            <form onSubmit={handleTicketTypeSubmit} className="mt-4 space-y-3">
              <div>
                <label htmlFor="tt-name" className="block text-xs font-semibold text-gray-700 mb-1">
                  Ticket Category Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="tt-name"
                  type="text"
                  required
                  placeholder="e.g. Student Pass, VIP Access"
                  value={ticketModal.form.name}
                  onChange={(e) =>
                    setTicketModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, name: e.target.value },
                    }))
                  }
                  className="w-full text-xs"
                  disabled={ticketModal.submitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="tt-mprice" className="block text-xs font-semibold text-gray-700 mb-1">
                    Member Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="tt-mprice"
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="0"
                    value={ticketModal.form.memberPrice}
                    onChange={(e) =>
                      setTicketModal((prev) => ({
                        ...prev,
                        form: { ...prev.form, memberPrice: e.target.value },
                      }))
                    }
                    className="w-full text-xs"
                    disabled={ticketModal.submitting}
                  />
                </div>

                <div>
                  <label htmlFor="tt-nmprice" className="block text-xs font-semibold text-gray-700 mb-1">
                    Non-Member Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="tt-nmprice"
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="0"
                    value={ticketModal.form.nonMemberPrice}
                    onChange={(e) =>
                      setTicketModal((prev) => ({
                        ...prev,
                        form: { ...prev.form, nonMemberPrice: e.target.value },
                      }))
                    }
                    className="w-full text-xs"
                    disabled={ticketModal.submitting}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#e2e5e9] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTicketModal((prev) => ({ ...prev, open: false }))}
                  disabled={ticketModal.submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={ticketModal.submitting}
                  isLoading={ticketModal.submitting}
                >
                  {ticketModal.mode === 'create' ? 'Create Ticket Type' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG FOR LIFECYCLE MUTATIONS */}
      {confirmDialog.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-full shrink-0 ${
                  confirmDialog.isDestructive ? 'bg-red-100 text-red-600' : 'bg-[#714B67]/10 text-[#714B67]'
                }`}
              >
                {confirmDialog.isDestructive ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2 id="confirm-dialog-title" className="text-base font-bold text-gray-900">
                  {confirmDialog.title}
                </h2>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  {confirmDialog.description}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#e2e5e9] flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
                disabled={confirmDialog.loading}
              >
                Cancel
              </Button>
              <Button
                variant={confirmDialog.isDestructive ? 'outline' : 'primary'}
                size="sm"
                onClick={handleExecuteStatusChange}
                disabled={confirmDialog.loading}
                isLoading={confirmDialog.loading}
                className={confirmDialog.isDestructive ? 'text-red-700 border-red-300 hover:bg-red-50' : ''}
              >
                {confirmDialog.confirmText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
