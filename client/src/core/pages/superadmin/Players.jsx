import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import Button from '../../components/common/Button';
import { PageLoader } from '../../components/common/Loader';
import { Search, Users, ChevronDown, ChevronUp, Phone, Filter } from 'lucide-react';

export default function Players() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedTenantFilter, setSelectedTenantFilter] = useState('');
  const [tenants, setTenants] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const fetchCustomers = async (p = page) => {
    try {
      setError('');
      setLoading(true);
      const params = { page: p, limit: 50 };
      if (search) params.search = search;
      if (selectedTenantFilter) params.tenantId = selectedTenantFilter;

      const { data } = await api.get('/customers', { params });
      setCustomers(data.data || []);
      setTotal(data.meta?.total || 0);
      setTotalPages(data.meta?.totalPages || 0);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error?.message || err.message || 'Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const { data } = await api.get('/tenants', { params: { limit: 200 } });
      setTenants(data.data || []);
    } catch (err) {
      console.error('Failed to load tenants for filter', err);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    fetchCustomers(1);
    setPage(1);
  }, [search, selectedTenantFilter]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchCustomers(newPage);
  };

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      c.fullName?.toLowerCase().includes(q) ||
      c.customerCode?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.tenant?.businessName?.toLowerCase().includes(q)
    );
  }, [search, customers]);

  if (loading && customers.length === 0) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">All Players</h1>
          <p className="text-text-muted mt-1">
            View all players across every venue on the platform
            {total > 0 && <span className="ml-1">· <strong>{total.toLocaleString()}</strong> total</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Tenant filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <select
              value={selectedTenantFilter}
              onChange={(e) => setSelectedTenantFilter(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary appearance-none cursor-pointer min-w-[180px]"
            >
              <option value="">All Venues</option>
              {tenants.map(t => (
                <option key={t._id} value={t._id}>{t.businessName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, phone, or venue..."
          className="w-full pl-10 pr-4 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary placeholder:text-text-muted"
        />
      </div>

      {/* Error state */}
      {error && customers.length === 0 && (
        <div className="p-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-center">
          <p className="text-red-700 dark:text-red-400 font-medium">Failed to load players</p>
          <p className="text-red-600 dark:text-red-300 text-sm mt-2">{error}</p>
          <Button
            variant="secondary"
            onClick={() => fetchCustomers(1)}
            className="mt-4"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Loading overlay for pagination */}
      {loading && customers.length > 0 && (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Player Cards */}
      {!error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((c) => {
              const isExpanded = expandedId === c._id;
              return (
                <div key={c._id}>
                  <div
                    className="bg-surface rounded-xl border border-border p-5 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : c._id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-text-primary truncate">{c.fullName}</h3>
                        <p className="text-xs text-text-muted mt-0.5">{c.customerCode}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {c.tenant && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400 truncate max-w-[100px]">
                            {c.tenant.businessName}
                          </span>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-text-muted flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3 text-sm text-text-muted">
                      {c.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> {c.phone}
                        </span>
                      )}
                      {c.email && (
                        <span className="text-xs truncate">{c.email}</span>
                      )}
                    </div>

                    {c.nickname && (
                      <p className="text-xs text-text-muted mt-1">aka "{c.nickname}"</p>
                    )}

                    {/* Wins/Losses stats */}
                    {(c.wins > 0 || c.losses > 0) && (
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 font-medium">
                          W: {c.wins}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-medium">
                          L: {c.losses}
                        </span>
                        {c.wins + c.losses > 0 && (
                          <span className="text-text-muted">
                            {Math.round((c.wins / (c.wins + c.losses)) * 100)}% win rate
                          </span>
                        )}
                      </div>
                    )}

                    {/* Expandable: venue details */}
                    {isExpanded && c.tenant && (
                      <div className="mt-3 pt-3 border-t border-border animate-slideDown">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-text-muted">Venue</span>
                            <p className="text-text-primary font-medium">{c.tenant.businessName}</p>
                          </div>
                          <div>
                            <span className="text-text-muted">Type</span>
                            <p className="text-text-primary font-medium">{c.tenant.businessTypeName}</p>
                          </div>
                        </div>
                        {c.createdAt && (
                          <p className="text-xs text-text-muted mt-2">
                            Joined {new Date(c.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-text-muted/30 mx-auto mb-4" />
              <p className="text-text-muted text-lg font-medium">
                {search || selectedTenantFilter ? 'No players match your filters.' : 'No players registered yet.'}
              </p>
              <p className="text-text-muted/60 text-sm mt-1">
                {search || selectedTenantFilter
                  ? 'Try adjusting your search or filter.'
                  : 'Players will appear here once they are created in their respective venues.'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-text-muted px-4">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
