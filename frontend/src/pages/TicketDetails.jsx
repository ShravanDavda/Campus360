import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, ArrowLeft, ShieldCheck } from 'lucide-react';
import { memberService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export default function TicketDetails() {
  const { ticketId } = useParams();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchTicket() {
      setLoading(true);
      setError('');
      try {
        const response = await memberService.getTicketDetails(ticketId);
        if (response.data?.success) {
          setTicket(response.data.data?.ticket || response.data.data);
        } else {
          setError('Ticket record not found.');
        }
      } catch (err) {
        if (!err.response) {
          setError('Unable to connect to the server.');
        } else if (err.response.status === 404) {
          setError('The requested ticket pass was not found or belongs to another user.');
        } else {
          setError(err.response.data?.error?.message || 'Failed to fetch ticket details.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchTicket();
  }, [ticketId]);

  if (loading) {
    return <LoadingSpinner message="Retrieving ticket pass..." />;
  }

  if (error || !ticket) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Alert variant="error">{error || 'Ticket not found.'}</Alert>
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#714B67] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/tickets"
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#714B67] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Tickets
      </Link>

      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 sm:p-8 shadow-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-[#e2e5e9] gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="teal">{ticket.status || 'ACTIVE'}</Badge>
              {ticket.checkInStatus && (
                <Badge variant={ticket.checkInStatus === 'CHECKED_IN' ? 'teal' : 'gray'}>
                  {ticket.checkInStatus === 'CHECKED_IN' ? 'Checked In' : 'Not Checked In'}
                </Badge>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#000000]">
              {ticket.event?.name || 'Event Ticket Pass'}
            </h1>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-400 font-mono">TICKET ID</span>
            <p className="text-xs font-mono font-semibold text-gray-700 select-all">
              {ticket.ticketId}
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-[#F8F9FA] border border-[#e2e5e9] rounded-lg">
            <span className="text-xs font-semibold text-gray-500 uppercase">Event Schedule</span>
            <p className="text-sm font-medium text-gray-900 mt-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#714B67]" />
              {ticket.event?.date || 'Date TBA'} {ticket.event?.startTime && `• ${ticket.event.startTime}`}
            </p>
          </div>

          <div className="p-4 bg-[#F8F9FA] border border-[#e2e5e9] rounded-lg">
            <span className="text-xs font-semibold text-gray-500 uppercase">Venue Location</span>
            <p className="text-sm font-medium text-gray-900 mt-1 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#714B67]" />
              {ticket.event?.location || 'Campus Center'}
            </p>
          </div>

          <div className="p-4 border border-[#e2e5e9] rounded-lg">
            <span className="text-xs font-semibold text-gray-500 uppercase">Ticket Type & Quantity</span>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {ticket.ticketType?.name || ticket.ticketType || 'Standard'} ({ticket.quantity || 1} pass)
            </p>
          </div>

          <div className="p-4 border border-[#e2e5e9] rounded-lg">
            <span className="text-xs font-semibold text-gray-500 uppercase">Amount Paid</span>
            <p className="text-base font-bold text-[#017E84] mt-1">
              ₹{ticket.pricePaid !== undefined ? ticket.pricePaid : '0'}
            </p>
          </div>
        </div>

        {/* Check-In Notice (Read-only) */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 space-y-1">
          <p className="font-semibold text-gray-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#714B67]" /> Entry & Attendance Verification
          </p>
          <p>
            Please present this ticket ID or your registration pass to authorized event organizers at the
            venue desk upon arrival. Member check-in is verified and recorded exclusively by official staff.
          </p>
          <p className="text-[11px] text-gray-400 pt-1">
            Purchased on: {ticket.purchaseDate || 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
}
