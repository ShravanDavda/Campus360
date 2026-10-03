import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Tag,
  Hash,
  FileText,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { adminService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const formatCurrency = (val) => {
  if (val === null || val === undefined || isNaN(Number(val))) return '—';
  const num = Number(val);
  return `₹${num.toLocaleString('en-IN')}`;
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

const formatTypeLabel = (type) => {
  if (!type) return '—';
  return type
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

export default function AdminFinanceTransactionDetails() {
  const { transactionId } = useParams();
  const navigate = useNavigate();

  // Authentication check
  const [authError] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role && user.role !== 'admin') {
        return '403 Forbidden: Administrator privileges required to access Admin Finance.';
      }
    } catch {
      // rely on backend auth
    }
    return '';
  });

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  const fetchTransactionDetail = useCallback(async () => {
    if (!transactionId) return;
    setLoading(true);
    setError('');
    setNotFound(false);

    try {
      const res = await adminService.getAdminFinanceTransaction(transactionId);
      const txn = res.data?.data?.transaction || res.data?.data || null;
      if (!txn) {
        setNotFound(true);
      } else {
        setTransaction(txn);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else if (err.response?.status === 403) {
        setError('403 Forbidden: Administrator privileges required.');
      } else if (err.response?.status === 401) {
        setError('401 Unauthorized: Session expired. Please sign in again.');
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to load transaction details. Please retry.';
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    fetchTransactionDetail();
  }, [fetchTransactionDetail]);

  if (authError) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-red-900">Access Restricted</h2>
            <p className="text-sm text-red-700">{authError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/finance')}
              className="mt-2"
            >
              Return to Finance
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-28"></div>
        </div>
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-6 space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
          <div className="h-40 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
            <Hash className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Transaction Not Found</h2>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            No transaction record was found matching ID: <span className="font-mono text-gray-800">{transactionId}</span>. The record may not exist or has been archived.
          </p>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/finance')}
              className="inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Finance Command Center
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-red-900">Error Loading Transaction</h2>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTransactionDetail}
            className="flex items-center gap-1"
          >
            <RotateCcw className="h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const direction = String(transaction?.direction || '').toUpperCase();
  const isIncome = direction === 'INCOME';
  const isExpense = direction === 'EXPENSE';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          to="/admin/finance"
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5 text-gray-500" />
          Back to Finance Command Center
        </Link>
      </div>

      {/* Main Card */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg shadow-sm overflow-hidden">
        {/* Header Banner */}
        <div className="p-6 border-b border-[#e2e5e9] bg-[#F8F9FA] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Transaction Record
              </span>
              <Badge variant={isIncome ? 'teal' : isExpense ? 'danger' : 'gray'}>
                {transaction.direction || '—'}
              </Badge>
              <Badge>{transaction.status || '—'}</Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-mono text-gray-900 mt-1">
              {transaction.id || transaction._id || transactionId}
            </h1>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block">
              Recorded Amount
            </span>
            <span
              className={`text-2xl sm:text-3xl font-extrabold ${
                isIncome
                  ? 'text-[#017E84]'
                  : isExpense
                  ? 'text-red-600'
                  : 'text-gray-900'
              }`}
            >
              {isIncome ? '+' : isExpense ? '-' : ''}
              {formatCurrency(transaction.amount)}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-8">
          {/* Primary Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {/* Type */}
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-[#714B67]" />
                Transaction Type
              </span>
              <p className="text-base font-semibold text-gray-900">
                {formatTypeLabel(transaction.type)}
              </p>
              <p className="text-xs text-gray-500 font-mono">
                API: {transaction.type || '—'}
              </p>
            </div>

            {/* Reference ID */}
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-[#714B67]" />
                Reference ID
              </span>
              <p className="text-base font-mono font-medium text-gray-900">
                {transaction.referenceId || '—'}
              </p>
              <p className="text-xs text-gray-500">
                External / gateway reference
              </p>
            </div>

            {/* Transaction Date */}
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#714B67]" />
                Effective Date
              </span>
              <p className="text-base font-medium text-gray-900">
                {formatDateTime(transaction.date || transaction.createdAt)}
              </p>
              <p className="text-xs text-gray-500">
                Posting / execution timestamp
              </p>
            </div>
          </div>

          {/* Traceability & Source Information */}
          <div className="border-t border-[#e2e5e9] pt-6 space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Financial Traceability & Source Context
            </h2>

            {transaction.source ? (
              <div className="bg-gray-50 border border-[#e2e5e9] rounded-lg p-5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  {transaction.source.type && (
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block">
                        Source Category
                      </span>
                      <span className="font-semibold text-gray-900">
                        {formatTypeLabel(transaction.source.type)}
                      </span>
                    </div>
                  )}

                  {transaction.source.id && (
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block">
                        Source Identifier
                      </span>
                      <span className="font-mono text-gray-800">
                        #{transaction.source.id}
                      </span>
                    </div>
                  )}

                  {transaction.source.name && (
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 block">
                        Source Title / Target
                      </span>
                      <span className="font-medium text-gray-900">
                        {transaction.source.name}
                      </span>
                    </div>
                  )}
                </div>

                {transaction.source.description && (
                  <div className="pt-2 border-t border-gray-200 text-xs text-gray-600">
                    <span className="font-medium text-gray-700">Description: </span>
                    {transaction.source.description}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-[#e2e5e9] rounded-lg p-4 text-sm text-gray-500">
                No nested source entity metadata was returned for this transaction record.
              </div>
            )}
          </div>

          {/* Audit Timestamps */}
          <div className="border-t border-[#e2e5e9] pt-6">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">
              Audit & Ledger Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>Created At: <strong className="text-gray-800">{formatDateTime(transaction.createdAt)}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>Last Updated: <strong className="text-gray-800">{formatDateTime(transaction.updatedAt)}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F8F9FA] border-t border-[#e2e5e9] flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/finance')}
            className="flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to List
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchTransactionDetail}
            className="flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Refresh Record
          </Button>
        </div>
      </div>
    </div>
  );
}
