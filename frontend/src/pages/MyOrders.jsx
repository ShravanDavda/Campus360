import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowRight, Search, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { memberService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search and Filter State
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const fetchOrders = useCallback(async (p = 1, search = '', status = 'all', payStatus = 'all') => {
    setLoading(true);
    setError('');
    try {
      const params = { page: p, limit: 10 };
      if (search && search.trim()) params.search = search.trim();
      if (status && status !== 'all') params.status = status;
      if (payStatus && payStatus !== 'all') params.paymentStatus = payStatus;

      const response = await memberService.getMyOrders(params);
      if (response.data?.success) {
        const items = response.data.data?.orders || [];
        setOrders(Array.isArray(items) ? items : []);
        if (response.data.data?.pagination) {
          setPagination(response.data.data.pagination);
        }
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
  }, []);

  useEffect(() => {
    fetchOrders(1, '', 'all', 'all');
  }, [fetchOrders]);

  const handleApplySearch = () => {
    setAppliedSearch(searchInput);
    setPage(1);
    fetchOrders(1, searchInput, statusFilter, paymentStatusFilter);
  };

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setPage(1);
    fetchOrders(1, appliedSearch, val, paymentStatusFilter);
  };

  const handlePaymentStatusChange = (val) => {
    setPaymentStatusFilter(val);
    setPage(1);
    fetchOrders(1, appliedSearch, statusFilter, val);
  };

  const handleClear = () => {
    setSearchInput('');
    setAppliedSearch('');
    setStatusFilter('all');
    setPaymentStatusFilter('all');
    setPage(1);
    fetchOrders(1, '', 'all', 'all');
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchOrders(newPage, appliedSearch, statusFilter, paymentStatusFilter);
  };

  const hasActiveFilters = Boolean(
    appliedSearch || statusFilter !== 'all' || paymentStatusFilter !== 'all' || searchInput
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#000000]">My Orders</h1>
        <p className="text-sm text-[#555555] mt-1">
          Review your merchandise purchases and fulfillment statuses.
        </p>
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
              placeholder="Search order ID or product..."
              className="pl-9 text-xs h-9"
              aria-label="Search order ID or product"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Order Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-xs font-medium border border-[#e2e5e9] rounded px-3 py-2 bg-white text-gray-800 hover:border-[#714B67] focus:outline-none focus:ring-1 focus:ring-[#714B67] h-9"
              aria-label="Filter orders by status"
            >
              <option value="all">All Order Statuses</option>
              <option value="PLACED">Placed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REFUNDED">Refunded</option>
            </select>

            {/* Payment Status Filter */}
            <select
              value={paymentStatusFilter}
              onChange={(e) => handlePaymentStatusChange(e.target.value)}
              className="text-xs font-medium border border-[#e2e5e9] rounded px-3 py-2 bg-white text-gray-800 hover:border-[#714B67] focus:outline-none focus:ring-1 focus:ring-[#714B67] h-9"
              aria-label="Filter orders by payment status"
            >
              <option value="all">All Payment Statuses</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>

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
          <span>Loading your orders...</span>
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title={hasActiveFilters ? "No orders found." : "No orders yet"}
          description={
            hasActiveFilters
              ? "No orders match your search and filter criteria. Try adjusting your query."
              : "You haven't placed any merchandise orders."
          }
          action={
            !hasActiveFilters ? (
              <Link
                to="/merchandise"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-[#714B67] text-white hover:bg-[#5d3d54]"
              >
                Browse Merchandise <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : null
          }
        />
      ) : (
        <>
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

          {/* Server-Side Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#e2e5e9] pt-6 px-1">
              <span className="text-xs text-gray-500">
                Showing page <span className="font-semibold text-gray-800">{pagination.page}</span> of{' '}
                <span className="font-semibold text-gray-800">{pagination.totalPages}</span> ({pagination.total} total orders)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="text-xs gap-1 border-[#e2e5e9] text-gray-700"
                  aria-label="Previous page of orders"
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
                  aria-label="Next page of orders"
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
