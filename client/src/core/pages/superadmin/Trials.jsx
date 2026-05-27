import { useState, useEffect, useCallback } from 'react';
import { Clock, Calendar, DollarSign, TrendingUp, Users, RefreshCw, Search } from 'lucide-react';
import api from '../../services/api';
import DataTable from '../../components/common/DataTable';
import Button from '../../components/common/Button';
import { Card, CardHeader, StatCard } from '../../components/common/Card';
import { PageLoader } from '../../components/common/Loader';
import { StatusBadge } from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';

export default function Trials() {
  const [trials, setTrials] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [extendModal, setExtendModal] = useState(null);
  const [convertModal, setConvertModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Extend form
  const [extendDays, setExtendDays] = useState(7);
  const [extendReason, setExtendReason] = useState('');

  // Convert form
  const [convertPlan, setConvertPlan] = useState('starter');
  const [convertCycle, setConvertCycle] = useState('monthly');
  const [convertDiscount, setConvertDiscount] = useState(0);

  const fetchTrials = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (expiringOnly) params.expiringSoon = 'true';

      const { data } = await api.get('/trials', { params });
      setTrials(data.data);
      setTotal(data.meta?.total || 0);
      setTotalPages(data.meta?.totalPages || 1);
    } catch (err) {
      console.error('Failed to load trials:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, expiringOnly]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/trials/stats');
      setStats(data.data);
    } catch (err) {
      console.error('Failed to load trial stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchTrials();
    fetchStats();
  }, [fetchTrials, fetchStats]);

  const handleExtend = async () => {
    setActionLoading(true);
    try {
      await api.post(`/trials/${extendModal._id}/extend`, {
        days: extendDays,
        reason: extendReason
      });
      setExtendModal(null);
      setExtendDays(7);
      setExtendReason('');
      fetchTrials();
      fetchStats();
    } catch (err) {
      console.error('Extend failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvert = async () => {
    setActionLoading(true);
    try {
      await api.post(`/trials/${convertModal._id}/convert`, {
        planKey: convertPlan,
        billingCycle: convertCycle,
        discountPercent: convertDiscount
      });
      setConvertModal(null);
      setConvertPlan('starter');
      setConvertCycle('monthly');
      setConvertDiscount(0);
      fetchTrials();
      fetchStats();
    } catch (err) {
      console.error('Convert failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      key: 'tenant',
      label: 'Business',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">{row.tenant?.businessName}</p>
            <p className="text-xs text-text-muted">{row.tenant?.ownerName} · {row.tenant?.tenantCode}</p>
          </div>
        </div>
      )
    },
    {
      key: 'plan',
      label: 'Plan',
      render: (row) => (
        <span className="text-sm capitalize text-text-primary">{row.plan?.key || '—'}</span>
      )
    },
    {
      key: 'daysRemaining',
      label: 'Days Left',
      render: (row) => (
        <span className={`text-sm font-medium ${
          row.daysRemaining <= 0 ? 'text-red-600' :
          row.daysRemaining <= 3 ? 'text-amber-600' :
          'text-emerald-600'
        }`}>
          {row.daysRemaining > 0 ? `${row.daysRemaining}d` : 'Expired'}
        </span>
      )
    },
    {
      key: 'trialEndDate',
      label: 'Ends',
      render: (row) => (
        <span className="text-sm text-text-muted">
          {row.trialEndDate ? new Date(row.trialEndDate).toLocaleDateString() : '—'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        row.isExpired
          ? <StatusBadge status="expired" />
          : row.isExpiringSoon
            ? <StatusBadge status="overdue" />
            : <StatusBadge status="trialing" />
      )
    },
    {
      key: 'actions',
      label: '',
      width: '200px',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { setExtendModal(row); setExtendDays(7); setExtendReason(''); }}
          >
            Extend
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={() => { setConvertModal(row); }}
          >
            Convert
          </Button>
        </div>
      )
    }
  ];

  if (loading && !trials.length) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Trial Management</h1>
          <p className="text-text-muted mt-1">Manage trial subscriptions and convert to paid plans</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => { fetchTrials(); fetchStats(); }} icon={RefreshCw}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Trials"
            value={stats.totalTrials}
            icon={Clock}
            color="primary"
          />
          <StatCard
            label="Expiring Soon (3d)"
            value={stats.expiringSoon}
            icon={Calendar}
            color="amber"
          />
          <StatCard
            label="Expired"
            value={stats.expired}
            icon={TrendingUp}
            color="red"
            trend={stats.expired > 0 ? -stats.conversionRate : 0}
          />
          <StatCard
            label="Conversion Rate"
            value={`${stats.conversionRate}%`}
            icon={DollarSign}
            color="emerald"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by business, owner, or email..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary placeholder:text-text-muted"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
          <input
            type="checkbox"
            checked={expiringOnly}
            onChange={(e) => { setExpiringOnly(e.target.checked); setPage(1); }}
            className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
          />
          Expiring soon only
        </label>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={trials}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
        emptyMessage="No active trials found."
      />

      {/* Extend Trial Modal */}
      <Modal open={!!extendModal} onClose={() => setExtendModal(null)} title="Extend Trial">
        <div className="space-y-4">
          {extendModal && (
            <div className="p-3 bg-surface-secondary rounded-lg">
              <p className="text-sm font-medium text-text-primary">{extendModal.tenant?.businessName}</p>
              <p className="text-xs text-text-muted">
                Current end: {extendModal.trialEndDate ? new Date(extendModal.trialEndDate).toLocaleDateString() : '—'}
                {' · '}Plan: {extendModal.plan?.key || '—'}
              </p>
            </div>
          )}
          <Input
            label="Additional Days"
            type="number"
            min={1}
            max={90}
            value={extendDays}
            onChange={(e) => setExtendDays(parseInt(e.target.value) || 7)}
            required
          />
          <Input
            label="Reason (optional)"
            value={extendReason}
            onChange={(e) => setExtendReason(e.target.value)}
            placeholder="Why are you extending this trial?"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setExtendModal(null)}>Cancel</Button>
            <Button loading={actionLoading} onClick={handleExtend}>
              Extend by {extendDays} days
            </Button>
          </div>
        </div>
      </Modal>

      {/* Convert to Paid Modal */}
      <Modal open={!!convertModal} onClose={() => setConvertModal(null)} title="Convert to Paid Plan">
        <div className="space-y-4">
          {convertModal && (
            <div className="p-3 bg-surface-secondary rounded-lg">
              <p className="text-sm font-medium text-text-primary">{convertModal.tenant?.businessName}</p>
              <p className="text-xs text-text-muted">
                Trial ends: {convertModal.trialEndDate ? new Date(convertModal.trialEndDate).toLocaleDateString() : '—'}
                {' · '}Owner: {convertModal.tenant?.ownerName}
              </p>
            </div>
          )}
          <Select
            label="Plan"
            value={convertPlan}
            onChange={(e) => setConvertPlan(e.target.value)}
            options={[
              { value: 'starter', label: 'Starter' },
              { value: 'professional', label: 'Professional' },
              { value: 'enterprise', label: 'Enterprise' }
            ]}
            required
          />
          <Select
            label="Billing Cycle"
            value={convertCycle}
            onChange={(e) => setConvertCycle(e.target.value)}
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'yearly', label: 'Yearly' }
            ]}
            required
          />
          <Input
            label="Discount (%)"
            type="number"
            min={0}
            max={100}
            value={convertDiscount}
            onChange={(e) => setConvertDiscount(parseInt(e.target.value) || 0)}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setConvertModal(null)}>Cancel</Button>
            <Button variant="success" loading={actionLoading} onClick={handleConvert}>
              Convert to {convertPlan.charAt(0).toUpperCase() + convertPlan.slice(1)}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
