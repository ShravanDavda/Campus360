import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { memberService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export default function OrderDetails() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchOrder() {
      setLoading(true);
      setError('');
      try {
        const response = await memberService.getOrderDetails(orderId);
        if (response.data?.success) {
          setOrder(response.data.data?.order || response.data.data);
        } else {
          setError('Order record not found.');
        }
      } catch (err) {
        if (!err.response) {
          setError('Unable to connect to the server.');
        } else if (err.response.status === 404) {
          setError('The requested order was not found or belongs to another user.');
        } else {
          setError(err.response.data?.error?.message || 'Failed to fetch order details.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return <LoadingSpinner message="Retrieving order invoice..." />;
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Alert variant="error">{error || 'Order not found.'}</Alert>
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#714B67] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Orders
        </Link>
      </div>
    );
  }

  const items = order.items || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/orders"
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#714B67] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Orders
      </Link>

      <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 sm:p-8 shadow-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-[#e2e5e9] gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge>{order.status || 'PLACED'}</Badge>
              {order.paymentStatus && <Badge variant="teal">{order.paymentStatus}</Badge>}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#000000]">
              Order #{order.orderId?.slice(0, 8)}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Placed on: {order.orderDate || 'Recent'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-400 font-mono">ORDER ID</span>
            <p className="text-xs font-mono font-semibold text-gray-700 select-all">
              {order.orderId}
            </p>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="space-y-4 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
            Order Items
          </h3>
          <div className="border border-[#e2e5e9] rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#F8F9FA] border-b border-[#e2e5e9] text-gray-600 uppercase text-[11px] font-semibold">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Variant / Size</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e5e9]">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-500">
                      No items in this order.
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        {item.productName || item.productId}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {item.variant || 'Standard'}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        ₹{item.unitPrice}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        ₹{item.subtotal || (item.unitPrice * item.quantity)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total Summary */}
        <div className="bg-[#F8F9FA] border border-[#e2e5e9] rounded-lg p-4 space-y-2 max-w-xs ml-auto text-xs sm:text-sm">
          {order.subtotal !== undefined && (
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span>₹{order.subtotal}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-[#e2e5e9]">
            <span>Total Amount:</span>
            <span className="text-[#714B67]">₹{order.totalAmount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
