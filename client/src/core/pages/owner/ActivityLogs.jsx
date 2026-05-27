import { useState, useEffect } from 'react';
import ownerApi from '../../services/ownerApi';
import { Card, CardHeader } from '../../components/common/Card';
import Select from '../../components/common/Select';
import { PageLoader } from '../../components/common/Loader';
import { Activity, Filter, RefreshCw, User, Clock } from 'lucide-react';

const entityColors = {
  session: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  payment: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  customer: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400',
  resource: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  expense: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
  due: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  staff: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',
  branch: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
  setting: 'bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (entityFilter) params.entity = entityFilter;
      const { data } = await ownerApi.get('/activity-logs', { params });
      setLogs(data.data || []);
      setMeta(data.meta);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const { data } = await ownerApi.get('/activity-logs/stats');
      setStats(data.data);
    } catch {}
  };

  useEffect(() => { fetchStats(); }, []);

  useEffect(() => { fetchLogs(); }, [page, entityFilter]);

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading && logs.length === 0) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Activity Logs</h1>
          <p className="text-text-muted mt-1">Audit trail of all staff and system actions</p>
        </div>
        <button onClick={fetchLogs} className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-tertiary rounded-lg transition-colors">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
            <p className="text-xs text-text-muted">Total Actions</p>
          </Card>
          {stats.entityBreakdown?.slice(0, 3).map((e) => (
            <Card key={e._id}>
              <p className="text-2xl font-bold text-text-primary capitalize">{e.count}</p>
              <p className="text-xs text-text-muted capitalize">{e._id}s</p>
            </Card>
          ))}
        </div>
      )}

      {/* Daily activity chart */}
      {stats?.dailyActivity && (
        <Card>
          <CardHeader title="7-Day Activity" icon={Activity} />
          <div className="flex items-end gap-1 h-20">
            {stats.dailyActivity.map((d) => {
              const maxCount = Math.max(...stats.dailyActivity.map(x => x.count), 1);
              const height = (d.count / maxCount) * 100;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-text-muted">{d.count}</span>
                  <div className="w-full bg-emerald-100 dark:bg-emerald-900/30 rounded-t" style={{ height: `${Math.max(height, 2)}%` }} />
                  <span className="text-xs text-text-muted">{d.label.split(',')[0]}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-text-muted" />
        <div className="flex gap-2 flex-wrap">
          {['', 'session', 'payment', 'customer', 'resource', 'expense', 'due', 'staff', 'branch'].map((e) => (
            <button
              key={e}
              onClick={() => { setEntityFilter(e); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                entityFilter === e ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'text-text-muted hover:text-text-primary hover:bg-surface-tertiary'
              }`}
            >
              {e || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Logs */}
      <Card>
        <div className="-mx-6 -mt-6 -mb-6">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <Activity className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No activity logs yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map((log) => (
                <div key={log._id} className="flex items-start gap-3 px-6 py-3 hover:bg-surface-secondary/50 transition-colors">
                  <div className={`p-2 rounded-lg shrink-0 ${entityColors[log.entity] || 'bg-gray-50 text-gray-600'}`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{log.userName}</span>
                      <span className={`px-1.5 py-0.5 text-xs rounded-full capitalize ${
                        log.userRole === 'owner_admin' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                        log.userRole === 'manager' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                        'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {log.userRole.replace('_', ' ')}
                      </span>
                      <span className={`px-1.5 py-0.5 text-xs rounded-full capitalize ${entityColors[log.entity] || ''}`}>
                        {log.entity}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary mt-0.5">
                      <span className="font-medium capitalize">{log.action.replace('_', ' ')}</span>
                      {log.details && <span className="text-text-muted"> — {log.details}</span>}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatTime(log.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {meta && meta.pages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-text-muted">Page {meta.page} of {meta.pages} ({meta.total} total)</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm rounded-lg bg-surface-secondary text-text-primary disabled:opacity-50 hover:bg-surface-tertiary"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= meta.pages}
                className="px-3 py-1.5 text-sm rounded-lg bg-surface-secondary text-text-primary disabled:opacity-50 hover:bg-surface-tertiary"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
