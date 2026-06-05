import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Table2, DollarSign, Wallet, TrendingUp, Receipt, Sparkles, RotateCcw } from 'lucide-react';
import { useOwnerAuth } from '../../context/OwnerAuthContext';
import ownerApi from '../../services/ownerApi';
import { Card, CardHeader, StatCard } from '../../components/common/Card';
import { PageLoader } from '../../components/common/Loader';
import TrialBanner from '../../components/common/TrialBanner';
import FirstLoginWelcome from '../../components/common/FirstLoginWelcome';
import DemoTour from '../../components/common/DemoTour';
import publicApi from '../../services/publicApi';

export default function OwnerDashboard() {
  const { user } = useOwnerAuth();
  const [stats, setStats] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(() => {
    // Check context first — if backend says it's not first login, don't show
    if (user?.firstLogin !== true) return false;
    // Fallback: if localStorage was already updated (e.g. after password change),
    // don't show the wizard even if context is still stale
    try {
      const saved = localStorage.getItem('ownerUser');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.firstLogin === false) return false;
      }
    } catch {}
    return true;
  });
  const [showDemoTour, setShowDemoTour] = useState(() => {
    // Show demo tour once per browser (uses persistent localStorage flag)
    // This avoids issues with backend firstLogin being reset on refresh
    if (user?.isDemo === true && !localStorage.getItem('demoTourCompleted')) return true;
    return false;
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data } = await ownerApi.get('/dashboard');
      setStats(data.data.stats);
      setRecentSessions(data.data.recentSessions || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoTourComplete = useCallback(() => {
    setShowDemoTour(false);
    // Persist completion to localStorage so tour never shows again, even on refresh
    localStorage.setItem('demoTourCompleted', 'true');
  }, []);

  const [demoResetLoading, setDemoResetLoading] = useState(false);
  const [demoResetError, setDemoResetError] = useState('');

  const handleResetDemo = useCallback(async () => {
    if (!window.confirm('Reset all demo data? This will restore fresh sample data and clear all current data.')) return;
    setDemoResetLoading(true);
    setDemoResetError('');
    try {
      const res = await publicApi.post('/demo/reset', {
        tenantId: user?.tenantId,
        businessTypeKey: user?.businessType,
      });
      // Refresh dashboard to show fresh data
      fetchDashboard();
    } catch (err) {
      setDemoResetError(err.response?.data?.message || 'Failed to reset demo data.');
    } finally {
      setDemoResetLoading(false);
    }
  }, [user, fetchDashboard]);

  const handleDemoTourNavigate = useCallback((path) => {
    navigate(path);
  }, [navigate]);

  if (loading) return <PageLoader />;

  // Demo tour for demo users
  if (showDemoTour) {
    return <DemoTour onComplete={handleDemoTourComplete} onNavigate={handleDemoTourNavigate} />;
  }

  // First login welcome wizard
  if (showWelcome) {
    return <FirstLoginWelcome onComplete={() => setShowWelcome(false)} />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Trial Banner */}
      <TrialBanner />

      {/* Demo Banner */}
      {user?.isDemo === true && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg">
          <div className="flex items-start sm:items-center gap-3 flex-col sm:flex-row">
            <div className="p-2 rounded-lg bg-white/20 flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">
                🎯 You're exploring a demo — data resets automatically in 24 hours
              </p>
              <p className="text-xs text-indigo-100 mt-0.5">
                Pre-loaded with sample data. No credit card required.{' '}
                <button
                  onClick={() => navigate('/signup')}
                  className="underline font-medium hover:text-white transition-colors"
                >
                  Sign up free to save your work
                </button>
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2 mt-2 sm:mt-0">
              {demoResetError && (
                <p className="text-xs text-red-200">{demoResetError}</p>
              )}
              <button
                onClick={handleResetDemo}
                disabled={demoResetLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white/20 hover:bg-white/30 rounded-lg transition-all disabled:opacity-50"
              >
                {demoResetLoading ? (
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <RotateCcw className="w-3 h-3" />
                )}
                {demoResetLoading ? 'Resetting...' : 'Reset Demo Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-muted mt-1">Overview of your venue's performance today</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Sessions"
          value={stats?.activeSessions || 0}
          icon={Clock}
          color="primary"
          subtitle="Currently in progress"
          trend={0}
        />
        <StatCard
          label="Resources"
          value={`${stats?.availableResources || 0}/${stats?.totalResources || 0}`}
          icon={Table2}
          color="emerald"
          subtitle="Available / Total"
        />
        <StatCard
          label="Today's Revenue"
          value={`₹${stats?.todayRevenue?.toLocaleString() || '0'}`}
          icon={DollarSign}
          color="amber"
          subtitle={`Profit: ₹${stats?.todayProfit?.toLocaleString() || '0'}`}
        />
        <StatCard
          label="Pending Dues"
          value={`₹${stats?.totalPendingDues?.toLocaleString() || '0'}`}
          icon={Wallet}
          color="rose"
          subtitle="Awaiting collection"
        />
      </div>

      {/* Secondary KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">Completed Sessions</p>
              <p className="text-xl font-bold text-text-primary">{stats?.completedSessions || 0}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-muted">Today's Expenses</p>
              <p className="text-xl font-bold text-text-primary">₹{stats?.todayExpenses?.toLocaleString() || '0'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader
          title="Recent Sessions"
          subtitle="Latest 10 sessions"
          action={
            <button
              onClick={() => navigate('/owner/sessions')}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              View All
            </button>
          }
        />
        {recentSessions.length === 0 ? (
          <p className="text-text-muted text-sm py-4 text-center">No sessions yet. Start your first session!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Resource</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Customer</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Status</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Amount</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentSessions.map((s) => (
                  <tr key={s._id} className="hover:bg-surface-secondary/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-text-primary">{s.resourceName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-primary">{s.customerName || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.status === 'completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                        s.status === 'in_progress' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                        s.status === 'cancelled' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                        'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {s.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary text-right">
                      {s.amount ? `₹${s.amount}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted text-right">
                      {s.createdAt ? new Date(s.createdAt).toLocaleTimeString() : '—'}
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
