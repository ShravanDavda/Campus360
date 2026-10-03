import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  UserCheck,
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
  Mail,
  Phone,
  CheckSquare,
} from 'lucide-react';
import { adminService } from '../services/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const ASSIGNMENT_OPTIONS = [
  { value: 'ALL', label: 'All Assignments' },
  { value: 'ASSIGNED', label: 'Assigned (Has Tasks)' },
  { value: 'UNASSIGNED', label: 'Unassigned (No Tasks)' },
];

export default function AdminVolunteers() {
  const navigate = useNavigate();

  // Authentication check
  const [authError] = useState(() => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role && user.role !== 'admin') {
        return '403 Forbidden: Administrator privileges required to access Admin Volunteer Management.';
      }
    } catch {
      // rely on backend auth
    }
    return '';
  });

  // Volunteers state & pagination
  const [volunteers, setVolunteers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [tableError, setTableError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Search state — EXPLICIT SEARCH (BUTTON / ENTER) ONLY!
  // No debounce while typing!
  const [searchInput, setSearchInput] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');

  // Filters state
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignmentFilter, setAssignmentFilter] = useState('ALL');

  // Sorting state (server-side)
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch volunteers authoritative method
  const fetchVolunteers = useCallback(
    async (pageToLoad = currentPage) => {
      setLoading(true);
      setTableError('');

      try {
        const params = {
          page: pageToLoad,
          limit: 20,
          search: submittedSearch || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          assignment: assignmentFilter !== 'ALL' ? assignmentFilter : undefined,
          sortBy,
          sortOrder,
        };

        const res = await adminService.getAdminVolunteers(params);
        const data = res.data?.data || {};
        const items = data.volunteers || [];
        const pag = data.pagination || {};

        setVolunteers(items);
        setPagination({
          page: pag.page || pageToLoad,
          limit: pag.limit || 20,
          total: pag.totalItems !== undefined ? pag.totalItems : pag.total !== undefined ? pag.total : items.length,
          totalPages: pag.totalPages !== undefined ? pag.totalPages : Math.ceil((pag.total || items.length) / 20) || 1,
        });
      } catch (err) {
        if (err.response?.status === 403) {
          setTableError('403 Forbidden: Administrator privileges required.');
        } else if (err.response?.status === 401) {
          setTableError('401 Unauthorized: Session expired. Please sign in again.');
        } else {
          const msg =
            err.response?.data?.error?.message ||
            err.response?.data?.message ||
            'Failed to load volunteers. Please try again.';
          setTableError(msg);
        }
        setVolunteers([]);
      } finally {
        setLoading(false);
      }
    },
    [currentPage, submittedSearch, statusFilter, assignmentFilter, sortBy, sortOrder]
  );

  useEffect(() => {
    fetchVolunteers(currentPage);
  }, [fetchVolunteers, currentPage]);

  // Handle Explicit Search Trigger (Button click or Enter)
  const handleTriggerSearch = (e) => {
    if (e) e.preventDefault();
    setSubmittedSearch(searchInput.trim());
    setCurrentPage(1);
  };

  const handleKeyDownSearch = (e) => {
    if (e.key === 'Enter') {
      handleTriggerSearch(e);
    }
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSubmittedSearch('');
    setCurrentPage(1);
  };

  // Handle Sort Change (server-side)
  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnKey);
      setSortOrder(columnKey === 'name' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchInput('');
    setSubmittedSearch('');
    setStatusFilter('all');
    setAssignmentFilter('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    Boolean(submittedSearch) || statusFilter !== 'all' || assignmentFilter !== 'ALL';

  if (authError) {
    return (
      <div className="p-6 bg-white border border-red-200 rounded-lg text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" aria-hidden="true" />
        <h2 className="text-lg font-bold text-gray-900 mb-1">Access Denied</h2>
        <p className="text-sm text-gray-600 mb-4">{authError}</p>
        <Button onClick={() => navigate('/dashboard')} className="bg-[#714B67] hover:bg-[#5a3a52] text-white">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Quick Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-lg border border-[#e2e5e9] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserCheck className="w-6 h-6 text-[#017E84]" aria-hidden="true" />
            <h1 className="text-xl sm:text-2xl font-bold text-[#000000]">Volunteer Management</h1>
          </div>
          <p className="text-sm text-gray-600">
            View LDCE student association volunteers, track workload metrics, and review assigned tasks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/tasks"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded border border-[#e2e5e9] transition-colors"
          >
            <CheckSquare className="w-4 h-4 text-[#714B67]" aria-hidden="true" />
            <span>Manage Tasks</span>
          </Link>
        </div>
      </div>

      {/* Explicit Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-[#e2e5e9] space-y-3 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Explicit Search (Button / Enter only) */}
          <div className="md:col-span-2">
            <form onSubmit={handleTriggerSearch} className="flex items-center gap-2">
              <label htmlFor="volunteer-search-input" className="sr-only">
                Search Volunteers
              </label>
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <Input
                  id="volunteer-search-input"
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDownSearch}
                  placeholder="Type name, email, or phone, then press Enter or click Search..."
                  className="pl-9 pr-8 text-sm"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    aria-label="Clear search input"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button
                type="submit"
                id="volunteer-search-submit"
                className="bg-[#714B67] hover:bg-[#5a3a52] text-white text-xs sm:text-sm font-semibold px-4 h-10 shrink-0"
              >
                Search
              </Button>
            </form>
          </div>

          {/* Status Filter */}
          <div>
            <label htmlFor="volunteer-status-filter" className="sr-only">
              Filter by Status
            </label>
            <select
              id="volunteer-status-filter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3 text-sm bg-white border border-[#e2e5e9] rounded focus:outline-none focus:ring-2 focus:ring-[#714B67]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assignment Filter */}
          <div>
            <label htmlFor="volunteer-assignment-filter" className="sr-only">
              Filter by Assignment
            </label>
            <select
              id="volunteer-assignment-filter"
              value={assignmentFilter}
              onChange={(e) => {
                setAssignmentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full h-10 px-3 text-sm bg-white border border-[#e2e5e9] rounded focus:outline-none focus:ring-2 focus:ring-[#714B67]"
            >
              {ASSIGNMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#e2e5e9]">
            <span className="text-xs font-medium text-gray-500">Active Filters:</span>
            {submittedSearch && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800 border border-gray-200">
                Search: "{submittedSearch}"
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Remove search filter"
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800 border border-gray-200">
                Status: {statusFilter}
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  aria-label="Remove status filter"
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {assignmentFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800 border border-gray-200">
                Assignment: {assignmentFilter}
                <button
                  type="button"
                  onClick={() => setAssignmentFilter('ALL')}
                  aria-label="Remove assignment filter"
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-[#714B67] hover:underline font-semibold ml-auto flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Volunteers Table */}
      <div className="bg-white rounded-lg border border-[#e2e5e9] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <LoadingSpinner size="lg" className="text-[#017E84]" />
            <p className="text-sm text-gray-500">Loading volunteers from backend...</p>
          </div>
        ) : tableError ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-semibold text-gray-900 mb-1">{tableError}</p>
            <Button
              onClick={() => fetchVolunteers(currentPage)}
              variant="outline"
              className="mt-3 text-xs inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </Button>
          </div>
        ) : volunteers.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              {hasActiveFilters ? 'No volunteers match your current filters.' : 'No volunteers found.'}
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-4">
              {hasActiveFilters
                ? 'Try clearing or modifying your search keyword or assignment filter.'
                : 'No registered members with volunteer role are available currently.'}
            </p>
            {hasActiveFilters && (
              <Button onClick={handleClearFilters} variant="outline" className="text-xs">
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-[#e2e5e9] text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th scope="col" className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => handleSort('name')}
                        className="inline-flex items-center gap-1 hover:text-gray-900 focus:outline-none"
                      >
                        <span>Volunteer</span>
                        {sortBy === 'name' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#714B67]" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-[#714B67]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th scope="col" className="py-3 px-4">
                      <span>Contact</span>
                    </th>
                    <th scope="col" className="py-3 px-4">
                      <span>Status</span>
                    </th>
                    <th scope="col" className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleSort('assignedTaskCount')}
                        className="inline-flex items-center gap-1 hover:text-gray-900 focus:outline-none"
                      >
                        <span>Assigned Tasks</span>
                        {sortBy === 'assignedTaskCount' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#714B67]" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-[#714B67]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th scope="col" className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleSort('activeTaskCount')}
                        className="inline-flex items-center gap-1 hover:text-gray-900 focus:outline-none"
                      >
                        <span>Active</span>
                        {sortBy === 'activeTaskCount' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#714B67]" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-[#714B67]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th scope="col" className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleSort('completedTaskCount')}
                        className="inline-flex items-center gap-1 hover:text-gray-900 focus:outline-none"
                      >
                        <span>Completed</span>
                        {sortBy === 'completedTaskCount' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-[#714B67]" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-[#714B67]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th scope="col" className="py-3 px-4 text-right">
                      <span>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e5e9]">
                  {volunteers.map((vol) => (
                    <tr key={vol.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          to={`/admin/volunteers/${vol.id}`}
                          className="font-semibold text-gray-900 hover:text-[#714B67] flex items-center gap-1.5"
                        >
                          <UserCheck className="w-4 h-4 text-[#017E84]" />
                          <span>{vol.name}</span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-600">
                        {vol.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <span>{vol.email}</span>
                          </div>
                        )}
                        {vol.phone && (
                          <div className="flex items-center gap-1.5 mt-0.5 text-gray-500">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{vol.phone}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge>{vol.status}</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                          {vol.assignedTaskCount || 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#714B67]/10 text-[#714B67]">
                          {vol.activeTaskCount || 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-[#017E84]/10 text-[#017E84]">
                          {vol.completedTaskCount || 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          to={`/admin/volunteers/${vol.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#714B67] bg-[#714B67]/10 hover:bg-[#714B67]/20 rounded transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 bg-gray-50/70 border-t border-[#e2e5e9] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-gray-600">
              <div>
                Showing page <span className="font-semibold text-gray-900">{pagination.page}</span> of{' '}
                <span className="font-semibold text-gray-900">{pagination.totalPages || 1}</span>{' '}
                ({pagination.total} total {pagination.total === 1 ? 'volunteer' : 'volunteers'})
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="flex items-center gap-1 text-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="flex items-center gap-1 text-xs"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
