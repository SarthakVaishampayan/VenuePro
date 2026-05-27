import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Download, Calendar, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import api from '../../services/api';
import { Card, CardHeader, StatCard } from '../../components/common/Card';
import { PageLoader } from '../../components/common/Loader';
import { StatusBadge } from '../../components/common/Badge';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';

export default function Revenue() {
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [period, setPeriod] = useState('monthly');

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/revenue');
      const revData = data.data;

      const chartData = (revData.monthlyTrend || []).map((item) => ({
        month: `${item.year}-${String(item.month).padStart(2, '0')}`,
        total: item.total,
        count: item.count
      }));

      setStats({
        mrr: revData.mrr || 0,
        arr: revData.arr || 0,
        totalCollected: revData.totalCollected || 0,
        thisMonthCollected: revData.thisMonth?.collected || 0,
        thisYearCollected: revData.thisYear?.collected || 0,
        totalTransactions: revData.totalTransactions || 0,
        paidInvoices: revData.thisYear?.transactions || 0,
        chartData
      });
    } catch (err) {
      console.error('Failed to load revenue data:', err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data } = await api.get('/revenue/invoices', { params: { page, limit: 15 } });
      setInvoices(data.data || []);
      setTotal(data.meta?.total || 0);
      setTotalPages(data.meta?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchInvoices()]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [page]);

  if (loading && !stats) return <PageLoader />;

  const chartData = stats?.chartData || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Revenue</h1>
          <p className="text-text-muted mt-1">Platform revenue analytics and invoice history</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={fetchAll} icon={RefreshCw}>Refresh</Button>
          <Button variant="secondary" icon={Download}>Export</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Monthly Recurring Revenue"
          value={`₹${(stats?.mrr || 0).toLocaleString()}`}
          icon={DollarSign}
          color="emerald"
          subtitle="From active subscriptions"
        />
        <StatCard
          label="Annual Run Rate"
          value={`₹${(stats?.arr || 0).toLocaleString()}`}
          icon={TrendingUp}
          color="primary"
          subtitle="MRR × 12"
        />
        <StatCard
          label="Total Collected"
          value={`₹${(stats?.totalCollected || 0).toLocaleString()}`}
          icon={CreditCard}
          color="violet"
          subtitle={`${stats?.paidInvoices || 0} paid invoices`}
        />
        <StatCard
          label="Pending / Overdue"
          value={`₹${(stats?.outstanding || 0).toLocaleString()}`}
          icon={TrendingDown}
          color="rose"
          subtitle={`${stats?.pendingInvoices || 0} unpaid invoices`}
        />
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader
          title="Revenue Trend"
          subtitle="Monthly collected revenue over time"
          action={
            <div className="flex items-center gap-1 bg-surface-secondary rounded-lg p-0.5">
              {['monthly', 'quarterly', 'yearly'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    period === p
                      ? 'bg-surface text-text-primary shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          }
        />
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="month" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} />
              <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false}              tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Invoice History */}
      <Card className="p-0 overflow-hidden">
        <div className="p-6 pb-4 border-b border-border">
          <CardHeader
            title="Invoice History"
            subtitle={`${total} total invoices`}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-secondary/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Period</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-muted">No invoices found</td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-surface-secondary/50 transition-colors">
                    <td className="px-6 py-3">
                      <span className="text-sm font-mono font-medium text-text-primary">{inv.invoiceNumber}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm text-text-primary">{inv.tenant?.businessName || '—'}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm font-medium text-text-primary">₹{(inv.amount || 0).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm text-text-muted">
                        {inv.periodStart ? new Date(inv.periodStart).toLocaleDateString() : '—'}
                        {' — '}
                        {inv.periodEnd ? new Date(inv.periodEnd).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-sm text-text-muted">
                        {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '—'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border">
            <div className="text-sm text-text-muted">Page {page} of {totalPages}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
