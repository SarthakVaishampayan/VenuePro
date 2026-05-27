import { useState, useEffect } from 'react';
import { CreditCard, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { Card, CardHeader, StatCard } from '../../components/common/Card';
import { PageLoader } from '../../components/common/Loader';
import playerApi from '../../services/playerApi';

export default function PlayerPayments() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await playerApi.get('/payments');
      const paymentsData = data.data;
      setPayments(paymentsData?.data || paymentsData || []);
      setSummary({
        totalPaid: (paymentsData?.data || []).reduce((sum, p) => sum + (p.amount || 0), 0),
        totalTransactions: (paymentsData?.data || []).length,
        monthlyPaid: (paymentsData?.data || [])
          .filter(p => {
            const d = new Date(p.createdAt);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          })
          .reduce((sum, p) => sum + (p.amount || 0), 0)
      });
    } catch (err) {
      setError('Failed to load payments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">My Payments</h1>
        <p className="text-sm text-text-muted mt-1">Transaction history across all venues</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Paid" value={`₹${(summary.totalPaid || 0).toLocaleString()}`} icon={DollarSign} color="emerald" />
          <StatCard label="This Month" value={`₹${(summary.monthlyPaid || 0).toLocaleString()}`} icon={TrendingUp} color="violet" />
          <StatCard label="Transactions" value={summary.totalTransactions || 0} icon={CreditCard} color="cyan" />
        </div>
      )}

      {/* Payments History */}
      <Card>
        <CardHeader title="Payment History" subtitle={payments.length > 0 ? `${payments.length} transactions` : ''} />

        {payments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-violet-600 dark:text-violet-400" />
            </div>
            <p className="text-text-muted text-sm">No payments recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Date</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Venue</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Session</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Amount</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-surface-secondary/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text-primary whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">
                      {p.tenantId?.businessName || p.businessName || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {p.bookingSessionId?.resourceNameSnapshot || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary text-right font-medium">
                      ₹{p.amount?.toLocaleString() || 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {p.mode || 'cash'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
