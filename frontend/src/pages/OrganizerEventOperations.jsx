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
  UserCheck,
  UserPlus,
  Trash2,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { organizerService } from '../services/api';
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

const formatTimeDisplay = (startTime, endTime) => {
  if (!startTime && !endTime) return '—';
  if (startTime && !endTime) return startTime;
  if (!startTime && endTime) return `Until ${endTime}`;
  return `${startTime} - ${endTime}`;
};

export default function OrganizerEventOperations() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  // Role verification check
  const [roleError] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role && user.role !== 'eventOrganizer' && user.role !== 'admin') {
        return '403 Forbidden: Event Organizer privileges required to access Event Operations.';
      }
    } catch {
      // Rely on backend
    }
    return '';
  });

  // State
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [eventData, setEventData] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [availableVolunteers, setAvailableVolunteers] = useState([]);
  const [checkIns, setCheckIns] = useState([]);

  // Banner alert
  const [bannerAlert, setBannerAlert] = useState(null); // { type: 'success' | 'error', message: '' }

  // Modals & Dialogs
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'tickets' | 'volunteers' | 'checkin'
  
  // Edit Event Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    capacity: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Status Lifecycle Confirmation
  const [statusConfirm, setStatusConfirm] = useState({
    open: false,
    targetStatus: '',
    title: '',
    description: '',
    loading: false,
  });

  // Ticket Type Modal
  const [ttModalOpen, setTtModalOpen] = useState(false);
  const [editingTt, setEditingTt] = useState(null); // null for create, object for edit
  const [ttForm, setTtForm] = useState({
    name: '',
    memberPrice: '',
    nonMemberPrice: '',
  });
  const [ttSubmitting, setTtSubmitting] = useState(false);
  const [ttError, setTtError] = useState('');

  // Volunteer Assignment Dialog
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Volunteer Removal Confirmation
  const [removeVolConfirm, setRemoveVolConfirm] = useState({
    open: false,
    volunteer: null,
    loading: false,
  });

  // Check-In State
  const [checkInTicketId, setCheckInTicketId] = useState('');
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [checkInResult, setCheckInResult] = useState(null); // { type: 'success' | 'error', message: '' }

  // Load authoritative data
  const loadOperationsData = useCallback(async () => {
    if (roleError) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError('');
    try {
      const [opsRes, ttRes, volRes, checkInRes] = await Promise.all([
        organizerService.getEventOperations(eventId),
        organizerService.getTicketTypes(eventId).catch(() => ({ data: { data: { ticketTypes: [] } } })),
        organizerService.getEventVolunteers(eventId).catch(() => ({ data: { data: { volunteers: [] } } })),
        organizerService.getCheckIns(eventId).catch(() => ({ data: { data: { checkIns: [] } } })),
      ]);

      if (opsRes.data?.success) {
        setEventData(opsRes.data.data);
      } else {
        setFetchError('Failed to load event operations data.');
      }

      if (ttRes.data?.data?.ticketTypes) {
        setTicketTypes(ttRes.data.data.ticketTypes);
      }
      if (volRes.data?.data?.volunteers) {
        setVolunteers(volRes.data.data.volunteers);
      }
      if (checkInRes.data?.data?.checkIns) {
        setCheckIns(checkInRes.data.data.checkIns);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setFetchError('403 Forbidden: You do not have permission to manage this event.');
      } else if (err.response?.status === 404) {
        setFetchError('404 Not Found: Event does not exist.');
      } else {
        setFetchError(err.response?.data?.message || 'Failed to load event operations data.');
      }
    } finally {
      setLoading(false);
    }
  }, [eventId, roleError]);

  useEffect(() => {
    loadOperationsData();
  }, [loadOperationsData]);

  // Load available volunteers when assign modal opens
  const openAssignModal = async () => {
    setAssignModalOpen(true);
    setAssignError('');
    setSelectedVolunteerId('');
    try {
      const res = await organizerService.getAvailableVolunteers(eventId);
      if (res.data?.success && Array.isArray(res.data.data.volunteers)) {
        setAvailableVolunteers(res.data.data.volunteers);
      }
    } catch (err) {
      setAssignError(err.response?.data?.message || 'Failed to load available volunteers.');
    }
  };

  // Open Edit Event Modal with existing details
  const openEditModal = () => {
    if (!eventData?.event) return;
    const evt = eventData.event;
    setEditForm({
      title: evt.title || '',
      description: evt.description || '',
      date: evt.date || '',
      startTime: evt.startTime || '',
      endTime: evt.endTime || '',
      location: evt.location || '',
      capacity: String(evt.capacity || ''),
    });
    setEditError('');
    setEditModalOpen(true);
  };

  // Handle Edit Event Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');
    if (!editForm.title.trim()) {
      setEditError('Title is required.');
      return;
    }
    const capNum = parseInt(editForm.capacity, 10);
    if (isNaN(capNum) || capNum <= 0) {
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
        capacity: capNum,
      };
      await organizerService.updateEvent(eventId, payload);
      setEditModalOpen(false);
      setBannerAlert({ type: 'success', message: 'Event details updated successfully.' });
      loadOperationsData();
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update event.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Open Status Confirmation
  const confirmStatusChange = (newStatus) => {
    let title = `Change Status to ${newStatus}`;
    let description = `Are you sure you want to change the event status to ${newStatus}?`;

    if (newStatus === 'PUBLISHED') {
      title = 'Publish Event';
      description = 'This will make the event visible to members and enable ticket sales.';
    } else if (newStatus === 'CLOSED') {
      title = 'Close Ticket Sales';
      description = 'Members will no longer be able to purchase tickets for this event.';
    } else if (newStatus === 'COMPLETED') {
      title = 'Mark Event as Completed';
      description = 'This concludes the event operations lifecycle.';
    } else if (newStatus === 'CANCELLED') {
      title = 'Cancel Event';
      description = 'This marks the event as cancelled. This action cannot be undone.';
    }

    setStatusConfirm({
      open: true,
      targetStatus: newStatus,
      title,
      description,
      loading: false,
    });
  };

  // Handle Status Update Submit
  const handleStatusSubmit = async () => {
    setStatusConfirm((prev) => ({ ...prev, loading: true }));
    try {
      await organizerService.updateEventStatus(eventId, statusConfirm.targetStatus);
      setStatusConfirm({ open: false, targetStatus: '', title: '', description: '', loading: false });
      setBannerAlert({
        type: 'success',
        message: `Event status updated to ${statusConfirm.targetStatus}.`,
      });
      loadOperationsData();
    } catch (err) {
      setStatusConfirm((prev) => ({ ...prev, loading: false }));
      setBannerAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update event status.',
      });
    }
  };

  // Handle Ticket Type Submit (Create or Edit)
  const handleTtSubmit = async (e) => {
    e.preventDefault();
    setTtError('');
    if (!ttForm.name.trim()) {
      setTtError('Ticket type name is required.');
      return;
    }
    const memPrice = parseFloat(ttForm.memberPrice);
    const nonMemPrice = parseFloat(ttForm.nonMemberPrice);
    if (isNaN(memPrice) || memPrice < 0 || isNaN(nonMemPrice) || nonMemPrice < 0) {
      setTtError('Prices must be valid numbers greater than or equal to 0.');
      return;
    }

    setTtSubmitting(true);
    try {
      if (editingTt) {
        await organizerService.editTicketType(eventId, editingTt.id, {
          name: ttForm.name.trim(),
          memberPrice: memPrice,
          nonMemberPrice: nonMemPrice,
        });
        setBannerAlert({ type: 'success', message: 'Ticket type updated successfully.' });
      } else {
        await organizerService.createTicketType(eventId, {
          name: ttForm.name.trim(),
          memberPrice: memPrice,
          nonMemberPrice: nonMemPrice,
        });
        setBannerAlert({ type: 'success', message: 'Ticket type created successfully.' });
      }
      setTtModalOpen(false);
      setEditingTt(null);
      loadOperationsData();
    } catch (err) {
      setTtError(err.response?.data?.message || 'Failed to save ticket type.');
    } finally {
      setTtSubmitting(false);
    }
  };

  // Handle Volunteer Assignment Submit
  const handleAssignVolunteer = async (e) => {
    e.preventDefault();
    if (!selectedVolunteerId) {
      setAssignError('Please select a volunteer.');
      return;
    }

    setAssignSubmitting(true);
    setAssignError('');
    try {
      await organizerService.assignVolunteer(eventId, selectedVolunteerId);
      setAssignModalOpen(false);
      setSelectedVolunteerId('');
      setBannerAlert({ type: 'success', message: 'Volunteer assigned successfully to this event.' });
      loadOperationsData();
    } catch (err) {
      setAssignError(err.response?.data?.message || 'Failed to assign volunteer.');
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Handle Volunteer Removal
  const handleRemoveVolunteer = async () => {
    if (!removeVolConfirm.volunteer) return;
    setRemoveVolConfirm((prev) => ({ ...prev, loading: true }));
    try {
      await organizerService.removeVolunteer(eventId, removeVolConfirm.volunteer.volunteerId);
      setRemoveVolConfirm({ open: false, volunteer: null, loading: false });
      setBannerAlert({ type: 'success', message: 'Volunteer removed from event.' });
      loadOperationsData();
    } catch (err) {
      setRemoveVolConfirm((prev) => ({ ...prev, loading: false }));
      setBannerAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to remove volunteer.',
      });
    }
  };

  // Handle Check-In Submit
  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    if (!checkInTicketId.trim()) return;

    setCheckInSubmitting(true);
    setCheckInResult(null);
    try {
      const res = await organizerService.checkInTicket(eventId, checkInTicketId.trim());
      setCheckInResult({
        type: 'success',
        message: res.data?.message || 'Ticket checked in successfully!',
        data: res.data?.data,
      });
      setCheckInTicketId('');
      loadOperationsData();
    } catch (err) {
      setCheckInResult({
        type: 'error',
        message: err.response?.data?.message || 'Failed to check in ticket. Verify ticket ID and event.',
      });
    } finally {
      setCheckInSubmitting(false);
    }
  };

  if (roleError) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <h3 className="font-semibold text-sm">Access Denied</h3>
            <p className="text-xs mt-0.5">{roleError}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <LoadingSpinner size="lg" />
        <span className="text-sm font-medium text-gray-500">Loading Event Operations...</span>
      </div>
    );
  }

  if (fetchError || !eventData) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <h3 className="font-semibold text-sm">Unable to Load Event</h3>
            <p className="text-xs mt-0.5">{fetchError || 'Event details not available.'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/organizer/dashboard')}>
            Back to Organizer Dashboard
          </Button>
          <Button onClick={loadOperationsData}>Retry</Button>
        </div>
      </div>
    );
  }

  const { event, tickets, attendance, revenue } = eventData;
  const isDraft = event.status === 'DRAFT';
  const isPublished = event.status === 'PUBLISHED';
  const isClosed = event.status === 'CLOSED';
  const isCompleted = event.status === 'COMPLETED';
  const isCancelled = event.status === 'CANCELLED';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Link
            to="/organizer/dashboard"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[#714B67] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Organizer Dashboard</span>
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-xs font-medium text-gray-600 truncate max-w-xs">{event.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openEditModal}
            disabled={isCompleted || isCancelled}
            className="flex items-center gap-1.5 text-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Event</span>
          </Button>

          {isDraft && (
            <Button
              size="sm"
              onClick={() => confirmStatusChange('PUBLISHED')}
              className="bg-[#017E84] hover:bg-[#01656a] text-white text-xs flex items-center gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Publish Event</span>
            </Button>
          )}

          {isPublished && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => confirmStatusChange('CLOSED')}
              className="text-xs"
            >
              Close Sales
            </Button>
          )}

          {(isPublished || isClosed) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => confirmStatusChange('COMPLETED')}
              className="text-xs"
            >
              Mark Completed
            </Button>
          )}

          {!isCompleted && !isCancelled && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => confirmStatusChange('CANCELLED')}
              className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Cancel Event
            </Button>
          )}
        </div>
      </div>

      {/* Banner Feedback Alert */}
      {bannerAlert && (
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between text-xs ${
            bannerAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerAlert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{bannerAlert.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerAlert(null)}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Event Header Card */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-[#e2e5e9] pb-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-[#000000] tracking-tight">{event.title}</h1>
              <Badge>{event.status}</Badge>
            </div>
            <p className="text-xs text-gray-500 font-mono mt-1">ID: {event.id}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase font-semibold">Capacity:</span>
            <span className="text-base font-bold text-gray-900">{Number(event.capacity).toLocaleString()}</span>
          </div>
        </div>

        {/* Event Quick Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-700">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#714B67] shrink-0" />
            <div>
              <span className="font-semibold block text-gray-900">Date</span>
              <span>{formatDateDisplay(event.date)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#017E84] shrink-0" />
            <div>
              <span className="font-semibold block text-gray-900">Time</span>
              <span>{formatTimeDisplay(event.startTime, event.endTime)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#E4A900] shrink-0" />
            <div>
              <span className="font-semibold block text-gray-900">Location</span>
              <span className="truncate max-w-xs">{event.location || '—'}</span>
            </div>
          </div>
        </div>

        {event.description && (
          <p className="text-xs text-gray-600 bg-[#F8F9FA] p-3 rounded border border-gray-100 mt-2">
            {event.description}
          </p>
        )}
      </div>

      {/* Authoritative Operations KPIs (4 Metrics Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tickets Sold */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tickets Sold</span>
            <Ticket className="w-4 h-4 text-[#714B67]" />
          </div>
          <p className="text-2xl font-bold text-[#714B67]">{tickets.sold.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500">Confirmed orders</p>
        </div>

        {/* Remaining Capacity */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Remaining Capacity</span>
            <Users className="w-4 h-4 text-[#017E84]" />
          </div>
          <p className="text-2xl font-bold text-[#017E84]">{tickets.remaining.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500">Available passes</p>
        </div>

        {/* Attendance Checked In */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Checked In</span>
            <UserCheck className="w-4 h-4 text-[#E4A900]" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{attendance.checkedIn.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500">
            {tickets.sold > 0 ? `${Math.round((attendance.checkedIn / tickets.sold) * 100)}% of sales` : '0%'}
          </p>
        </div>

        {/* Event Revenue */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Event Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(revenue.total)}</p>
          <p className="text-[10px] text-gray-500">Gross ticket revenue</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-[#e2e5e9] flex gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-[#714B67] text-[#714B67]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Operations Overview
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('volunteers')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'volunteers'
              ? 'border-[#714B67] text-[#714B67]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Volunteers ({volunteers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'tickets'
              ? 'border-[#714B67] text-[#714B67]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          <span>Ticket Types ({ticketTypes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('checkin')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'checkin'
              ? 'border-[#714B67] text-[#714B67]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Ticket Check-In</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Operations Summary */}
          <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#714B67]" />
              <span>Event Capacity & Sales Summary</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Total Venue Capacity:</span>
                <span className="font-semibold text-gray-900">{Number(event.capacity).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Tickets Issued / Sold:</span>
                <span className="font-bold text-[#714B67]">{tickets.sold.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Available Remaining:</span>
                <span className="font-semibold text-[#017E84]">{tickets.remaining.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Attendance Checked In:</span>
                <span className="font-semibold text-gray-900">{attendance.checkedIn.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Total Valid Revenue:</span>
                <span className="font-bold text-emerald-700 text-sm">{formatCurrency(revenue.total)}</span>
              </div>
            </div>
          </div>

          {/* Quick Management Shortcuts */}
          <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#017E84]" />
              <span>Operations Management</span>
            </h2>

            <div className="space-y-2.5">
              <div className="p-3 rounded bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-gray-900 block">Volunteer Crew</span>
                  <span className="text-gray-500">{volunteers.length} volunteer(s) assigned</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setActiveTab('volunteers')} className="text-xs">
                  Manage Crew
                </Button>
              </div>

              <div className="p-3 rounded bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-gray-900 block">Ticket Passes</span>
                  <span className="text-gray-500">{ticketTypes.length} ticket tier(s) configured</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setActiveTab('tickets')} className="text-xs">
                  Configure Tiers
                </Button>
              </div>

              <div className="p-3 rounded bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-gray-900 block">Door Check-In</span>
                  <span className="text-gray-500">Scan passes at entrance</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setActiveTab('checkin')} className="text-xs">
                  Open Check-In
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VOLUNTEERS (Section 9, 10, 11, 12, 13) */}
      {activeTab === 'volunteers' && (
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#e2e5e9] pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-[#714B67]" />
                <span>Assigned Event Volunteers</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Assign and manage student volunteers allocated exclusively to this event.
              </p>
            </div>

            <Button
              size="sm"
              onClick={openAssignModal}
              disabled={isCompleted || isCancelled}
              className="bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Assign Volunteer</span>
            </Button>
          </div>

          {volunteers.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <Users className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-xs font-semibold text-gray-600">No volunteers assigned to this event.</p>
              <p className="text-[11px] text-gray-400">
                Click "+ Assign Volunteer" to add active volunteers to this event's operations team.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-[#F8F9FA] text-gray-700 uppercase font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Volunteer Name</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Assigned Date</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {volunteers.map((vol) => (
                    <tr key={vol.id || vol.volunteerId} className="hover:bg-gray-50/70">
                      <td className="py-3 px-3 font-semibold text-gray-900">{vol.name}</td>
                      <td className="py-3 px-3 text-gray-600 font-mono text-[11px]">{vol.email}</td>
                      <td className="py-3 px-3">
                        <Badge variant={vol.status === 'active' ? 'default' : 'secondary'}>
                          {vol.status || 'active'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-gray-500">{formatDateDisplay(vol.assignedAt)}</td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isCompleted || isCancelled}
                          onClick={() => setRemoveVolConfirm({ open: true, volunteer: vol, loading: false })}
                          className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700 h-7 px-2"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          <span>Remove</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TICKET TYPES */}
      {activeTab === 'tickets' && (
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#e2e5e9] pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Ticket className="w-4 h-4 text-[#714B67]" />
                <span>Configured Ticket Types</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage ticket tiers, pricing for members and non-members.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setEditingTt(null);
                setTtForm({ name: '', memberPrice: '', nonMemberPrice: '' });
                setTtError('');
                setTtModalOpen(true);
              }}
              disabled={isCompleted || isCancelled}
              className="bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Ticket Type</span>
            </Button>
          </div>

          {ticketTypes.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <Ticket className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-xs font-semibold text-gray-600">No ticket types created yet.</p>
              <p className="text-[11px] text-gray-400">
                Create at least one ticket type before publishing the event.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ticketTypes.map((tt) => (
                <div key={tt.id || tt.ticketTypeId} className="border border-[#e2e5e9] rounded-lg p-4 bg-gray-50/50 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{tt.name}</h3>
                      <span className="text-[10px] text-gray-400 font-mono">ID: {tt.id || tt.ticketTypeId}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isCompleted || isCancelled}
                      onClick={() => {
                        setEditingTt(tt);
                        setTtForm({
                          name: tt.name,
                          memberPrice: String(tt.memberPrice ?? ''),
                          nonMemberPrice: String(tt.nonMemberPrice ?? ''),
                        });
                        setTtError('');
                        setTtModalOpen(true);
                      }}
                      className="text-xs h-7 px-2"
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded border border-gray-200">
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase">Member Price</span>
                      <span className="font-bold text-[#017E84]">{formatCurrency(tt.memberPrice)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase">Non-Member Price</span>
                      <span className="font-bold text-gray-800">{formatCurrency(tt.nonMemberPrice)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CHECK-IN */}
      {activeTab === 'checkin' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Check-In Action Form */}
          <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm space-y-4 lg:col-span-1">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#714B67]" />
              <span>Door Check-In</span>
            </h2>
            <p className="text-xs text-gray-500">
              Enter or scan the attendee's Ticket UUID to record attendance at the door.
            </p>

            <form onSubmit={handleCheckInSubmit} className="space-y-3">
              <div>
                <label htmlFor="ticketIdInput" className="text-xs font-semibold text-gray-700 block mb-1">
                  Ticket ID (UUID)
                </label>
                <Input
                  id="ticketIdInput"
                  value={checkInTicketId}
                  onChange={(e) => setCheckInTicketId(e.target.value)}
                  placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                  className="font-mono text-xs"
                  disabled={checkInSubmitting || isCancelled}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={checkInSubmitting || !checkInTicketId.trim() || isCancelled}
                className="w-full bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs py-2"
              >
                {checkInSubmitting ? 'Verifying...' : 'Check In Ticket'}
              </Button>
            </form>

            {checkInResult && (
              <div
                className={`p-3 rounded border text-xs ${
                  checkInResult.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {checkInResult.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span>{checkInResult.message}</span>
                </div>
              </div>
            )}
          </div>

          {/* Recent Check-Ins List */}
          <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm space-y-4 lg:col-span-2">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center justify-between">
              <span>Recent Door Check-Ins</span>
              <span className="text-xs text-gray-500 font-normal">Total: {attendance.checkedIn}</span>
            </h2>

            {checkIns.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <UserCheck className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs text-gray-500">No attendees checked in yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-[#F8F9FA] text-gray-700 text-[11px] uppercase font-semibold">
                      <th className="py-2.5 px-3">Attendee</th>
                      <th className="py-2.5 px-3">Ticket ID</th>
                      <th className="py-2.5 px-3">Tier</th>
                      <th className="py-2.5 px-3">Checked In Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {checkIns.map((ci) => (
                      <tr key={ci.id || ci.ticketId} className="hover:bg-gray-50/70">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-gray-900 block">{ci.attendeeName || 'Member'}</span>
                          <span className="text-[11px] text-gray-500 font-mono">{ci.attendeeEmail}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-gray-600">{ci.ticketId}</td>
                        <td className="py-2.5 px-3 text-gray-700">{ci.ticketType || 'Standard'}</td>
                        <td className="py-2.5 px-3 text-gray-500">
                          {ci.checkedInAt ? new Date(ci.checkedInAt).toLocaleTimeString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN VOLUNTEER DIALOG (Section 10, 11) */}
      {/* ========================================================================= */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#714B67]" />
                <span>Assign Volunteer to Event</span>
              </h3>
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {assignError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                {assignError}
              </div>
            )}

            <form onSubmit={handleAssignVolunteer} className="space-y-4">
              <div>
                <label htmlFor="volunteerSelect" className="text-xs font-semibold text-gray-700 block mb-1">
                  Select Eligible Volunteer:
                </label>
                {availableVolunteers.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-2">
                    No unassigned active volunteers available.
                  </p>
                ) : (
                  <select
                    id="volunteerSelect"
                    value={selectedVolunteerId}
                    onChange={(e) => setSelectedVolunteerId(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    required
                  >
                    <option value="">-- Choose a volunteer --</option>
                    {availableVolunteers.map((v) => (
                      <option key={v.volunteerId} value={v.volunteerId}>
                        {v.name} ({v.email})
                      </option>
                    ))}
                  </select>
                )}
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Only verified, active accounts with the volunteer role are shown.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAssignModalOpen(false)}
                  disabled={assignSubmitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={assignSubmitting || !selectedVolunteerId}
                  className="bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs"
                >
                  {assignSubmitting ? 'Assigning...' : 'Assign Volunteer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REMOVE VOLUNTEER CONFIRMATION (Section 13) */}
      {/* ========================================================================= */}
      {removeVolConfirm.open && removeVolConfirm.volunteer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-gray-900 text-sm">Remove Volunteer</h3>
            </div>

            <p className="text-xs text-gray-600">
              Are you sure you want to remove{' '}
              <strong className="text-gray-900">{removeVolConfirm.volunteer.name}</strong> from this event?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRemoveVolConfirm({ open: false, volunteer: null, loading: false })}
                disabled={removeVolConfirm.loading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleRemoveVolunteer}
                disabled={removeVolConfirm.loading}
                className="bg-red-600 hover:bg-red-700 text-white text-xs"
              >
                {removeVolConfirm.loading ? 'Removing...' : 'Confirm Remove'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT EVENT */}
      {/* ========================================================================= */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#714B67]" />
                <span>Edit Event Details</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Title</label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="w-full text-xs border border-gray-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Date</label>
                  <Input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Start Time</label>
                  <Input
                    type="time"
                    value={editForm.startTime}
                    onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">End Time</label>
                  <Input
                    type="time"
                    value={editForm.endTime}
                    onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Location</label>
                  <Input
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Capacity</label>
                  <Input
                    type="number"
                    min="1"
                    value={editForm.capacity}
                    onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
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
                  className="bg-[#714B67] hover:bg-[#5b3c53] text-white"
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TICKET TYPE (Create or Edit) */}
      {/* ========================================================================= */}
      {ttModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Ticket className="w-4 h-4 text-[#714B67]" />
                <span>{editingTt ? 'Edit Ticket Type' : 'New Ticket Type'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setTtModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {ttError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                {ttError}
              </div>
            )}

            <form onSubmit={handleTtSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Tier Name</label>
                <Input
                  value={ttForm.name}
                  onChange={(e) => setTtForm({ ...ttForm, name: e.target.value })}
                  placeholder="e.g. VIP Pass, Student Entry"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Member Price (₹)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ttForm.memberPrice}
                  onChange={(e) => setTtForm({ ...ttForm, memberPrice: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Non-Member Price (₹)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ttForm.nonMemberPrice}
                  onChange={(e) => setTtForm({ ...ttForm, nonMemberPrice: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTtModalOpen(false)}
                  disabled={ttSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={ttSubmitting}
                  className="bg-[#714B67] hover:bg-[#5b3c53] text-white"
                >
                  {ttSubmitting ? 'Saving...' : 'Save Ticket Type'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: STATUS LIFECYCLE CONFIRMATION */}
      {/* ========================================================================= */}
      {statusConfirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <h3 className="font-bold text-gray-900 text-sm">{statusConfirm.title}</h3>
            </div>

            <p className="text-xs text-gray-600">{statusConfirm.description}</p>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStatusConfirm({ open: false, targetStatus: '', title: '', description: '', loading: false })}
                disabled={statusConfirm.loading}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleStatusSubmit}
                disabled={statusConfirm.loading}
                className="bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs"
              >
                {statusConfirm.loading ? 'Updating...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
