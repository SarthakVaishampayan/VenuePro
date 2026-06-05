import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Building2 } from 'lucide-react';
import { Card, CardHeader, StatCard } from '../../components/common/Card';
import { PageLoader } from '../../components/common/Loader';
import playerApi from '../../services/playerApi';

const statusColors = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  partial: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  waived: 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
};

export default function PlayerDues() {
  const [dues, setDues] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  useEffect(() => {
    loadDues();
  }, [statusFilter]);

  const loadDues = async () => {
    setLoading(true);
    setError('');
    try {
      const status = statusFilter === 'all' ? '' : statusFilter;
      const { data } = await playerApi.get(`/dues${status ? `?status=${status}` : ''}`);
      const duesData = data.data;
      setDues(duesData?.data || duesData || []);
      setSummary({
        totalDue: (duesData || []).filter(d => d.status === 'pending' || d.status === 'partial').reduce((sum, d) => sum + (d.amount - d.paidAmount), 0)
      });
    } catch (err) {
      setError('Failed to load dues. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">My Dues</h1>
        <p className="text-sm text-text-muted mt-1">Track your pending and completed payments</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4">
          <StatCard label="Total Due" value={`₹${(summary.totalDue || 0).toLocaleString()}`} icon={AlertCircle} color="amber" />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['active', 'paid', 'waived', 'all'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
              statusFilter === status
                ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-tertiary'
            }`}
          >
            {status === 'all' ? 'All' : status}
          </button>
        ))}
      </div>

      {/* Dues list */}
      {dues.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">All clear!</h3>
          <p className="text-sm text-text-muted">You have no {statusFilter === 'active' ? 'pending' : ''} dues.</p>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Venue</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Session</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Total</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Paid</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Remaining</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Status</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dues.map((d) => {
                  const remaining = d.amount - d.paidAmount;
                  return (
                    <tr key={d._id} className="hover:bg-surface-secondary/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-text-primary">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-text-muted" />
                          {d.tenantId?.businessName || d.businessName || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {d.bookingSessionId?.resourceNameSnapshot || 'Session'}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary text-right font-medium">
                        ₹{d.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted text-right">
                        ₹{d.paidAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        <span className={remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600'}>
                          ₹{remaining.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[d.status] || ''}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted whitespace-nowrap">
                        {new Date(d.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
