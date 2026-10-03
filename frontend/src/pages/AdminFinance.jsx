import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Hash,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Calendar,
  Filter,
} from 'lucide-react';
import { adminService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'MEMBERSHIP_DUES', label: 'Membership Dues' },
  { value: 'EVENT_TICKET', label: 'Event Ticket' },
  { value: 'MERCHANDISE_ORDER', label: 'Merchandise Order' },
  { value: 'FUNDRAISER', label: 'Fundraiser' },
  { value: 'EXPENSE', label: 'Expense' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REFUNDED', label: 'Refunded' },
];

const DIRECTION_OPTIONS = [
  { value: 'all', label: 'All Directions' },
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
];

const formatCurrency = (val) => {
  if (val === null || val === undefined || isNaN(Number(val))) return '—';
  const num = Number(val);
  return `₹${num.toLocaleString('en-IN')}`;
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).split('T')[0];
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatTypeLabel = (type) => {
  if (!type) return '—';
  const found = TYPE_OPTIONS.find((t) => t.value === type);
  if (found) return found.label;
  return type
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

export default function AdminFinance() {
  const navigate = useNavigate();

  // Authentication check
  const [authError] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role && user.role !== 'admin') {
        return '403 Forbidden: Administrator privileges required to access Admin Finance Management.';
      }
    } catch {
      // rely on backend auth
    }
    return '';
  });

  // Summary State
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  // Transactions list & pagination state
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 1,
  });
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState('');
  const [contractNotice, setContractNotice] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Search state — DEBOUNCED LIVE SEARCH ONLY (~350ms)
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filters state
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateError, setDateError] = useState('');

  // Sorting state (server-side)
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Request sequencing to prevent stale search responses from overwriting newer results
  const activeRequestIdRef = useRef(0);

  // 1. Fetch Financial Summary
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const res = await adminService.getAdminFinanceSummary();
      const s = res.data?.data?.summary || res.data?.data || {};
      setSummary({
        totalIncome: s.totalIncome !== undefined ? s.totalIncome : 0,
        totalExpenses: s.totalExpenses !== undefined ? s.totalExpenses : 0,
        netBalance: s.netBalance !== undefined ? s.netBalance : 0,
        pendingAmount: s.pendingAmount !== undefined ? s.pendingAmount : null,
        transactionCount: s.transactionCount !== undefined ? s.transactionCount : null,
      });
    } catch (err) {
      if (err.response?.status === 403) {
        setSummaryError('403 Forbidden: Administrator privileges required.');
      } else if (err.response?.status === 401) {
        setSummaryError('401 Unauthorized: Session expired. Please sign in again.');
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to load financial summary. Please retry.';
        setSummaryError(msg);
      }
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // 2. Debounce live search (~350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // 3. Date validation
  useEffect(() => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setDateError('"Date From" cannot be later than "Date To".');
    } else {
      setDateError('');
    }
  }, [dateFrom, dateTo]);

  // 4. Fetch Transactions (Authoritative Server-side call)
  const fetchTransactions = useCallback(
    async (pageToLoad = currentPage) => {
      // Validate date before requesting
      if (dateFrom && dateTo && dateFrom > dateTo) {
        setDateError('"Date From" cannot be later than "Date To".');
        return;
      }

      const requestId = ++activeRequestIdRef.current;
      setTransactionsLoading(true);
      setTransactionsError('');
      setContractNotice('');

      try {
        const params = {
          page: pageToLoad,
          limit: 20,
          search: debouncedSearch || undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          direction: directionFilter !== 'all' ? directionFilter : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          sortBy,
          sortOrder,
        };

        const res = await adminService.getAdminFinanceTransactions(params);

        // Prevent stale responses from overwriting newer queries
        if (requestId !== activeRequestIdRef.current) return;

        const data = res.data?.data || {};
        const items = data.transactions || [];
        const pag = data.pagination || {};

        setTransactions(items);
        setPagination({
          page: pag.page || pageToLoad,
          limit: pag.limit || 20,
          totalItems: pag.totalItems !== undefined ? pag.totalItems : pag.total !== undefined ? pag.total : items.length,
          totalPages: pag.totalPages !== undefined ? pag.totalPages : Math.max(1, Math.ceil((pag.totalItems || items.length) / 20)),
        });
      } catch (err) {
        if (requestId !== activeRequestIdRef.current) return;

        if (err.response?.status === 404) {
          // Backend has not mounted /api/admin/finance/transactions yet
          setContractNotice(
            'The transaction listing endpoint (/api/admin/finance/transactions) is not yet active on the backend server. The summary metrics above are loaded from the backend live service.'
          );
          setTransactions([]);
        } else if (err.response?.status === 403) {
          setTransactionsError('403 Forbidden: Administrator privileges required.');
          setTransactions([]);
        } else if (err.response?.status === 401) {
          setTransactionsError('401 Unauthorized: Session expired. Please sign in again.');
          setTransactions([]);
        } else {
          const msg =
            err.response?.data?.error?.message ||
            err.response?.data?.message ||
            'Failed to load financial transactions. Please retry.';
          setTransactionsError(msg);
          setTransactions([]);
        }
      } finally {
        if (requestId === activeRequestIdRef.current) {
          setTransactionsLoading(false);
        }
      }
    },
    [
      currentPage,
      debouncedSearch,
      typeFilter,
      statusFilter,
      directionFilter,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    ]
  );

  useEffect(() => {
    if (!dateError) {
      fetchTransactions(currentPage);
    }
  }, [fetchTransactions, currentPage, dateError]);

  // Handle Sort Change (server-side)
  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnKey);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (columnKey) => {
    if (sortBy !== columnKey) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-700" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-[#714B67]" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[#714B67]" />
    );
  };

  // Reset filters
  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setTypeFilter('all');
    setStatusFilter('all');
    setDirectionFilter('all');
    setDateFrom('');
    setDateTo('');
    setDateError('');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    debouncedSearch ||
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    directionFilter !== 'all' ||
    dateFrom ||
    dateTo;

  if (authError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-4">
          <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-red-900">Access Restricted</h2>
            <p className="text-sm text-red-700">{authError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="mt-2"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#e2e5e9] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Finance Command Center
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            LDCE Organizational Finance Ledger • Verified institutional receipts, disbursements, and cash balance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchSummary();
              fetchTransactions(currentPage);
            }}
            className="flex items-center gap-1.5"
            disabled={summaryLoading || transactionsLoading}
          >
            <RotateCcw className={`h-4 w-4 ${summaryLoading || transactionsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* 2. Financial Summary Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Financial Summary
          </h2>
          {summaryError && (
            <button
              onClick={fetchSummary}
              className="text-xs text-[#714B67] hover:underline flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" /> Retry Summary
            </button>
          )}
        </div>

        {summaryLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white border border-[#e2e5e9] rounded-lg p-5 space-y-2 animate-pulse"
              >
                <div className="h-3.5 bg-gray-200 rounded w-24"></div>
                <div className="h-7 bg-gray-300 rounded w-32"></div>
              </div>
            ))}
          </div>
        ) : summaryError ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between text-sm text-amber-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span>{summaryError}</span>
            </div>
            <Button size="sm" variant="outline" onClick={fetchSummary}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Income */}
            <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm hover:border-[#714B67]/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Total Income
                </span>
                <span className="p-1.5 bg-[#017E84]/10 rounded-md text-[#017E84]">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-[#017E84] mt-2">
                {formatCurrency(summary?.totalIncome)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Verified gross inflows</p>
            </div>

            {/* Total Expenses */}
            <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm hover:border-[#714B67]/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Total Expenses
                </span>
                <span className="p-1.5 bg-red-50 rounded-md text-red-600">
                  <TrendingDown className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-red-600 mt-2">
                {formatCurrency(summary?.totalExpenses)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Disbursed gross outflows</p>
            </div>

            {/* Net Balance */}
            <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm hover:border-[#714B67]/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Net Balance
                </span>
                <span className="p-1.5 bg-[#714B67]/10 rounded-md text-[#714B67]">
                  <DollarSign className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(summary?.netBalance)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Net organization balance</p>
            </div>

            {/* Pending Amount */}
            <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm hover:border-[#714B67]/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Pending Amount
                </span>
                <span className="p-1.5 bg-[#E4A900]/15 rounded-md text-[#8a6500]">
                  <Clock className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                {formatCurrency(summary?.pendingAmount)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Unsettled / pending audit</p>
            </div>

            {/* Transaction Count */}
            <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm hover:border-[#714B67]/30 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Transaction Count
                </span>
                <span className="p-1.5 bg-gray-100 rounded-md text-gray-700">
                  <Hash className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">
                {summary?.transactionCount !== null && summary?.transactionCount !== undefined
                  ? summary.transactionCount
                  : '—'}
              </div>
              <p className="text-xs text-gray-500 mt-1">Total recorded transactions</p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Search and Filters Toolbar */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 space-y-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* DEBOUNCED LIVE SEARCH ONLY - No search button, no search toggle */}
          <div className="relative flex-1">
            <label htmlFor="finance-search" className="sr-only">
              Search transactions
            </label>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="finance-search"
              type="text"
              placeholder="Live search by transaction ID, reference, or metadata..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 pr-9 w-full"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                aria-label="Clear search input"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Filters Group */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Type */}
            <div>
              <label htmlFor="type-filter" className="sr-only">
                Filter by Type
              </label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-sm border border-[#e2e5e9] rounded-md px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status-filter" className="sr-only">
                Filter by Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-sm border border-[#e2e5e9] rounded-md px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Direction */}
            <div>
              <label htmlFor="direction-filter" className="sr-only">
                Filter by Direction
              </label>
              <select
                id="direction-filter"
                value={directionFilter}
                onChange={(e) => {
                  setDirectionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-sm border border-[#e2e5e9] rounded-md px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]"
              >
                {DIRECTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Date Filter Row with Frontend Validation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-[#f1f3f5]">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
            <span className="flex items-center gap-1 font-medium text-gray-700">
              <Calendar className="h-4 w-4 text-[#714B67]" /> Date Range:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                aria-label="Date From"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs border border-[#e2e5e9] rounded px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                aria-label="Date To"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs border border-[#e2e5e9] rounded px-2.5 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]"
              />
            </div>
            {dateError && (
              <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {dateError}
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs text-gray-600 hover:text-gray-900"
            >
              Clear All Filters
            </Button>
          )}
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Filter className="h-3 w-3" /> Active:
            </span>
            {debouncedSearch && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#714B67]/10 text-[#714B67] border border-[#714B67]/20">
                Search: "{debouncedSearch}"
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="hover:text-red-600 ml-0.5"
                  aria-label="Remove search filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {typeFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                Type: {formatTypeLabel(typeFilter)}
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('all');
                    setCurrentPage(1);
                  }}
                  className="hover:text-red-600 ml-0.5"
                  aria-label="Remove type filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                Status: {statusFilter}
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setCurrentPage(1);
                  }}
                  className="hover:text-red-600 ml-0.5"
                  aria-label="Remove status filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {directionFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                Direction: {directionFilter}
                <button
                  type="button"
                  onClick={() => {
                    setDirectionFilter('all');
                    setCurrentPage(1);
                  }}
                  className="hover:text-red-600 ml-0.5"
                  aria-label="Remove direction filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {(dateFrom || dateTo) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                Date: {dateFrom || 'start'} → {dateTo || 'end'}
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setCurrentPage(1);
                  }}
                  className="hover:text-red-600 ml-0.5"
                  aria-label="Remove date filter"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Contract Mismatch Notice (if backend transactions endpoint is unmounted) */}
      {contractNotice && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm text-blue-900">
            <p className="font-semibold">Backend Route Notice</p>
            <p className="text-blue-800">{contractNotice}</p>
          </div>
        </div>
      )}

      {/* Error Banner with Retry */}
      {transactionsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between text-sm text-red-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <span>{transactionsError}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchTransactions(currentPage)}
            className="flex items-center gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* 4. Transactions Table Section */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#e2e5e9] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Financial Transactions</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Authoritative transaction records and audit entries
            </p>
          </div>
          <div className="text-xs text-gray-500 font-medium">
            {transactionsLoading ? (
              <span className="flex items-center gap-1.5">
                <LoadingSpinner size="sm" /> Loading records...
              </span>
            ) : (
              <span>
                Showing {transactions.length} of {pagination.totalItems} transaction
                {pagination.totalItems === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        {/* Table / Skeleton / Empty state */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#e2e5e9] text-left text-sm">
            <thead className="bg-[#F8F9FA] text-xs font-semibold uppercase tracking-wider text-gray-600">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3.5 cursor-pointer group hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Transaction ID</span>
                    {getSortIcon('id')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 cursor-pointer group hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Type</span>
                    {getSortIcon('type')}
                  </div>
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Direction
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 cursor-pointer group hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Amount</span>
                    {getSortIcon('amount')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 cursor-pointer group hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    {getSortIcon('status')}
                  </div>
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Reference / Source
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 cursor-pointer group hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date</span>
                    {getSortIcon('createdAt')}
                  </div>
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e5e9] bg-white">
              {transactionsLoading ? (
                // Skeleton Rows
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-28"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="h-8 bg-gray-200 rounded w-16 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-full w-12 h-12 mx-auto flex items-center justify-between text-gray-400">
                        <DollarSign className="h-6 w-6 mx-auto" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">
                        No financial transactions found
                      </h3>
                      <p className="text-sm text-gray-500">
                        {hasActiveFilters
                          ? 'No transactions match the selected search and filter criteria.'
                          : 'No financial records have been recorded yet.'}
                      </p>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearFilters}
                          className="mt-2"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => {
                  const direction = String(txn.direction || '').toUpperCase();
                  const isIncome = direction === 'INCOME';
                  const isExpense = direction === 'EXPENSE';

                  return (
                    <tr
                      key={txn.id || txn._id}
                      className="hover:bg-gray-50/80 transition-colors"
                    >
                      {/* Transaction ID */}
                      <td className="px-4 py-3.5 font-mono text-xs font-medium text-gray-900">
                        <Link
                          to={`/admin/finance/transactions/${txn.id || txn._id}`}
                          className="text-[#714B67] hover:underline font-semibold"
                        >
                          {txn.id || txn._id || '—'}
                        </Link>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3.5 text-gray-800">
                        <span className="font-medium">
                          {formatTypeLabel(txn.type)}
                        </span>
                      </td>

                      {/* Direction */}
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={isIncome ? 'teal' : isExpense ? 'danger' : 'gray'}
                        >
                          {txn.direction || '—'}
                        </Badge>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3.5 font-semibold text-gray-900">
                        <span
                          className={
                            isIncome
                              ? 'text-[#017E84]'
                              : isExpense
                              ? 'text-red-600'
                              : 'text-gray-900'
                          }
                        >
                          {isIncome ? '+' : isExpense ? '-' : ''}
                          {formatCurrency(txn.amount)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <Badge>{txn.status || '—'}</Badge>
                      </td>

                      {/* Reference / Source */}
                      <td className="px-4 py-3.5 text-xs text-gray-600">
                        <div className="space-y-0.5">
                          {txn.referenceId && (
                            <div className="font-mono text-gray-700">
                              Ref: {txn.referenceId}
                            </div>
                          )}
                          {txn.source?.name && (
                            <div className="text-gray-900 font-medium">
                              {txn.source.name}
                            </div>
                          )}
                          {txn.source?.type && !txn.source?.name && (
                            <div className="text-gray-500">
                              Source: {txn.source.type} {txn.source.id ? `(#${txn.source.id})` : ''}
                            </div>
                          )}
                          {!txn.referenceId && !txn.source && <span>—</span>}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-xs text-gray-600">
                        {formatDateDisplay(txn.date || txn.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/admin/finance/transactions/${txn.id || txn._id}`)
                          }
                          className="h-8 px-2 text-[#714B67] hover:text-[#5a3b52] hover:bg-[#714B67]/10"
                          aria-label={`View transaction ${txn.id || txn._id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Server-side Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-[#e2e5e9] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F8F9FA]">
            <div className="text-xs text-gray-600">
              Page <span className="font-semibold text-gray-900">{pagination.page}</span> of{' '}
              <span className="font-semibold text-gray-900">{pagination.totalPages}</span> (
              {pagination.totalItems} total transactions)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1 || transactionsLoading}
                className="flex items-center gap-1 text-xs"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages || transactionsLoading}
                className="flex items-center gap-1 text-xs"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
