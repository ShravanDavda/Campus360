import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  CalendarCheck,
  FileText,
  Ticket,
  UserCheck,
  Clock,
  MapPin,
  Eye,
  RotateCw,
  Building2,
  ShieldCheck,
  Megaphone,
  ArrowRight,
} from 'lucide-react';
import { organizerService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { EmptyState } from '../components/ui/EmptyState';

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

const formatTimeDisplay = (startTime, endTime) => {
  if (!startTime && !endTime) return '—';
  if (startTime && !endTime) return startTime;
  if (!startTime && endTime) return `Until ${endTime}`;
  return `${startTime} - ${endTime}`;
};

const formatNumber = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN');
};

function OrganizerDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading organizer dashboard">
      {/* Top Banner Skeleton */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-8 bg-gray-300 rounded w-72"></div>
          <div className="h-4 bg-gray-100 rounded w-96 max-w-full"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-32"></div>
      </div>

      {/* KPI Cards Skeleton (6 cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white border border-[#e2e5e9] rounded-lg p-4 h-32 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-16"></div>
            <div className="h-8 bg-gray-300 rounded w-20"></div>
            <div className="h-3 bg-gray-100 rounded w-24"></div>
          </div>
        ))}
      </div>

      {/* Events Table Skeleton */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-center border-b border-[#e2e5e9] pb-4">
          <div className="h-6 bg-gray-200 rounded w-40"></div>
          <div className="h-4 bg-gray-100 rounded w-20"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OrganizerDashboard() {
  const navigate = useNavigate();

  // Role guard check for UX
  const [roleNotice] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role && user.role !== 'eventOrganizer' && user.role !== 'admin') {
        return `Notice: You are currently signed in as "${user.role}". The Event Organizer Dashboard is designated for the eventOrganizer role.`;
      }
    } catch {
      // Backend remains authoritative
    }
    return '';
  });

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (isManual = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const response = await organizerService.getDashboard();
      if (response.data?.success && response.data?.data) {
        setDashboardData(response.data.data);
      } else {
        setError('Failed to load organizer dashboard data.');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('401 Unauthorized: Session expired. Please sign in again.');
      } else if (err.response?.status === 403) {
        setError('403 Forbidden: Event Organizer privileges required.');
      } else if (err.response?.status === 404) {
        setError('Organizer dashboard endpoint is not yet mounted on the server.');
      } else if (!err.response) {
        setError('Unable to connect to the server. Please check your network connection.');
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to load organizer dashboard. Please retry.';
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

  const summary = dashboardData?.summary || {
    totalEvents: 0,
    upcomingEvents: 0,
    publishedEvents: 0,
    draftEvents: 0,
    ticketsSold: 0,
    checkedIn: 0,
  };

  const events = Array.isArray(dashboardData?.events) ? dashboardData.events : [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Command Center Header */}
      <div className="bg-white border-2 border-[#714B67]/20 rounded-lg p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#714B67] text-white text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-white" aria-hidden="true" />
              EVENT ORGANIZER COMMAND CENTER
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#017E84]/10 text-[#017E84] text-xs font-semibold">
              <Building2 className="w-3 h-3" aria-hidden="true" />
              LDCE Student Association
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[#000000]">
            Event Operations Overview
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Manage your events, monitor attendance, capacity, and ticket activity.
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
            aria-label="Refresh dashboard data"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </Button>
        </div>
      </div>

      {/* Role notice if non-organizer */}
      {roleNotice && (
        <Alert variant="warning" title="Role Notice">
          {roleNotice}
        </Alert>
      )}

      {/* Error state */}
      {error && (
        <div className="space-y-3">
          <Alert variant="error" title="Organizer Dashboard Notice">
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
      {loading && !dashboardData && <OrganizerDashboardSkeleton />}

      {/* Loaded Dashboard Content */}
      {!loading && dashboardData && (
        <>
          {/* Summary KPIs: Exactly 6 Cards */}
          <section aria-label="Event Operations Summary">
            <h2 className="sr-only">Operations Summary Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* 1. Total Events */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm hover:border-[#714B67]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                      Total Events
                    </span>
                    <div className="p-1 rounded bg-[#714B67]/10 text-[#714B67]">
                      <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl lg:text-3xl font-extrabold text-gray-900 block">
                      {formatNumber(summary.totalEvents)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5 block">
                      All events
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Upcoming Events */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm hover:border-[#017E84]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                      Upcoming
                    </span>
                    <div className="p-1 rounded bg-[#017E84]/10 text-[#017E84]">
                      <CalendarCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl lg:text-3xl font-extrabold text-[#017E84] block">
                      {formatNumber(summary.upcomingEvents)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5 block">
                      Scheduled events
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Published Events */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm hover:border-[#017E84]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                      Published
                    </span>
                    <div className="p-1 rounded bg-[#017E84]/10 text-[#017E84]">
                      <Megaphone className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl lg:text-3xl font-extrabold text-[#017E84] block">
                      {formatNumber(summary.publishedEvents)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5 block">
                      Active public
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Draft Events */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm hover:border-[#E4A900]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                      Drafts
                    </span>
                    <div className="p-1 rounded bg-[#E4A900]/15 text-[#8a6500]">
                      <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl lg:text-3xl font-extrabold text-[#8a6500] block">
                      {formatNumber(summary.draftEvents)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5 block">
                      Unpublished
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Tickets Sold */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm hover:border-[#714B67]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                      Tickets Sold
                    </span>
                    <div className="p-1 rounded bg-[#714B67]/10 text-[#714B67]">
                      <Ticket className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl lg:text-3xl font-extrabold text-gray-900 block">
                      {formatNumber(summary.ticketsSold)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5 block">
                      Total attendees
                    </span>
                  </div>
                </div>
              </div>

              {/* 6. Checked In */}
              <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm hover:border-[#017E84]/40 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
                    <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                      Checked In
                    </span>
                    <div className="p-1 rounded bg-[#017E84]/10 text-[#017E84]">
                      <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl lg:text-3xl font-extrabold text-[#017E84] block">
                      {formatNumber(summary.checkedIn)}
                    </span>
                    <span className="text-xs text-gray-500 font-medium mt-0.5 block">
                      Verified entries
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Managed Events Section */}
          <section aria-labelledby="managed-events-title" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="managed-events-title" className="text-lg font-bold text-[#000000]">
                    Managed Events
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#714B67]/10 text-[#714B67]">
                    {events.length} {events.length === 1 ? 'event' : 'events'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Overview of all assigned events, capacities, and ticket activity.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/events"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#714B67] hover:text-[#5d3d54] hover:underline px-2 py-1"
                >
                  Browse Campus Schedule <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Empty State */}
            {events.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No events assigned yet."
                description="You currently have no events assigned to your organizer account."
                action={
                  <Link to="/events">
                    <Button variant="primary" size="sm">
                      Browse Campus Events
                    </Button>
                  </Link>
                }
              />
            ) : (
              <>
                {/* Desktop / Tablet Table View */}
                <div className="hidden sm:block bg-white border border-[#e2e5e9] rounded-lg overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-[#e2e5e9] text-xs font-bold text-gray-700 uppercase tracking-wider">
                          <th scope="col" className="py-3 px-4">Event</th>
                          <th scope="col" className="py-3 px-4">Date</th>
                          <th scope="col" className="py-3 px-4">Time</th>
                          <th scope="col" className="py-3 px-4">Location</th>
                          <th scope="col" className="py-3 px-4">Status</th>
                          <th scope="col" className="py-3 px-4 text-right">Capacity</th>
                          <th scope="col" className="py-3 px-4 text-right">Sold</th>
                          <th scope="col" className="py-3 px-4 text-right">Remaining</th>
                          <th scope="col" className="py-3 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e5e9]">
                        {events.map((evt) => (
                          <tr key={evt.id} className="hover:bg-gray-50/80 transition-colors">
                            {/* Event Title & ID */}
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-gray-900 block">
                                {evt.title}
                              </span>
                              <span className="text-[11px] text-gray-400 font-mono block mt-0.5">
                                ID: {evt.id}
                              </span>
                            </td>

                            {/* Date */}
                            <td className="py-3.5 px-4 text-gray-700 whitespace-nowrap">
                              {formatDateDisplay(evt.date)}
                            </td>

                            {/* Time */}
                            <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                                <span>{formatTimeDisplay(evt.startTime, evt.endTime)}</span>
                              </div>
                            </td>

                            {/* Location */}
                            <td className="py-3.5 px-4 text-gray-600">
                              <div className="flex items-center gap-1.5 max-w-xs truncate">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                                <span className="truncate" title={evt.location}>
                                  {evt.location || '—'}
                                </span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <Badge>{evt.status}</Badge>
                            </td>

                            {/* Capacity */}
                            <td className="py-3.5 px-4 text-right font-medium text-gray-700 whitespace-nowrap">
                              {formatNumber(evt.capacity)}
                            </td>

                            {/* Sold */}
                            <td className="py-3.5 px-4 text-right font-semibold text-[#714B67] whitespace-nowrap">
                              {formatNumber(evt.soldTickets)}
                            </td>

                            {/* Remaining */}
                            <td className="py-3.5 px-4 text-right font-medium text-gray-600 whitespace-nowrap">
                              {formatNumber(evt.remainingCapacity)}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <Link
                                to={`/organizer/events/${evt.id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#714B67] bg-[#714B67]/10 hover:bg-[#714B67]/20 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                                aria-label={`View operations for ${evt.title}`}
                              >
                                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>View</span>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards View */}
                <div className="sm:hidden space-y-3">
                  {events.map((evt) => (
                    <div
                      key={evt.id}
                      className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">{evt.title}</h3>
                          <span className="text-[10px] text-gray-400 font-mono block">
                            ID: {evt.id}
                          </span>
                        </div>
                        <Badge>{evt.status}</Badge>
                      </div>

                      <div className="space-y-1.5 text-xs text-gray-600 pt-1">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                          <span>{formatDateDisplay(evt.date)}</span>
                          <span className="text-gray-300">•</span>
                          <span>{formatTimeDisplay(evt.startTime, evt.endTime)}</span>
                        </div>

                        {evt.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden="true" />
                            <span className="truncate">{evt.location}</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-[#F8F9FA] rounded p-2 text-center text-xs">
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase">Capacity</span>
                          <span className="font-bold text-gray-800">{formatNumber(evt.capacity)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase">Sold</span>
                          <span className="font-bold text-[#714B67]">{formatNumber(evt.soldTickets)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase">Remaining</span>
                          <span className="font-bold text-gray-700">{formatNumber(evt.remainingCapacity)}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#e2e5e9] flex justify-end">
                        <Link
                          to={`/organizer/events/${evt.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#714B67] bg-[#714B67]/10 hover:bg-[#714B67]/20 rounded transition-colors"
                          aria-label={`View operations for ${evt.title}`}
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>View Operations</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Quick Operations Links */}
          <section aria-label="Quick Workflows" className="border-t border-[#e2e5e9] pt-6">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Organizer Quick Navigation
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                to="/events"
                className="bg-white border border-[#e2e5e9] hover:border-[#714B67]/50 rounded-lg p-3.5 shadow-sm transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#714B67]/10 text-[#714B67] group-hover:bg-[#714B67] group-hover:text-white transition-colors">
                    <Calendar className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900 block group-hover:text-[#714B67]">
                      Browse Events
                    </span>
                    <span className="text-xs text-gray-500 block">
                      Campus activity schedule
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#714B67] transition-colors" aria-hidden="true" />
              </Link>

              <Link
                to="/tickets"
                className="bg-white border border-[#e2e5e9] hover:border-[#017E84]/50 rounded-lg p-3.5 shadow-sm transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#017E84]/10 text-[#017E84] group-hover:bg-[#017E84] group-hover:text-white transition-colors">
                    <Ticket className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900 block group-hover:text-[#017E84]">
                      My Tickets
                    </span>
                    <span className="text-xs text-gray-500 block">
                      Registration passes
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#017E84] transition-colors" aria-hidden="true" />
              </Link>

              <Link
                to="/announcements"
                className="bg-white border border-[#e2e5e9] hover:border-[#E4A900]/50 rounded-lg p-3.5 shadow-sm transition-all group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#E4A900]/15 text-[#8a6500] group-hover:bg-[#E4A900] group-hover:text-black transition-colors">
                    <Megaphone className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900 block group-hover:text-gray-900">
                      Announcements
                    </span>
                    <span className="text-xs text-gray-500 block">
                      Organization bulletins
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900 transition-colors" aria-hidden="true" />
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
