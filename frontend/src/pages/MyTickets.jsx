import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Calendar, MapPin, ArrowRight } from 'lucide-react';
import { memberService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchTickets() {
      setLoading(true);
      setError('');
      try {
        const response = await memberService.getMyTickets();
        if (response.data?.success) {
          const items = response.data.data?.tickets || response.data.data || [];
          setTickets(Array.isArray(items) ? items : []);
        } else {
          setError('Unable to load your tickets.');
        }
      } catch (err) {
        if (!err.response) {
          setError('Unable to connect to the server.');
        } else {
          setError(err.response.data?.error?.message || 'Failed to fetch tickets.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchTickets();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading your tickets..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#000000]">My Tickets</h1>
        <p className="text-sm text-[#555555] mt-1">
          View your confirmed event registrations and entry passes.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {tickets.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No active tickets"
          description="You haven't purchased tickets for any upcoming events."
          action={
            <Link
              to="/events"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-[#714B67] text-white hover:bg-[#5d3d54]"
            >
              Browse Events <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {tickets.map((tkt) => (
            <div
              key={tkt.ticketId}
              className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm hover:border-[#017E84]/40 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-[#000000]">
                    {tkt.event?.name || 'Event Registration'}
                  </h3>
                  <Badge>{tkt.status || 'ACTIVE'}</Badge>
                  {tkt.checkInStatus && (
                    <Badge variant={tkt.checkInStatus === 'CHECKED_IN' ? 'teal' : 'gray'}>
                      {tkt.checkInStatus === 'CHECKED_IN' ? 'Checked In' : 'Not Checked In'}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-500">
                  <span className="font-mono text-gray-400">Pass #{tkt.ticketId?.slice(0, 8)}</span>
                  <span>Type: <strong className="text-gray-700">{tkt.ticketType?.name || tkt.ticketType || 'Standard'}</strong></span>
                  <span>Qty: <strong className="text-gray-700">{tkt.quantity || 1}</strong></span>
                  <span>Paid: <strong className="text-[#017E84]">₹{tkt.pricePaid}</strong></span>
                </div>

                {tkt.event && (
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-gray-500 pt-1">
                    {tkt.event.date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#714B67]" />
                        {tkt.event.date} {tkt.event.startTime && `• ${tkt.event.startTime}`}
                      </span>
                    )}
                    {tkt.event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#714B67]" />
                        {tkt.event.location}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="w-full sm:w-auto shrink-0 flex items-center justify-end">
                <Link
                  to={`/tickets/${tkt.ticketId}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded text-xs font-semibold border border-[#e2e5e9] bg-white text-gray-700 hover:bg-gray-50 hover:text-[#714B67] transition-colors"
                >
                  View Details <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
