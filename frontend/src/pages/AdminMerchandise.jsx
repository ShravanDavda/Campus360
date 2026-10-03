import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  Filter,
  Eye,
} from 'lucide-react';
import { adminService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const AVAILABILITY_OPTIONS = [
  { value: 'all', label: 'All Availability' },
  { value: 'AVAILABLE', label: 'In Stock' },
  { value: 'SOLD_OUT', label: 'Sold Out' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
];

const formatCurrency = (val) => {
  const num = Number(val);
  if (isNaN(num)) return '₹0';
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

export default function AdminMerchandise() {
  const navigate = useNavigate();

  // Authentication check
  const [authError] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role && user.role !== 'admin') {
        return '403 Forbidden: Administrator privileges required to access Admin Merchandise Management.';
      }
    } catch {
      // rely on backend auth
    }
    return '';
  });

  // Product list & pagination state
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Search state — DEBOUNCED LIVE SEARCH ONLY (~350ms)
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filters state
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Sorting state (server-side)
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  // Feedback notifications / Toast
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Create Product Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    basePrice: '',
    image: '',
    isMemberAvailable: true,
  });

  // Stale request protection counter
  const requestIdRef = useRef(0);

  // Debounce search input (~350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 350);

    return () => clearTimeout(handler);
  }, [searchInput]);

  // Server-side fetch products
  const fetchProducts = useCallback(
    async (pageToLoad = currentPage) => {
      if (authError) return;

      const currentReqId = ++requestIdRef.current;
      setLoading(true);
      setTableError('');

      try {
        const params = {
          page: pageToLoad,
          limit: 20,
          sortBy,
          sortOrder,
        };

        if (debouncedSearch) {
          params.search = debouncedSearch;
        }
        if (availabilityFilter !== 'all') {
          params.availabilityState = availabilityFilter;
        }
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }

        const res = await adminService.getAdminProducts(params);

        // Stale response protection
        if (currentReqId !== requestIdRef.current) return;

        const data = res.data?.data || {};
        const items = data.products || (Array.isArray(data) ? data : []);
        const pag = data.pagination || {};

        setProducts(items);
        setPagination({
          page: pag.page || pageToLoad,
          limit: pag.limit || 20,
          total: pag.total !== undefined ? pag.total : items.length,
          totalPages: pag.totalPages !== undefined ? pag.totalPages : Math.max(1, Math.ceil((pag.total || items.length) / 20)),
        });
      } catch (err) {
        if (currentReqId !== requestIdRef.current) return;

        if (err.response?.status === 401) {
          setTableError('Authentication session expired. Please sign in again.');
        } else if (err.response?.status === 403) {
          setTableError('403 Forbidden: You do not have permission to view merchandise.');
        } else {
          setTableError(
            err.response?.data?.message ||
              err.response?.data?.error?.message ||
              'Failed to load merchandise records. Please try again.'
          );
        }
        setProducts([]);
      } finally {
        if (currentReqId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [authError, currentPage, debouncedSearch, availabilityFilter, statusFilter, sortBy, sortOrder]
  );

  useEffect(() => {
    fetchProducts(currentPage);
  }, [fetchProducts, currentPage]);

  // Toggle Column Sort (server-side)
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-700" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-[#714B67]" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-[#714B67]" />
    );
  };

  // Clear filters
  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setAvailabilityFilter('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = debouncedSearch || availabilityFilter !== 'all' || statusFilter !== 'all';

  // Handle Create Product Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) {
      setCreateError('Product name is required.');
      return;
    }
    if (!createForm.description.trim()) {
      setCreateError('Product description is required.');
      return;
    }

    let parsedPrice = 0;
    if (createForm.basePrice !== '') {
      parsedPrice = Number(createForm.basePrice);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        setCreateError('Base price must be a valid non-negative number.');
        return;
      }
    }

    setCreateSubmitting(true);
    setCreateError('');

    try {
      const payload = {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        basePrice: parsedPrice,
        image: createForm.image.trim() || null,
        isMemberAvailable: createForm.isMemberAvailable,
      };

      const res = await adminService.createAdminProduct(payload);
      const created = res.data?.data?.product || res.data?.data;

      showToast(`Product "${created?.name || payload.name}" created successfully.`);
      setCreateModalOpen(false);
      setCreateForm({
        name: '',
        description: '',
        basePrice: '',
        image: '',
        isMemberAvailable: true,
      });

      // Revalidate list
      fetchProducts(1);
    } catch (err) {
      setCreateError(
        err.response?.data?.message ||
          err.response?.data?.error?.message ||
          'Failed to create product. Please check form values.'
      );
    } finally {
      setCreateSubmitting(false);
    }
  };

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between shadow-sm transition-all ${
            notification.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-[#017E84]/10 border border-[#017E84]/30 text-[#017E84]'
          }`}
          role="status"
        >
          <div className="flex items-center gap-2">
            {notification.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-[#017E84]" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#e2e5e9] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Merchandise & Inventory
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage products, variants, and inventory for LDCE Student Association.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchProducts(currentPage)}
            className="flex items-center gap-1.5"
            disabled={loading}
          >
            <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setCreateError('');
              setCreateModalOpen(true);
            }}
            className="bg-[#714B67] hover:bg-[#5a3b52] text-white flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </Button>
        </div>
      </div>

      {/* 2. Compact Authoritative Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Total Catalog Products
            </span>
            <ShoppingBag className="w-4 h-4 text-[#714B67]" />
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 block">
              {pagination.total}
            </span>
            <span className="text-xs text-gray-500 mt-1 block">Authoritative recorded products</span>
          </div>
        </div>

        <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Inventory Mode
            </span>
            <Package className="w-4 h-4 text-[#017E84]" />
          </div>
          <div className="mt-3">
            <span className="text-lg font-bold text-[#017E84] block">
              Direct Level Set
            </span>
            <span className="text-xs text-gray-500 mt-1 block">
              Authoritative stock count per variant
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between pb-2 border-b border-[#e2e5e9]">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Catalog Scope
            </span>
            <Layers className="w-4 h-4 text-[#E4A900]" />
          </div>
          <div className="mt-3">
            <span className="text-lg font-bold text-gray-900 block">
              LDCE Student Association
            </span>
            <span className="text-xs text-gray-500 mt-1 block">
              Multi-variant merchandise system
            </span>
          </div>
        </div>
      </div>

      {/* 3. Search and Filters Toolbar — DEBOUNCED LIVE SEARCH ONLY */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-5 space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* DEBOUNCED LIVE SEARCH ONLY - No search button, no search-mode toggle */}
          <div className="relative flex-1">
            <label htmlFor="merchandise-search" className="sr-only">
              Search merchandise
            </label>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="merchandise-search"
              type="text"
              placeholder="Live search by product name or description..."
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

          {/* Quick Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-[280px]">
            {/* Availability Filter */}
            <div>
              <label htmlFor="availability-filter" className="sr-only">
                Filter by Availability
              </label>
              <select
                id="availability-filter"
                value={availabilityFilter}
                onChange={(e) => {
                  setAvailabilityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full text-sm border border-[#e2e5e9] rounded-md px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#714B67]"
              >
                {AVAILABILITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
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
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#f1f3f5]">
            <div className="flex flex-wrap items-center gap-2">
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
              {availabilityFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                  Availability: {availabilityFilter === 'AVAILABLE' ? 'In Stock' : 'Sold Out'}
                  <button
                    type="button"
                    onClick={() => {
                      setAvailabilityFilter('all');
                      setCurrentPage(1);
                    }}
                    className="hover:text-red-600 ml-0.5"
                    aria-label="Remove availability filter"
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
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-xs text-gray-600 hover:text-gray-900"
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </div>

      {/* Error Banner with Retry */}
      {tableError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between text-sm text-red-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <span>{tableError}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchProducts(currentPage)}
            className="flex items-center gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* 4. Products Table Section */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#e2e5e9] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Product Catalog</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Available merchandise, configured sizes, and stock inventory
            </p>
          </div>
          <div className="text-xs text-gray-500 font-medium">
            {loading ? (
              <span className="flex items-center gap-1.5">
                <LoadingSpinner size="sm" /> Loading products...
              </span>
            ) : (
              <span>
                Showing {products.length} of {pagination.total} product
                {pagination.total === 1 ? '' : 's'}
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
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Product</span>
                    {getSortIcon('name')}
                  </div>
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 cursor-pointer group hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Base Price</span>
                    {getSortIcon('price')}
                  </div>
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Variants
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 cursor-pointer group hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('stock')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Total Stock</span>
                    {getSortIcon('stock')}
                  </div>
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Availability
                </th>
                <th
                  scope="col"
                  className="px-4 py-3.5 cursor-pointer group hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Created At</span>
                    {getSortIcon('createdAt')}
                  </div>
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e5e9] bg-white">
              {loading ? (
                // Skeletons
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-40"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="h-8 bg-gray-200 rounded w-20 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-full w-12 h-12 mx-auto flex items-center justify-center text-gray-400">
                        <ShoppingBag className="h-6 w-6" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">
                        No merchandise found
                      </h3>
                      <p className="text-sm text-gray-500">
                        {hasActiveFilters
                          ? 'No products match your search and filter criteria.'
                          : 'No merchandise records have been added to the catalog yet.'}
                      </p>
                      {hasActiveFilters ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearFilters}
                          className="mt-2"
                        >
                          Clear Filters
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setCreateError('');
                            setCreateModalOpen(true);
                          }}
                          className="mt-2 bg-[#714B67] hover:bg-[#5a3b52] text-white"
                        >
                          Add Product
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((prod) => {
                  const pId = prod.id || prod.productId;
                  const isAvailable = prod.availabilityStatus === 'AVAILABLE';

                  return (
                    <tr key={pId} className="hover:bg-gray-50/80 transition-colors">
                      {/* Product Name & Description */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded border border-[#e2e5e9] bg-[#F8F9FA] flex items-center justify-center shrink-0 overflow-hidden">
                            {prod.image ? (
                              <img
                                src={prod.image}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <ShoppingBag className="w-4 h-4 text-[#714B67]/40" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs sm:max-w-sm">
                            <Link
                              to={`/admin/merchandise/${pId}`}
                              className="font-bold text-gray-900 hover:text-[#714B67] hover:underline block truncate"
                            >
                              {prod.name}
                            </Link>
                            <p className="text-xs text-gray-500 truncate">
                              {prod.description || 'No description'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Base Price */}
                      <td className="px-4 py-3.5 font-semibold text-gray-900">
                        {formatCurrency(prod.basePrice ?? prod.price ?? 0)}
                      </td>

                      {/* Variant Count */}
                      <td className="px-4 py-3.5 text-xs text-gray-700">
                        <span className="inline-flex items-center gap-1 font-medium bg-gray-100 px-2 py-0.5 rounded">
                          <Layers className="h-3 w-3 text-gray-500" />
                          {prod.variantCount ?? 0} variants
                        </span>
                      </td>

                      {/* Total Stock */}
                      <td className="px-4 py-3.5 font-bold text-gray-900">
                        <span
                          className={
                            (prod.totalStock ?? 0) === 0 ? 'text-red-600' : 'text-[#017E84]'
                          }
                        >
                          {Number(prod.totalStock ?? 0).toLocaleString()} units
                        </span>
                      </td>

                      {/* Availability */}
                      <td className="px-4 py-3.5">
                        <Badge variant={isAvailable ? 'teal' : 'danger'}>
                          {isAvailable ? 'AVAILABLE' : 'SOLD_OUT'}
                        </Badge>
                      </td>

                      {/* Created At */}
                      <td className="px-4 py-3.5 text-xs text-gray-600">
                        {formatDateDisplay(prod.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/merchandise/${pId}`)}
                          className="h-8 px-2 text-[#714B67] hover:text-[#5a3b52] hover:bg-[#714B67]/10"
                          aria-label={`View merchandise ${prod.name}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Manage
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
              {pagination.total} total products)
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1 || loading}
                className="flex items-center gap-1 text-xs"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="flex items-center gap-1 text-xs"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE PRODUCT MODAL */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-product-modal-title"
        >
          <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#e2e5e9]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#714B67]" />
                <h2 id="create-product-modal-title" className="text-base font-bold text-gray-900">
                  Add New Product
                </h2>
              </div>
              <button
                type="button"
                onClick={() => !createSubmitting && setCreateModalOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="Close dialog"
                disabled={createSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mt-3 p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3">
              <div>
                <label htmlFor="prod-name" className="block text-xs font-semibold text-gray-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="prod-name"
                  type="text"
                  required
                  placeholder="e.g. LDCE Official Hoodie 2026"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full text-xs"
                  disabled={createSubmitting}
                />
              </div>

              <div>
                <label htmlFor="prod-desc" className="block text-xs font-semibold text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="prod-desc"
                  rows={3}
                  required
                  placeholder="Detailed product overview, fabric specifications, and guidelines."
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full text-xs border border-[#e2e5e9] rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-[#714B67] bg-white text-gray-900"
                  disabled={createSubmitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="prod-base-price" className="block text-xs font-semibold text-gray-700 mb-1">
                    Base Price (₹)
                  </label>
                  <Input
                    id="prod-base-price"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 799"
                    value={createForm.basePrice}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, basePrice: e.target.value }))}
                    className="w-full text-xs"
                    disabled={createSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="prod-image" className="block text-xs font-semibold text-gray-700 mb-1">
                    Image URL
                  </label>
                  <Input
                    id="prod-image"
                    type="text"
                    placeholder="https://..."
                    value={createForm.image}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, image: e.target.value }))}
                    className="w-full text-xs"
                    disabled={createSubmitting}
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.isMemberAvailable}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, isMemberAvailable: e.target.checked }))
                    }
                    className="rounded border-gray-300 text-[#714B67] focus:ring-[#714B67]"
                    disabled={createSubmitting}
                  />
                  <span className="text-xs font-medium text-gray-700">
                    Make available in Member Merchandise Catalog
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t border-[#e2e5e9] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={createSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createSubmitting}
                  className="bg-[#714B67] hover:bg-[#5a3b52] text-white flex items-center gap-1.5"
                >
                  {createSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Add Product</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
