import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Search, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { memberService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Alert } from '../components/ui/Alert';

export default function MerchandiseCatalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search and Filter State
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });

  const fetchProducts = useCallback(async (p = 1, search = '', availability = 'all') => {
    setLoading(true);
    setError('');
    try {
      const params = { page: p, limit: 12 };
      if (search && search.trim()) params.search = search.trim();
      if (availability && availability !== 'all') params.availability = availability;

      const response = await memberService.getProducts(params);
      if (response.data?.success) {
        const items = response.data.data?.products || [];
        setProducts(Array.isArray(items) ? items : []);
        if (response.data.data?.pagination) {
          setPagination(response.data.data.pagination);
        }
      } else {
        setError('Unable to load merchandise items.');
      }
    } catch (err) {
      if (!err.response) {
        setError('Unable to connect to the server.');
      } else {
        setError(err.response.data?.error?.message || 'Failed to fetch merchandise.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(1, '', 'all');
  }, [fetchProducts]);

  const handleApplySearch = () => {
    setAppliedSearch(searchInput);
    setPage(1);
    fetchProducts(1, searchInput, availabilityFilter);
  };

  const handleAvailabilityChange = (val) => {
    setAvailabilityFilter(val);
    setPage(1);
    fetchProducts(1, appliedSearch, val);
  };

  const handleClear = () => {
    setSearchInput('');
    setAppliedSearch('');
    setAvailabilityFilter('all');
    setPage(1);
    fetchProducts(1, '', 'all');
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchProducts(newPage, appliedSearch, availabilityFilter);
  };

  const hasActiveFilters = Boolean(appliedSearch || availabilityFilter !== 'all' || searchInput);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#000000]">Official Merchandise</h1>
        <p className="text-sm text-[#555555] mt-1">
          Exclusive apparel and gear for LDCE Student Association members.
        </p>
      </div>

      {/* Server-Backed Search & Filters */}
      <div className="bg-white border border-[#e2e5e9] rounded-lg p-4 shadow-sm space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleApplySearch();
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <Input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products by name or description..."
              className="pl-9 text-xs h-9"
              aria-label="Search products"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Availability Filter */}
            <select
              value={availabilityFilter}
              onChange={(e) => handleAvailabilityChange(e.target.value)}
              className="text-xs font-medium border border-[#e2e5e9] rounded px-3 py-2 bg-white text-gray-800 hover:border-[#714B67] focus:outline-none focus:ring-1 focus:ring-[#714B67] h-9"
              aria-label="Filter products by availability"
            >
              <option value="all">All Availability</option>
              <option value="AVAILABLE">Available</option>
              <option value="SOLD_OUT">Sold Out</option>
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
          <span>Loading merchandise catalog...</span>
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={hasActiveFilters ? "No products found." : "No merchandise available"}
          description={
            hasActiveFilters
              ? "No products match your current search and filter criteria. Try adjusting your query."
              : "Check back soon for upcoming association apparel and merchandise drops."
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((prod) => (
              <div
                key={prod.productId}
                className="bg-white border border-[#e2e5e9] rounded-lg overflow-hidden shadow-sm hover:border-[#714B67]/40 transition-colors flex flex-col justify-between"
              >
                <div>
                  {/* Product Image or Restrained Placeholder */}
                  <div className="h-44 bg-[#F8F9FA] border-b border-[#e2e5e9] flex items-center justify-center p-4">
                    {prod.image ? (
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-gray-400">
                        <ShoppingBag className="w-10 h-10 mx-auto mb-1 text-[#714B67]/40" />
                        <span className="text-[11px] font-medium uppercase tracking-wider">Campus360 Gear</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={prod.availabilityStatus === 'OUT_OF_STOCK' || prod.availabilityStatus === 'SOLD_OUT' ? 'danger' : 'teal'}>
                        {prod.availabilityStatus || 'AVAILABLE'}
                      </Badge>
                      <span className="text-sm font-bold text-[#000000]">
                        ₹{prod.basePrice !== undefined ? prod.basePrice : '—'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#000000] mb-1 line-clamp-1">
                      {prod.name}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {prod.description || 'Association official item.'}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-0">
                  <Link
                    to={`/merchandise/${prod.productId}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded text-xs font-semibold bg-[#714B67] text-white hover:bg-[#5d3d54] transition-colors"
                  >
                    View Details <ArrowRight className="w-3.5 h-3.5" />
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
                <span className="font-semibold text-gray-800">{pagination.totalPages}</span> ({pagination.total} total items)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="text-xs gap-1 border-[#e2e5e9] text-gray-700"
                  aria-label="Previous page of products"
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
                  aria-label="Next page of products"
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
