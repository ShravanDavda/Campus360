import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Ticket,
  Package,
  Megaphone,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { memberService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';

export default function DashboardHome() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const response = await memberService.getDashboard();
        if (response.data?.success) {
          setData(response.data.data);
        } else {
          setError('Unable to load dashboard data.');
        }
      } catch (err) {
        if (!err.response) {
          setError('Unable to connect to the server. Please check your connection.');
        } else if (err.response.status === 401) {
          setError('Your session has expired. Please sign in again.');
        } else if (err.response.data?.error?.code === 'ACCOUNT_INACTIVE') {
          setError('Your account is currently inactive.');
        } else {
          setError(err.response.data?.error?.message || 'Failed to load dashboard information.');
        }
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [refreshKey]);

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="error">{error}</Alert>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="text-sm font-semibold text-[#714B67] hover:underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { member, membership, upcomingEvents = [], activeTickets = [], recentOrders = [], latestAnnouncements = [] } = data || {};

  return (
    <div className="space-y-6">
      {/* Welcome & Member Identity Banner */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#000000]">
            Welcome back, {member?.name || 'Member'}!
          </h1>
          <p className="text-sm text-[#555555] mt-0.5">{member?.email}</p>
        </div>

        {/* Membership Status Summary */}
        {membership && (
          <div className="flex items-center gap-3 bg-[#F8F9FA] border border-[#e2e5e9] px-4 py-2 rounded-lg">
            <UserCheck className="w-5 h-5 text-[#714B67]" aria-hidden="true" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Membership:</span>
                <Badge>{membership.status || 'PENDING'}</Badge>
              </div>
              {membership.expiryDate && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Valid until: {membership.expiryDate}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Grid: Upcoming Events & Active Tickets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9] mb-4">
            <h2 className="text-lg font-bold text-[#000000] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#714B67]" aria-hidden="true" />
              Upcoming Events
            </h2>
            <Link
              to="/events"
              className="text-xs font-semibold text-[#714B67] hover:text-[#5d3d54] inline-flex items-center gap-1 hover:underline"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1">
            {upcomingEvents.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No upcoming events"
                description="Check back later for new student organization events."
              />
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3.5 border border-[#e2e5e9] rounded-lg hover:border-[#714B67]/40 transition-colors flex justify-between items-center"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-[#000000]">{evt.title}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {evt.date} {evt.startTime && `• ${evt.startTime}`}
                      </p>
                      {evt.location && (
                        <p className="text-xs text-gray-500">{evt.location}</p>
                      )}
                    </div>
                    <Link
                      to={`/events/${evt.id}`}
                      className="text-xs font-semibold text-[#714B67] hover:underline shrink-0"
                    >
                      Details
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active Tickets */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9] mb-4">
            <h2 className="text-lg font-bold text-[#000000] flex items-center gap-2">
              <Ticket className="w-5 h-5 text-[#017E84]" aria-hidden="true" />
              Active Tickets
            </h2>
            <Link
              to="/tickets"
              className="text-xs font-semibold text-[#714B67] hover:text-[#5d3d54] inline-flex items-center gap-1 hover:underline"
            >
              My Tickets <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1">
            {activeTickets.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title="No active tickets"
                description="You don't have any tickets for upcoming events."
              />
            ) : (
              <div className="space-y-3">
                {activeTickets.map((tkt) => (
                  <div
                    key={tkt.ticketId}
                    className="p-3.5 border border-[#e2e5e9] rounded-lg hover:border-[#017E84]/40 transition-colors flex justify-between items-center"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-[#000000]">
                        {tkt.event?.name || 'Event Ticket'}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge>{tkt.status || 'ACTIVE'}</Badge>
                        <span className="text-xs text-gray-500">Qty: {tkt.quantity || 1}</span>
                      </div>
                    </div>
                    <Link
                      to={`/tickets/${tkt.ticketId}`}
                      className="text-xs font-semibold text-[#017E84] hover:underline shrink-0"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Recent Orders & Latest Announcements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9] mb-4">
            <h2 className="text-lg font-bold text-[#000000] flex items-center gap-2">
              <Package className="w-5 h-5 text-[#E4A900]" aria-hidden="true" />
              Recent Orders
            </h2>
            <Link
              to="/orders"
              className="text-xs font-semibold text-[#714B67] hover:text-[#5d3d54] inline-flex items-center gap-1 hover:underline"
            >
              All Orders <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1">
            {recentOrders.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No recent orders"
                description="Browse merchandise to purchase student association gear."
              />
            ) : (
              <div className="space-y-3">
                {recentOrders.map((ord) => (
                  <div
                    key={ord.orderId}
                    className="p-3.5 border border-[#e2e5e9] rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <p className="text-xs font-mono text-gray-500">Order #{ord.orderId?.slice(0, 8)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge>{ord.status || 'PLACED'}</Badge>
                        <span className="text-xs font-semibold text-gray-800">
                          ₹{ord.totalAmount}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/orders/${ord.orderId}`}
                      className="text-xs font-semibold text-[#714B67] hover:underline shrink-0"
                    >
                      Details
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Latest Announcements */}
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9] mb-4">
            <h2 className="text-lg font-bold text-[#000000] flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#714B67]" aria-hidden="true" />
              Latest Announcements
            </h2>
            <Link
              to="/announcements"
              className="text-xs font-semibold text-[#714B67] hover:text-[#5d3d54] inline-flex items-center gap-1 hover:underline"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1">
            {latestAnnouncements.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="No announcements"
                description="No organizational announcements posted at this time."
              />
            ) : (
              <div className="space-y-3">
                {latestAnnouncements.map((ann) => (
                  <div
                    key={ann.announcementId}
                    className="p-3.5 border border-[#e2e5e9] rounded-lg"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-sm font-semibold text-[#000000] line-clamp-1">
                        {ann.title}
                      </h4>
                      <Link
                        to={`/announcements/${ann.announcementId}`}
                        className="text-xs font-semibold text-[#714B67] hover:underline shrink-0"
                      >
                        Read
                      </Link>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ann.content}</p>
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      {ann.publishedDate} {ann.author?.name && `• By ${ann.author.name}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
