import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, TrendingUp, CreditCard, AlertTriangle, Activity,
  Search, RefreshCw, Filter, MoreHorizontal, Plus, RotateCcw,
  Ban, CheckCircle, Clock, Send, FileText
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../../services/api';
import { Card, CardHeader, StatCard } from '../../components/common/Card';
import { PageLoader } from '../../components/common/Loader';
import { StatusBadge } from '../../components/common/Badge';
import Button from '../../components/common/Button';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import RecordPaymentModal from '../../components/common/RecordPaymentModal';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#6b7280', '#8b5cf6'];
const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'trialing', label: 'Trial' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' }
];

/** Calculate days remaining until next billing (positive = remaining, negative = overdue) */
function getDaysInfo(sub) {
  if (!sub.currentPeriodEnd) return null;
  const now = new Date();
  const end = new Date(sub.currentPeriodEnd);
  const diffMs = end.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return days;
}

/** Colored badge showing days remaining or overdue */
function DaysBadge({ days, status }) {
  if (days === null || days === undefined) return <span className="text-sm text-text-muted">—</span>;

  // Expired/cancelled/suspended — show status, not days
  if (['expired', 'cancelled', 'suspended'].includes(status)) {
    return <span className="text-sm text-text-muted">—</span>;
  }

  if (days <= 0) {
    // Overdue
    const overdueDays = Math.abs(days);
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 ring-1 ring-inset ring-red-600/20">
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {overdueDays === 0 ? 'Due today' : `${overdueDays}d overdue`}
      </span>
    );
  }

  if (days <= 3) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 ring-1 ring-inset ring-red-600/20">
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {days}d remaining
      </span>
    );
  }

  if (days <= 15) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 ring-1 ring-inset ring-amber-600/20">
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {days}d remaining
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/20">
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {days}d remaining
    </span>
  );
}

