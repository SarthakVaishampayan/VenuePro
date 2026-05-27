import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, CreditCard, DollarSign, AlertTriangle,
  TrendingUp, Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../../services/api';
import { Card, CardHeader, StatCard } from '../../components/common/Card';
import { PageLoader } from '../../components/common/Loader';
import Badge from '../../components/common/Badge';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activityRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/recent-activity')
        ]);
        setStats(statsRes.data.data);
        setRecentActivity(activityRes.data.data);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          setLoadError('auth');
        } else {
          setLoadError('server');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <PageLoader />;

  if (!stats) {
    const isAuthError = loadError === 'auth';

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-muted mt-1">Platform overview and key metrics</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-1">Unable to load dashboard</h3>
          <p className="text-sm text-text-muted max-w-md mb-4">
            {isAuthError
              ? 'Your session may have expired. Please log in again.'
              : 'Unable to connect to the server. Make sure the backend is running on port 5000.'}
          </p>
          <button
            onClick={isAuthError
              ? () => window.location.href = '/superadmin/login'
              : () => window.location.reload()
            }
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            {isAuthError ? 'Go to Login' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  const { tenants, revenue, support } = stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-muted mt-1">Platform overview and key metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Tenants"
          value={tenants.total}
          icon={Building2}
          color="primary"
          subtitle={`${tenants.active} active, ${tenants.trialing} trialing`}
        />
        <StatCard
          label="Monthly Recurring Revenue"
          value={`₹${revenue.mrr.toLocaleString()}`}
          icon={DollarSign}
          color="emerald"
          subtitle={`ARR: ₹${revenue.arr.toLocaleString()}`}
        />
        <StatCard
          label="Collected This Month"
          value={`₹${revenue.thisMonth.toLocaleString()}`}
          icon={TrendingUp}
          color="violet"
          subtitle={`Total: ₹${revenue.total.toLocaleString()}`}
        />
        <StatCard
          label="Overdue Accounts"
          value={tenants.overdue}
          icon={AlertTriangle}
          color="rose"
          subtitle={`${support.open} open support tickets`}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader title="Revenue Trend" subtitle="Monthly collected revenue" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-text-muted)" fontSize={12} />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    color: 'var(--color-text-primary)'
                  }}
                />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Tenant Stats */}
        <Card>
          <CardHeader title="Tenant Overview" subtitle="Status distribution" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Active', value: tenants.active, color: '#10b981' },
                    { name: 'Trial', value: tenants.trialing, color: '#6366f1' },
                    { name: 'Overdue', value: tenants.overdue, color: '#f59e0b' },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {[{ name: 'Active', value: tenants.active }, { name: 'Trial', value: tenants.trialing }, { name: 'Overdue', value: tenants.overdue }].map((entry, i) => (
                    <Cell key={entry.name} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Tenants */}
      <Card>
        <CardHeader
          title="Recent Tenants"
          subtitle="Latest registered businesses"
          action={
            <button
              onClick={() => navigate('/superadmin/owners')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View all
            </button>
          }
        />
        <div className="space-y-3">
          {recentActivity?.recentTenants?.length > 0 ? (
            recentActivity.recentTenants.map((tenant) => (
              <div
                key={tenant._id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-secondary transition-colors cursor-pointer"
                onClick={() => navigate(`/superadmin/owner/${tenant._id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{tenant.businessName}</p>
                    <p className="text-xs text-text-muted">{tenant.ownerName} · {tenant.tenantCode}</p>
                  </div>
                </div>
                <span className="text-xs text-text-muted">
                  {new Date(tenant.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-text-muted text-center py-4">No tenants yet</p>
          )}
        </div>
      </Card>
    </div>
  );
}
