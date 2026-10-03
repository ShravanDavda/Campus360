import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowRight } from 'lucide-react';
import { memberService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError('');
      try {
        const response = await memberService.getMyOrders();
        if (response.data?.success) {
          const items = response.data.data?.orders || response.data.data || [];
          setOrders(Array.isArray(items) ? items : []);
        } else {
          setError('Unable to load your orders.');
        }
      } catch (err) {
        if (!err.response) {
          setError('Unable to connect to the server.');
        } else {
          setError(err.response.data?.error?.message || 'Failed to fetch order history.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading your orders..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#000000]">My Orders</h1>
        <p className="text-sm text-[#555555] mt-1">
          Review your merchandise purchases and fulfillment statuses.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders yet"
          description="You haven't placed any merchandise orders."
          action={
            <Link
              to="/merchandise"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-[#714B67] text-white hover:bg-[#5d3d54]"
            >
              Browse Merchandise <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => (
            <div
              key={ord.orderId}
              className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm hover:border-[#714B67]/40 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-gray-800">
                    Order #{ord.orderId?.slice(0, 8)}
                  </span>
                  <Badge>{ord.status || 'PLACED'}</Badge>
                  {ord.paymentStatus && <Badge variant="teal">{ord.paymentStatus}</Badge>}
                </div>

                <p className="text-xs text-gray-500">
                  Date: {ord.orderDate || 'Recent'} • Total Amount: <strong className="text-gray-900 font-semibold">₹{ord.totalAmount}</strong>
                </p>

                {ord.items && ord.items.length > 0 && (
                  <div className="text-xs text-gray-600">
                    <span>Items: </span>
                    <span className="font-medium">
                      {ord.items.map((i) => `${i.productName || 'Item'} (${i.quantity || 1})`).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              <div className="w-full sm:w-auto shrink-0 flex justify-end">
                <Link
                  to={`/orders/${ord.orderId}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded text-xs font-semibold border border-[#e2e5e9] bg-white text-gray-700 hover:bg-gray-50 hover:text-[#714B67] transition-colors"
                >
                  Order Details <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
