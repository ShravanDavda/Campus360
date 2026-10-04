import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Ticket, ArrowRight, Search, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { memberService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';

export default function EventsList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search and Filter State
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  const fetchEvents = useCallback(async (p = 1, search = '', status = 'all', dFrom = '', dTo = '') => {
    setLoading(true);
    setError('');
    try {
      const params = { page: p, limit: 12 };
      if (search && search.trim()) params.search = search.trim();
      if (status && status !== 'all') params.status = status;
      if (dFrom) params.dateFrom = dFrom;
      if (dTo) params.dateTo = dTo;

      const response = await memberService.getEvents(params);
      if (response.data?.success) {
        const items = response.data.data?.events || [];
        setEvents(Array.isArray(items) ? items : []);
        if (response.data.data?.pagination) {
          setPagination(response.data.data.pagination);
        }
      } else {
        setError('Unable to load events.');
      }
    } catch (err) {
      if (!err.response) {
        setError('Unable to connect to the server.');
      } else {
        setError(err.response.data?.error?.message || 'Failed to fetch events.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(1, '', 'all', '', '');
  }, [fetchEvents]);

  const handleApplySearch = () => {
    setAppliedSearch(searchInput);
    setPage(1);
    fetchEvents(1, searchInput, statusFilter, dateFrom, dateTo);
  };

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setPage(1);
    fetchEvents(1, appliedSearch, val, dateFrom, dateTo);
  };

  const handleDateFromChange = (val) => {
    setDateFrom(val);
    setPage(1);
    fetchEvents(1, appliedSearch, statusFilter, val, dateTo);
  };

  const handleDateToChange = (val) => {
    setDateTo(val);
    setPage(1);
    fetchEvents(1, appliedSearch, statusFilter, dateFrom, val);
  };

  const handleClear = () => {
    setSearchInput('');
    setAppliedSearch('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    fetchEvents(1, '', 'all', '', '');
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchEvents(newPage, appliedSearch, statusFilter, dateFrom, dateTo);
  };

  const hasActiveFilters = Boolean(appliedSearch || statusFilter !== 'all' || dateFrom || dateTo || searchInput);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#000000]">Upcoming Events</h1>
          <p className="text-sm text-[#555555] mt-1">
            Browse and register for upcoming organization programs and activities.
          </p>
        </div>
      </div>

      {/* Server-Backed Search & Filters */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleApplySearch();
          }}
          className="flex flex-col md:flex-row items-stretch md:items-center gap-3"
        >
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <Input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search event title or location..."
              className="pl-9 text-xs h-9"
              aria-label="Search event title or location"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-xs font-medium border border-[#e2e5e9] rounded px-3 py-2 bg-white text-gray-800 hover:border-[#714B67] focus:outline-none focus:ring-1 focus:ring-[#714B67] h-9"
              aria-label="Filter events by status"
            >
              <option value="all">All Statuses</option>
              <option value="PUBLISHED">Published</option>
            </select>

            {/* Date From */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-[#e2e5e9] rounded px-2.5 h-9">
              <span className="text-[11px] font-semibold text-gray-500 uppercase">From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
                className="bg-transparent text-xs text-gray-800 focus:outline-none"
                aria-label="Filter events from date"
              />
            </div>

            {/* Date To */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-[#e2e5e9] rounded px-2.5 h-9">
              <span className="text-[11px] font-semibold text-gray-500 uppercase">To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
                className="bg-transparent text-xs text-gray-800 focus:outline-none"
                aria-label="Filter events to date"
              />
            </div>

            {/* Explicit Search Button */}
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="gap-1.5 shrink-0 bg-[#714B67] hover:bg-[#5d3d54] text-white h-9 px-4"
            >
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Search</span>
            </Button>

            {/* Clear Button */}
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="gap-1 shrink-0 text-gray-600 hover:text-gray-900 border-[#e2e5e9] h-9"
                title="Clear search and filters"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Clear</span>
              </Button>
            )}
          </div>
        </form>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-12 flex items-center justify-center gap-2 text-xs text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin text-[#714B67]" aria-hidden="true" />
          <span>Loading events schedule...</span>
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={hasActiveFilters ? "No events found." : "No upcoming events"}
          description={
            hasActiveFilters
              ? "No events match your current search and filter criteria. Try adjusting your query."
              : "There are currently no published events open for registration."
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm hover:border-[#714B67]/40 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="teal">{evt.status || 'PUBLISHED'}</Badge>
                    {evt.remainingCapacity !== undefined && (
                      <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        {evt.remainingCapacity} seats left
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-[#000000] mb-2 line-clamp-1">
                    {evt.title}
                  </h3>
                  <p className="text-xs text-[#666666] line-clamp-2 mb-4">
                    {evt.description || 'No description provided.'}
                  </p>

                  <div className="space-y-1.5 text-xs text-gray-500 border-t border-[#e2e5e9] pt-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#714B67]" />
                      <span>
                        {evt.date} {evt.startTime && `• ${evt.startTime}`}
                      </span>
                    </div>
                    {evt.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#714B67]" />
                        <span className="truncate">{evt.location}</span>
                      </div>
                    )}
                  </div>

                  {/* Ticket Types Summary */}
                  {evt.ticketTypes && evt.ticketTypes.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-dashed border-[#e2e5e9] flex items-center justify-between text-xs">
                      <span className="text-gray-500 flex items-center gap-1">
                        <Ticket className="w-3.5 h-3.5 text-[#017E84]" />
                        Tickets:
                      </span>
                      <span className="font-semibold text-gray-800">
                        <span className="text-[#017E84]">₹{Math.min(...evt.ticketTypes.map((t) => t.memberPrice || 0))}</span>
                        <span className="text-gray-400 font-normal"> (Member)</span>
                        <span className="text-gray-400"> / </span>
                        <span>₹{Math.min(...evt.ticketTypes.map((t) => t.nonMemberPrice ?? t.memberPrice ?? 0))}</span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3">
                  <Link
                    to={`/events/${evt.id}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded text-xs font-semibold bg-[#714B67] text-white hover:bg-[#5d3d54] transition-colors"
                  >
                    View Details & Tickets <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Server-Side Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#e2e5e9] pt-6 px-1">
              <span className="text-xs text-gray-500">
                Showing page <span className="font-semibold text-gray-800">{pagination.page}</span> of{' '}
                <span className="font-semibold text-gray-800">{pagination.totalPages}</span> ({pagination.total} total events)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="text-xs gap-1 border-[#e2e5e9] text-gray-700"
                  aria-label="Previous page of events"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="text-xs gap-1 border-[#e2e5e9] text-gray-700"
                  aria-label="Next page of events"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