export default function Subscriptions() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTenantId, setPaymentTenantId] = useState(null);
  const [statusModal, setStatusModal] = useState({ open: false, sub: null });
  const [statusForm, setStatusForm] = useState({ status: '', reason: '' });
  const [statusSaving, setStatusSaving] = useState(false);
  const [detailModal, setDetailModal] = useState({ open: false, sub: null, loading: false, detail: null });

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/subscriptions/stats');
      setStats(data.data);
    } catch (err) {
      console.error('Failed to load subscription stats:', err);
    }
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/subscriptions', { params });
      setSubscriptions(data.data || []);
      setTotal(data.meta?.total || 0);
      setTotalPages(data.meta?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  const handleRefresh = () => {
    fetchStats();
    fetchSubscriptions();
  };

  const handleOpenStatusModal = (sub) => {
    setStatusModal({ open: true, sub });
    setStatusForm({ status: sub.status || 'active', reason: '' });
  };

  const handleChangeStatus = async () => {
    if (!statusForm.status || !statusModal.sub) return;
    setStatusSaving(true);
    try {
      await api.patch(`/subscriptions/${statusModal.sub._id}/status`, {
        status: statusForm.status,
        reason: statusForm.reason || undefined
      });
      setStatusModal({ open: false, sub: null });
      handleRefresh();
    } catch (err) {
      console.error('Failed to change status:', err);
    } finally {
      setStatusSaving(false);
    }
  };

  const handleOpenDetail = async (sub) => {
    setDetailModal({ open: true, sub, loading: true, detail: null });
    try {
      const { data } = await api.get(`/subscriptions/${sub._id}`);
      setDetailModal(prev => ({ ...prev, loading: false, detail: data.data }));
    } catch (err) {
      console.error('Failed to load subscription detail:', err);
      setDetailModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSendReminder = async (sub) => {
    try {
      await api.post(`/subscriptions/${sub._id}/send-reminder`);
      alert('Reminder sent successfully!');
    } catch (err) {
      console.error('Failed to send reminder:', err);
    }
  };

  const chartData = stats?.statusBreakdown?.map(s => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count,
    color: COLORS[['active', 'trialing', 'overdue', 'suspended', 'expired', 'cancelled'].indexOf(s.status)] || '#6b7280'
  })) || [];

  const columns = [
    {
      key: 'tenant',
      label: 'Business',
      render: (row) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/superadmin/owner/${row.tenant?._id}`)}
            className="text-sm font-medium text-text-primary hover:text-primary-600 transition-colors"
          >
            {row.tenant?.businessName || '—'}
          </button>
        </div>
      )
    },
    {
      key: 'planSnapshot',
      label: 'Plan',
      render: (row) => (
        <span className="text-sm capitalize text-text-primary">{row.planSnapshot?.key || row.plan?.key || '—'}</span>
      )
    },
    {
      key: 'billingCycle',
      label: 'Cycle',
      render: (row) => (
        <span className="text-sm text-text-muted capitalize">{row.billingCycle || '—'}</span>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (row) => (
        <span className="text-sm font-medium text-text-primary">₹{(row.amount || 0).toLocaleString()}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      key: 'currentPeriodEnd',
      label: 'Next Billing',
      render: (row) => {
        const days = getDaysInfo(row);
        return (
          <div className="flex flex-col gap-0.5">
            <DaysBadge days={days} status={row.status} />
            {row.currentPeriodEnd && (
              <span className="text-[10px] text-text-muted">
                {new Date(row.currentPeriodEnd).toLocaleDateString()}
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'paymentCount',
      label: 'Payments',
      render: (row) => (
        <span className="text-sm text-text-muted">{row.paymentCount || 0}</span>
      )
    },
    {
      key: 'actions',
      label: '',
      width: '120px',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOpenDetail(row)}
            className="p-1.5 rounded text-text-muted hover:text-primary-600 hover:bg-surface-tertiary transition-colors"
            title="View details"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {row.status === 'overdue' && (
            <button
              onClick={() => handleSendReminder(row)}
              className="p-1.5 rounded text-text-muted hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              title="Send reminder"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleOpenStatusModal(row)}
            className="p-1.5 rounded text-text-muted hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
            title="Change status"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Subscriptions</h1>
          <p className="text-text-muted mt-1">Manage tenant subscription billing and status</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleRefresh} icon={RefreshCw}>Refresh</Button>
          <Button onClick={() => setShowPaymentModal(true)} icon={Plus}>Record Payment</Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Monthly Recurring Revenue"
          value={`₹${(stats?.mrr || 0).toLocaleString()}`}
          icon={DollarSign}
          color="emerald"
          subtitle={`ARR: ₹${(stats?.arr || 0).toLocaleString()}`}
        />
        <StatCard
          label="Active Paying"
          value={stats?.totalPaying || 0}
          icon={Activity}
          color="primary"
          subtitle={`${stats?.activeTrialing || 0} active + trialing`}
        />
        <StatCard
          label="Total Subscriptions"
          value={stats?.totalSubscriptions || 0}
          icon={CreditCard}
          color="violet"
        />
        <StatCard
          label="Overdue"
          value={stats?.overdue || 0}
          icon={AlertTriangle}
          color="amber"
          subtitle="Need attention"
        />
        <StatCard
          label="Total Collected"
          value={`₹${(stats?.totalCollected || 0).toLocaleString()}`}
          icon={TrendingUp}
          color="cyan"
          subtitle="All time"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Status Distribution" subtitle="Subscription status breakdown" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)'
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={entry.name} fill={entry.color || COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Quick Actions" />
          <div className="space-y-2">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-text-primary hover:bg-surface-secondary transition-colors"
            >
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <span>Record Payment</span>
            </button>
            <button
              onClick={() => { setSearch(''); setStatusFilter('overdue'); setPage(1); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-text-primary hover:bg-surface-secondary transition-colors"
            >
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <span>View Overdue ({stats?.overdue || 0})</span>
            </button>
            <button
              onClick={() => navigate('/superadmin/revenue')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-text-primary hover:bg-surface-secondary transition-colors"
            >
              <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20">
                <TrendingUp className="w-4 h-4 text-violet-600" />
              </div>
              <span>Revenue Report</span>
            </button>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by business, owner, or code..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary placeholder:text-text-muted"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Subscriptions Table */}
      <DataTable
        columns={columns}
        data={subscriptions}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        pageSize={20}
        emptyMessage="No subscriptions found."
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        open={showPaymentModal}
        onClose={() => { setShowPaymentModal(false); setPaymentTenantId(null); }}
        onSuccess={() => { setPaymentTenantId(null); handleRefresh(); }}
        tenantId={paymentTenantId}
      />

      {/* Change Status Modal */}
      <Modal
        open={statusModal.open}
        onClose={() => setStatusModal({ open: false, sub: null })}
        title="Change Subscription Status"
        size="sm"
      >
        <div className="space-y-4">
          {statusModal.sub && (
            <div className="p-3 rounded-lg bg-surface-secondary">
              <p className="text-sm font-medium text-text-primary">{statusModal.sub.tenant?.businessName}</p>
              <p className="text-xs text-text-muted">Current: <StatusBadge status={statusModal.sub.status} /></p>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">New Status</label>
            <select
              value={statusForm.status}
              onChange={(e) => setStatusForm(f => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary"
            >
              {STATUS_OPTIONS.filter(o => o.value).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Reason (optional)</label>
            <textarea
              value={statusForm.reason}
              onChange={(e) => setStatusForm(f => ({ ...f, reason: e.target.value }))}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary"
              rows={2}
              placeholder="Reason for status change..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setStatusModal({ open: false, sub: null })}>Cancel</Button>
            <Button onClick={handleChangeStatus} loading={statusSaving} icon={CheckCircle}>
              Change to {statusForm.status}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Subscription Detail Modal */}
      <Modal
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, sub: null, loading: false, detail: null })}
        title="Subscription Details"
        size="xl"
      >
        {detailModal.loading ? (
          <PageLoader />
        ) : detailModal.detail ? (
          <div className="space-y-6">
            {/* Info row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-text-muted">Plan</p>
                <p className="text-sm font-medium text-text-primary capitalize">{detailModal.detail.planSnapshot?.key || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Status</p>
                <StatusBadge status={detailModal.detail.status} />
              </div>
              <div>
                <p className="text-xs text-text-muted">{detailModal.detail.status === 'trialing' ? 'Trial Expires' : 'Amount'}</p>
                {detailModal.detail.status === 'trialing' ? (
                  <p className="text-sm font-medium text-text-primary">
                    {detailModal.detail.trialEndDate ? new Date(detailModal.detail.trialEndDate).toLocaleDateString() : (detailModal.detail.currentPeriodEnd ? new Date(detailModal.detail.currentPeriodEnd).toLocaleDateString() : '—')}
                  </p>
                ) : (
                  <p className="text-sm font-medium text-text-primary">₹{(detailModal.detail.amount || 0).toLocaleString()}/{detailModal.detail.billingCycle || 'mo'}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-text-muted">{detailModal.detail.status === 'trialing' ? 'Days Left' : 'Payments'}</p>
                {detailModal.detail.status === 'trialing' ? (() => {
                  const endDate = detailModal.detail.trialEndDate || detailModal.detail.currentPeriodEnd;
                  if (!endDate) return <p className="text-sm text-text-primary">—</p>;
                  const days = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
                  const color = days <= 3 ? 'text-red-600' : days <= 15 ? 'text-amber-600' : 'text-emerald-600';
                  return <p className={`text-sm font-bold ${color}`}>{days <= 0 ? 'Expired' : `${days} days`}</p>;
                })() : (
                  <p className="text-sm font-medium text-text-primary">{detailModal.detail.paymentCount || 0} (₹{(detailModal.detail.totalPaid || 0).toLocaleString()})</p>
                )}
              </div>
            </div>

            {/* Period info */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-surface-secondary">
              <div>
                <p className="text-xs text-text-muted">Current Period Start</p>
                <p className="text-sm text-text-primary">{detailModal.detail.currentPeriodStart ? new Date(detailModal.detail.currentPeriodStart).toLocaleDateString() : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Current Period End</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-text-primary">{detailModal.detail.currentPeriodEnd ? new Date(detailModal.detail.currentPeriodEnd).toLocaleDateString() : '—'}</p>
                  {detailModal.detail.currentPeriodEnd && (
                    <DaysBadge days={getDaysInfo(detailModal.detail)} status={detailModal.detail.status} />
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-text-muted">Last Payment Date</p>
                <p className="text-sm text-text-primary">{detailModal.detail.lastPaymentDate ? new Date(detailModal.detail.lastPaymentDate).toLocaleDateString() : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Last Payment Amount</p>
                <p className="text-sm text-text-primary">₹{(detailModal.detail.lastPaymentAmount || 0).toLocaleString()}</p>
              </div>
            </div>

            {/* Overdue info if applicable */}
            {(detailModal.detail.status === 'overdue' || detailModal.detail.status === 'suspended') && (
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2">Overdue Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-amber-700 dark:text-amber-400">Overdue Since: </span>
                    <span className="text-amber-800 dark:text-amber-300">{detailModal.detail.overdueSince ? new Date(detailModal.detail.overdueSince).toLocaleDateString() : '—'}</span>
                  </div>
                  <div>
                    <span className="text-amber-700 dark:text-amber-400">Overdue Amount: </span>
                    <span className="text-amber-800 dark:text-amber-300">₹{(detailModal.detail.overdueAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Invoice History */}
            <div>
              <h4 className="text-sm font-semibold text-text-primary mb-3">Invoices ({detailModal.detail.invoiceStats?.count || 0})</h4>
              {detailModal.detail.invoices?.length > 0 ? (
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-surface-secondary/50 border-b border-border">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted uppercase">Invoice</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted uppercase">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-text-muted uppercase">Paid At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {detailModal.detail.invoices.map((inv) => (
                        <tr key={inv._id} className="hover:bg-surface-secondary/50 transition-colors">
                          <td className="px-4 py-2 text-sm font-mono text-text-primary">{inv.invoiceNumber}</td>
                          <td className="px-4 py-2 text-sm font-medium text-text-primary">₹{(inv.totalAmount || 0).toLocaleString()}</td>
                          <td className="px-4 py-2"><StatusBadge status={inv.paymentStatus} /></td>
                          <td className="px-4 py-2 text-sm text-text-muted">{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-text-muted">No invoices yet.</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => { setDetailModal({ open: false, sub: null, loading: false, detail: null }); handleOpenStatusModal(detailModal.detail); }}
                variant="secondary"
                icon={Ban}
              >
                Change Status
              </Button>
              {detailModal.detail.status === 'trialing' && (
                <Button variant="primary" icon={DollarSign}
                  onClick={() => {
                    const tid = detailModal.detail.tenantId?._id || detailModal.detail.tenant?._id;
                    setPaymentTenantId(tid);
                    setDetailModal({ open: false, sub: null, loading: false, detail: null });
                    setShowPaymentModal(true);
                  }}
                >
                  Record Payment (Convert Trial)
                </Button>
              )}
              {(detailModal.detail.status === 'overdue' || detailModal.detail.status === 'suspended') && (
                <Button variant="secondary" icon={RotateCcw}
                  onClick={async () => {
                    try {
                      await api.post(`/subscriptions/${detailModal.detail._id}/renew`, {});
                      alert('Subscription renewed!');
                      setDetailModal({ open: false, sub: null, loading: false, detail: null });
                      handleRefresh();
                    } catch (err) { console.error(err); }
                  }}
                >
                  Renew & Activate
                </Button>
              )}
              <Button variant="secondary" icon={FileText}
                onClick={async () => {
                  try {
                    await api.post(`/subscriptions/${detailModal.detail._id}/generate-invoice`, {});
                    alert('Invoice generated!');
                    handleRefresh();
                    const { data } = await api.get(`/subscriptions/${detailModal.detail._id}`);
                    setDetailModal(prev => ({ ...prev, detail: data.data }));
                  } catch (err) { console.error(err); }
                }}
              >
                Generate Invoice
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted py-4">Failed to load subscription details.</p>
        )}
      </Modal>
    </div>
  );
}
