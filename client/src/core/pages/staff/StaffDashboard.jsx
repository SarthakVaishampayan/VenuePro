import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, DollarSign } from 'lucide-react';
import { useStaffAuth } from '../../context/StaffAuthContext';
import staffApi from '../../services/staffApi';
import { Card, CardHeader, StatCard } from '../../components/common/Card';
import { PageLoader } from '../../components/common/Loader';

export default function StaffDashboard() {
  const { user } = useStaffAuth();
  const [stats, setStats] = useState(null);
  const [resourceTypes, setResourceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const permissions = user?.permissions || {};

  useEffect(() => {
    fetchDashboard();
    fetchResources();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data } = await staffApi.get('/dashboard');
      setStats(data.data.stats);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    try {
      const { data } = await staffApi.get('/resources');
      setResourceTypes(data.data || []);
    } catch {}
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Welcome, {user?.name || 'Staff'}!
        </h1>
        <p className="text-text-muted mt-1">
          {user?.role ? `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} · ` : ''}
          Quick overview of today's operations
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Sessions"
          value={stats?.activeSessions || 0}
          icon={Clock}
          color="amber"
          subtitle="Currently in progress"
        />
        <StatCard
          label="Resources Available"
          value={`${stats?.availableResources || 0}/${stats?.totalResources || 0}`}
          icon={Clock}
          color="emerald"
          subtitle="Available / Total"
        />
        <StatCard
          label="Today's Revenue"
          value={`₹${stats?.todayRevenue?.toLocaleString() || '0'}`}
          icon={DollarSign}
          color="emerald"
          subtitle="Collected today"
        />
        <StatCard
          label="Total Customers"
          value={stats?.totalCustomers || 0}
          icon={Users}
          color="violet"
          subtitle="Registered players"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader title="Quick Actions" subtitle="Common tasks" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {permissions.canManageSessions !== false && (
            <button
              onClick={() => navigate('/staff/sessions')}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all"
            >
              <Clock className="w-6 h-6 text-amber-500" />
              <span className="text-sm font-medium text-text-primary">Manage Sessions</span>
            </button>
          )}
          {permissions.canManageCustomers !== false && (
            <button
              onClick={() => navigate('/staff/customers')}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-all"
            >
              <Users className="w-6 h-6 text-violet-500" />
              <span className="text-sm font-medium text-text-primary">View Players</span>
            </button>
          )}
          {permissions.canManagePayments !== false && (
            <button
              onClick={() => navigate('/staff/payments')}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all"
            >
              <DollarSign className="w-6 h-6 text-emerald-500" />
              <span className="text-sm font-medium text-text-primary">Record Payment</span>
            </button>
          )}
        </div>
      </Card>

      {/* Resource List */}
      <Card>
        <CardHeader title="Resources" subtitle={`${resourceTypes.length} total resources`} />
        {resourceTypes.length === 0 ? (
          <p className="text-text-muted text-sm py-4 text-center">No resources configured.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {resourceTypes.map((r) => (
              <div
                key={r._id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  r.status === 'available'
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/10'
                    : r.status === 'occupied'
                    ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/20'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{r.name}</p>
                  <p className="text-xs text-text-muted">
                    {r.status === 'available' ? 'Available' : r.status === 'occupied' ? 'In Use' : r.status}
                  </p>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  r.status === 'available' ? 'bg-emerald-500' :
                  r.status === 'occupied' ? 'bg-amber-500' : 'bg-gray-400'
                }`} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
