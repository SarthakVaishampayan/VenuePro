import { useState, useEffect, useCallback } from 'react';
import ownerApi from '../../services/ownerApi';
import { Card, CardHeader } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import { PageLoader } from '../../components/common/Loader';

// Format date as YYYY-MM-DD using LOCAL time (avoid toISOString UTC conversion bug)
const fmtLocal = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [dailySummary, setDailySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Date filter — same system as Reports
  const [filter, setFilter] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Compute dateFrom/dateTo and a display label from the selected filter
  const getDateParams = useCallback(() => {
    const now = new Date();
    let params;
    switch (filter) {
      case 'today': {
        const d = fmtLocal(now);
        params = { dateFrom: d, dateTo: d };
        break;
      }
      case 'yesterday': {
        const d = new Date(now);
        d.setDate(d.getDate() - 1);
        params = { dateFrom: fmtLocal(d), dateTo: fmtLocal(d) };
        break;
      }
      case 'week': {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        params = { dateFrom: fmtLocal(start), dateTo: fmtLocal(end) };
        break;
      }
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        params = { dateFrom: fmtLocal(start), dateTo: fmtLocal(end) };
        break;
      }
      case 'custom':
        params = { dateFrom: customStart, dateTo: customEnd };
        break;
      default:
        params = {};
    }
    // Build a human-readable label
    let label;
    if (filter === 'today') label = 'Today';
    else if (filter === 'yesterday') label = 'Yesterday';
    else if (filter === 'week') label = 'This Week';
    else if (filter === 'month') label = 'This Month';
    else if (filter === 'all') label = 'All Time';
    else if (filter === 'custom' && params.dateFrom && params.dateTo) {
      if (params.dateFrom === params.dateTo) label = params.dateFrom;
      else label = `${params.dateFrom} — ${params.dateTo}`;
    } else label = '';
    return { ...params, label };
  }, [filter, customStart, customEnd]);

  const buildQuery = useCallback((p = 1) => {
    const params = new URLSearchParams({ page: p, limit: 20 });
    const { dateFrom, dateTo } = getDateParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    return params.toString();
  }, [getDateParams]);

  const fetchPayments = useCallback(async (p = 1) => {
    try {
      const { data } = await ownerApi.get(`/payments?${buildQuery(p)}`);
      setPayments(data.data || []);
      if (data.meta) {
        setTotalPages(data.meta.totalPages);
        setTotal(data.meta.total);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [buildQuery]);

  const fetchDailySummary = useCallback(async () => {
    try {
      // Daily summary respects the selected filter
      const params = new URLSearchParams();
      if (filter === 'all') {
        params.append('range', 'all');
      } else {
        const dates = getDateParams();
        if (dates.dateFrom) params.append('dateFrom', dates.dateFrom);
        if (dates.dateTo) params.append('dateTo', dates.dateTo);
      }
      const { data } = await ownerApi.get(`/payments/daily-summary?${params.toString()}`);
      // Round totals to fix floating point artifacts
      const d = data.data;
      if (d) {
        d.total = Math.round(d.total * 100) / 100;
        if (d.byMode) {
          Object.keys(d.byMode).forEach(k => { d.byMode[k] = Math.round(d.byMode[k] * 100) / 100; });
        }
      }
      setDailySummary(d);
    } catch (err) { console.error(err); }
  }, [filter, getDateParams]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPayments(1), fetchDailySummary()]);
  }, [filter, customStart, customEnd, fetchPayments, fetchDailySummary]);

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Payments</h1>
          <p className="text-text-muted mt-1">View payment history</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-36">
            <Select
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(1); }}
              options={[
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
                { value: 'custom', label: 'Custom Range' },
                { value: 'all', label: 'All Time' }
              ]}
            />
          </div>
          {filter === 'custom' && (
            <>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary" />
              <span className="text-text-muted">—</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1.5 text-sm bg-surface border border-border rounded-lg text-text-primary" />
            </>
          )}
        </div>
      </div>

      {/* Daily Summary */}
      {dailySummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <p className="text-sm text-text-muted">{getDateParams().label || 'Total'}</p>
            <p className="text-2xl font-bold text-text-primary">₹{dailySummary.total?.toLocaleString()}</p>
          </Card>
          <Card>
            <p className="text-sm text-text-muted">Transactions</p>
            <p className="text-2xl font-bold text-text-primary">{dailySummary.count}</p>
          </Card>
          <Card>
            <p className="text-sm text-text-muted">By Mode</p>
            <div className="mt-1 space-y-1">
              {Object.entries(dailySummary.byMode || {}).map(([m, amt]) => (
                <p key={m} className="text-sm text-text-primary capitalize">
                  {m}: ₹{amt.toLocaleString()}
                </p>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Payments List */}
      <Card>
        <CardHeader title="Payment History" subtitle={`${total} total payments`} />
        {payments.length === 0 ? (
          <p className="text-text-muted text-sm py-8 text-center">No payments recorded yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Customer</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Amount</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Mode</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Session</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-surface-secondary/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-text-primary">{p.customerId?.fullName || '—'}</td>
                      <td className="px-4 py-3 text-sm text-text-primary text-right font-medium">₹{Math.round(p.amount * 100) / 100}</td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-sm text-text-primary">{p.mode}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">{p.bookingSessionId?.resourceNameSnapshot || '—'}</td>
                      <td className="px-4 py-3 text-sm text-text-muted text-right">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-sm text-text-muted">Total: {total}</span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); fetchPayments(p); }}>
                    Previous
                  </Button>
                  <span className="text-sm text-text-muted self-center">Page {page} of {totalPages}</span>
                  <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); fetchPayments(p); }}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

    </div>
  );
}
