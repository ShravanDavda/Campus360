import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Ticket, ArrowRight } from 'lucide-react';
import { memberService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';

export default function EventsList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      setError('');
      try {
        const response = await memberService.getEvents();
        if (response.data?.success) {
          // Only display PUBLISHED / member-visible events
          const items = response.data.data?.events || response.data.data || [];
          setEvents(Array.isArray(items) ? items : []);
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
    }
    fetchEvents();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading events schedule..." />;
  }

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

      {error && <Alert variant="error">{error}</Alert>}

      {events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No upcoming events"
          description="There are currently no published events open for registration."
        />
      ) : (
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
                  <div className="mt-3 pt-2 border-t border-dashed border-[#e2e5e9] flex items-center justify-between">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Ticket className="w-3.5 h-3.5 text-[#017E84]" />
                      From:
                    </span>
                    <span className="text-xs font-bold text-[#017E84]">
                      ₹{Math.min(...evt.ticketTypes.map((t) => t.memberPrice || 0))}
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
      )}
    </div>
  );
}
