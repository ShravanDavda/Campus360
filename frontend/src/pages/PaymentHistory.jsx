import React, { useState, useEffect } from 'react';
import { Receipt } from 'lucide-react';
import { memberService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';

export default function PaymentHistory() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchPayments() {
      setLoading(true);
      setError('');
      try {
        const response = await memberService.getPayments();
        if (response.data?.success) {
          const items = response.data.data?.payments || response.data.data || [];
          setPayments(Array.isArray(items) ? items : []);
        } else {
          setError('Unable to load payment records.');
        }
      } catch (err) {
        if (!err.response) {
          setError('Unable to connect to the server.');
        } else {
          setError(err.response.data?.error?.message || 'Failed to fetch payment history.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, []);

  const formatPaymentType = (type) => {
    switch (type) {
      case 'MEMBERSHIP_DUES':
        return 'Membership Dues';
      case 'EVENT_TICKET':
        return 'Event Ticket';
      case 'MERCHANDISE_ORDER':
        return 'Merchandise Order';
      default:
        return type || 'Payment';
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading financial transactions..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#000000]">Payment History</h1>
        <p className="text-sm text-[#555555] mt-1">
          Read-only statement of your membership dues, ticket purchases, and merchandise payments.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {payments.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No payment records found"
          description="You do not have any recorded dues, ticket, or merchandise transactions."
        />
      ) : (
        <div className="bg-white border border-[#e2e5e9] rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#F8F9FA] border-b border-[#e2e5e9] text-gray-600 uppercase text-[11px] font-semibold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Transaction ID</th>
                  <th className="py-3.5 px-4 sm:px-6">Type</th>
                  <th className="py-3.5 px-4 sm:px-6">Reference ID</th>
                  <th className="py-3.5 px-4 sm:px-6">Date</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Amount</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e5e9]">
                {payments.map((p) => (
                  <tr key={p.paymentId} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-mono text-xs text-gray-700 select-all font-semibold">
                      {p.paymentId?.slice(0, 10)}...
                    </td>
                    <td className="py-3.5 px-4 sm:px-6">
                      <span className="font-semibold text-gray-900 block">
                        {formatPaymentType(p.paymentType)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 font-mono text-xs text-gray-500">
                      {p.referenceId ? `${p.referenceId.slice(0, 8)}...` : '—'}
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-gray-600">
                      {p.date || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-right font-bold text-[#017E84]">
                      ₹{p.amount}
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-center">
                      <Badge variant={p.status === 'PAID' || p.status === 'COMPLETED' ? 'teal' : 'gold'}>
                        {p.status || 'PAID'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-[#F8F9FA] border-t border-[#e2e5e9] p-4 text-[11px] text-gray-500">
            Payment records are finalized and verified by the treasury office. All figures reflect official accounting ledgers.
          </div>
        </div>
      )}
    </div>
  );
}
