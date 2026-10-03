import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Ticket, ArrowLeft } from 'lucide-react';
import { memberService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Label } from '../components/ui/Label';
import { Input } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export default function EventDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [eventData, setEventData] = useState(null);
  const [selectedTicketType, setSelectedTicketType] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    async function fetchEventDetails() {
      setLoading(true);
      setFormError('');
      try {
        const response = await memberService.getEventDetails(eventId);
        if (response.data?.success) {
          const data = response.data.data;
          const event = data.event || data;
          const ticketTypes = data.ticketTypes || event.ticketTypes || [];
          setEventData({ ...event, ticketTypes });
          if (ticketTypes.length > 0) {
            setSelectedTicketType(ticketTypes[0].id);
          }
        } else {
          setFormError('Event not found or not published.');
        }
      } catch (err) {
        if (!err.response) {
          setFormError('Unable to connect to the server.');
        } else if (err.response.status === 404) {
          setFormError('The requested event was not found or is no longer available.');
        } else {
          setFormError(err.response.data?.error?.message || 'Failed to fetch event details.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchEventDetails();
  }, [eventId]);

  const handlePurchase = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError('');
    setSuccessMessage('');

    if (!selectedTicketType) {
      setFormError('Please select a ticket type.');
      return;
    }

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setFormError('Quantity must be an integer greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      // POST /api/member/tickets with exact body: { eventId, ticketTypeId, quantity }
      // NOTE: Client NEVER submits price, total, or discounts
      const payload = {
        eventId,
        ticketTypeId: selectedTicketType,
        quantity: parsedQty,
      };

      const response = await memberService.purchaseTicket(payload);
      if (response.status === 201 || response.data?.success) {
        setSuccessMessage('Ticket purchased successfully! Redirecting to your tickets…');
        setTimeout(() => {
          navigate('/tickets');
        }, 1500);
      } else {
        setFormError('Ticket purchase could not be completed.');
      }
    } catch (err) {
      if (!err.response) {
        setFormError('Unable to connect to the server.');
      } else {
        const errorData = err.response.data?.error;
        setFormError(errorData?.message || 'Failed to purchase ticket.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading event details..." />;
  }

  if (!eventData && formError) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Alert variant="error">{formError}</Alert>
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#714B67] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to all events
        </Link>
      </div>
    );
  }

  const ticketTypes = eventData?.ticketTypes || [];
  const selectedTypeObj = ticketTypes.find((t) => t.id === selectedTicketType);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/events"
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#714B67] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to events
      </Link>

      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 sm:p-8 shadow-sm">
        <div className="border-b border-[#e2e5e9] pb-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="teal">{eventData.status || 'PUBLISHED'}</Badge>
            {eventData.remainingCapacity !== undefined && (
              <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                {eventData.remainingCapacity} / {eventData.capacity || '—'} remaining
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#000000]">{eventData.title}</h1>
        </div>

        {formError && <Alert variant="error" className="mb-6">{formError}</Alert>}
        {successMessage && <Alert variant="success" className="mb-6">{successMessage}</Alert>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Event Information */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-2">
                About this event
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {eventData.description || 'No detailed description provided.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#e2e5e9]">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-[#714B67] mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase">Date & Time</h4>
                  <p className="text-sm font-medium text-gray-900">{eventData.date}</p>
                  {(eventData.startTime || eventData.endTime) && (
                    <p className="text-xs text-gray-500">
                      {eventData.startTime} {eventData.endTime && `– ${eventData.endTime}`}
                    </p>
                  )}
                </div>
              </div>

              {eventData.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#714B67] mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase">Location</h4>
                    <p className="text-sm font-medium text-gray-900">{eventData.location}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Purchase Card */}
          <div className="bg-[#F8F9FA] border border-[#e2e5e9] rounded-lg p-5 flex flex-col justify-between">
            <h3 className="text-sm font-bold text-[#000000] flex items-center gap-2 mb-4">
              <Ticket className="w-4 h-4 text-[#017E84]" />
              Purchase Tickets
            </h3>

            {ticketTypes.length === 0 ? (
              <p className="text-xs text-gray-500 my-auto text-center py-6">
                No tickets available for this event at this time.
              </p>
            ) : (
              <form onSubmit={handlePurchase} className="space-y-4">
                <div>
                  <Label htmlFor="ticketType">Select Ticket Type</Label>
                  <select
                    id="ticketType"
                    value={selectedTicketType}
                    onChange={(e) => setSelectedTicketType(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full h-10 px-3 rounded border border-gray-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  >
                    {ticketTypes.map((tt) => (
                      <option key={tt.id} value={tt.id}>
                        {tt.name} — ₹{tt.memberPrice}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={selectedTypeObj?.availableQuantity || 10}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                  {selectedTypeObj?.availableQuantity !== undefined && (
                    <p className="text-[11px] text-gray-500 mt-1">
                      Available: {selectedTypeObj.availableQuantity}
                    </p>
                  )}
                </div>

                {selectedTypeObj && (
                  <div className="p-3 bg-white border border-[#e2e5e9] rounded text-xs space-y-1">
                    <div className="flex justify-between text-gray-600">
                      <span>Price per ticket:</span>
                      <span className="font-semibold text-gray-900">₹{selectedTypeObj.memberPrice}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Est. Total (display only):</span>
                      <span className="font-bold text-[#017E84]">
                        ₹{(selectedTypeObj.memberPrice || 0) * (parseInt(quantity, 10) || 1)}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={isSubmitting || (selectedTypeObj?.availableQuantity === 0)}
                  className="w-full h-10 font-semibold"
                >
                  {isSubmitting ? 'Purchasing...' : 'Confirm Purchase'}
                </Button>
                <p className="text-[10px] text-gray-400 text-center">
                  Final price & capacity verified by server transaction.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
