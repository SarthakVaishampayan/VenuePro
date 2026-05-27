import { useState, useEffect } from 'react';
import ownerApi from '../../services/ownerApi';
import { Card, CardHeader } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import { PageLoader } from '../../components/common/Loader';
import {
  TrendingUp, TrendingDown, PieChart, BarChart3, DollarSign, Receipt,
  Users, Clock, Target, Download, Calendar, Building2, Activity
} from 'lucide-react';

export default function Reports() {
  const [filter, setFilter] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Standard reports
  const [revenue, setRevenue] = useState(null);
  const [profitLoss, setProfitLoss] = useState(null);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [paymentSplit, setPaymentSplit] = useState(null);
  const [resourceUsage, setResourceUsage] = useState(null);
  const [expenseBreakdown, setExpenseBreakdown] = useState(null);

  // Advanced analytics (Phase 11)
  const [clvData, setClvData] = useState([]);
  const [peakHours, setPeakHours] = useState(null);
  const [branchPL, setBranchPL] = useState(null);
  const [staffPerf, setStaffPerf] = useState([]);
  const [customRange, setCustomRange] = useState(null);
  const [heatmap, setHeatmap] = useState([]);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Standard reports always
      const promises = [
        ownerApi.get(`/reports/revenue?filter=${filter}`),
        ownerApi.get(`/reports/profit-loss?filter=${filter}`),
        ownerApi.get('/reports/revenue-trend?period=daily&count=7'),
        ownerApi.get('/reports/payment-split'),
        ownerApi.get('/reports/resource-usage'),
        ownerApi.get('/reports/expense-breakdown')
      ];

      // Advanced analytics based on active tab
      if (activeTab === 'customers') {
        promises.push(ownerApi.get('/analytics/customer-lifetime-value?limit=10'));
      }
      if (activeTab === 'hours') {
        promises.push(ownerApi.get('/analytics/peak-hours'));
      }
      if (activeTab === 'branches') {
        const dateParam = filter !== 'custom' ? `?dateFrom=${getDateFrom(filter)}` :
          `?dateFrom=${customStart}&dateTo=${customEnd}`;
        promises.push(ownerApi.get(`/analytics/profit-loss-by-branch${dateParam}`));
      }
      if (activeTab === 'staff') {
        const dateParam = filter !== 'custom' ? `?dateFrom=${getDateFrom(filter)}` :
          `?dateFrom=${customStart}&dateTo=${customEnd}`;
        promises.push(ownerApi.get(`/analytics/staff-performance${dateParam}`));
      }
      if (activeTab === 'overview' && filter === 'custom' && customStart && customEnd) {
        promises.push(ownerApi.get(`/analytics/custom-range?startDate=${customStart}&endDate=${customEnd}`));
      }
      if (activeTab === 'resources') {
        promises.push(ownerApi.get('/analytics/resource-heatmap'));
      }

      const results = await Promise.all(promises);

      setRevenue(results[0].data.data);
      setProfitLoss(results[1].data.data);
      setRevenueTrend(results[2].data.data || []);
      setPaymentSplit(results[3].data.data);
      setResourceUsage(results[4].data.data);
      setExpenseBreakdown(results[5].data.data);

      // Parse advanced results
      let idx = 6;
      if (activeTab === 'customers' && results[idx]) { setClvData(results[idx].data.data || []); idx++; }
      if (activeTab === 'hours' && results[idx]) { setPeakHours(results[idx].data.data); idx++; }
      if (activeTab === 'branches' && results[idx]) { setBranchPL(results[idx].data.data); idx++; }
      if (activeTab === 'staff' && results[idx]) { setStaffPerf(results[idx].data.data || []); idx++; }
      if (activeTab === 'overview' && filter === 'custom' && results[idx]) { setCustomRange(results[idx].data.data); idx++; }
      if (activeTab === 'resources' && results[idx]) { setHeatmap(results[idx].data.data || []); idx++; }
    } catch (err) { console.error('Failed to fetch reports:', err); }
    finally { setLoading(false); }
  };

  const getDateFrom = (f) => {
    const now = new Date();
    switch (f) {
      case 'today': return now.toISOString().split('T')[0];
      case 'yesterday': return new Date(now.setDate(now.getDate() - 1)).toISOString().split('T')[0];
      case 'week': return new Date(now.setDate(now.getDate() - now.getDay())).toISOString().split('T')[0];
      case 'month': return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      default: return '';
    }
  };

  useEffect(() => { fetchReports(); }, [filter, activeTab, customStart, customEnd]);

  const handleExport = async (type) => {
    setExporting(true);
    try {
      const params = { type };
      if (filter === 'custom' && customStart && customEnd) {
        params.dateFrom = customStart;
        params.dateTo = customEnd;
      }
      const response = await ownerApi.get('/analytics/export-csv', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) { alert('Failed to export'); }
    finally { setExporting(false); }
  };

  if (loading && !revenue) return <PageLoader />;

  const filterOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'customers', label: 'Customer CLV', icon: Users },
    { id: 'hours', label: 'Peak Hours', icon: Clock },
    { id: 'resources', label: 'Resources', icon: Target },
    { id: 'branches', label: 'Branches', icon: Building2 },
    { id: 'staff', label: 'Staff Perf', icon: Activity }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Reports & Analytics</h1>
          <p className="text-text-muted mt-1">Revenue, profit, customer value, peak hours, and more</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-40">
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} options={filterOptions} />
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
          <div className="relative group">
            <Button variant="secondary" size="sm" icon={Download} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
            <div className="absolute right-0 mt-1 z-20 w-40 bg-surface rounded-xl shadow-lg border border-border hidden group-hover:block">
              {['payments', 'sessions', 'expenses', 'customers'].map((t) => (
                <button
                  key={t}
                  onClick={() => handleExport(t)}
                  className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-surface-tertiary first:rounded-t-xl last:rounded-b-xl capitalize"
                >
                  Export {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-surface-secondary rounded-lg p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* OVERVIEW TAB */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">Total Revenue</p>
                  <p className="text-xl font-bold text-text-primary">₹{revenue?.totalRevenue?.toLocaleString() || '0'}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${profitLoss?.profit >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                  {profitLoss?.profit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm text-text-muted">Profit/Loss</p>
                  <p className={`text-xl font-bold ${profitLoss?.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    ₹{profitLoss?.profit?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">Sessions</p>
                  <p className="text-xl font-bold text-text-primary">{revenue?.totalSessions || 0}</p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">Avg / Session</p>
                  <p className="text-xl font-bold text-text-primary">₹{revenue?.avgPerSession || 0}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Custom Range Summary */}
          {filter === 'custom' && customRange && (
            <Card>
              <CardHeader title="Custom Range Summary" subtitle={`${customRange.daysInRange || 0} days · ${customRange.summary?.completedSessions || 0} sessions`} />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-text-muted">Revenue</p>
                  <p className="text-lg font-bold text-text-primary">₹{customRange.summary?.totalRevenue?.toLocaleString() || '0'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Expenses</p>
                  <p className="text-lg font-bold text-text-primary">₹{customRange.summary?.totalExpenses?.toLocaleString() || '0'}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Profit</p>
                  <p className={`text-lg font-bold ${(customRange.summary?.profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ₹{customRange.summary?.profit?.toLocaleString() || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Margin</p>
                  <p className="text-lg font-bold text-text-primary">{customRange.summary?.profitMargin || 0}%</p>
                </div>
              </div>
              {customRange.comparison && (
                <div className="mt-3 p-3 bg-surface-secondary rounded-lg text-sm">
                  <span className="text-text-muted">vs previous period: </span>
                  <span className={`font-medium ${customRange.comparison.revenueChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {customRange.comparison.revenueChange >= 0 ? '+' : ''}{customRange.comparison.revenueChange}%
                  </span>
                  <span className="text-text-muted"> (₹{customRange.comparison.revenue.toLocaleString()})</span>
                </div>
              )}
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend */}
            <Card>
              <CardHeader title="Revenue Trend" subtitle="Last 7 days" />
              {revenueTrend.length === 0 ? (
                <p className="text-text-muted text-sm py-8 text-center">No data available</p>
              ) : (
                <div className="space-y-2">
                  {revenueTrend.map((d) => {
                    const maxRev = Math.max(...revenueTrend.map((r) => r.revenue), 1);
                    const barW = (d.revenue / maxRev) * 100;
                    return (
                      <div key={d.date} className="flex items-center gap-3">
                        <span className="text-xs text-text-muted w-28 text-right">{d.label}</span>
                        <div className="flex-1 h-6 bg-surface-tertiary rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${barW}%` }} />
                        </div>
                        <span className="text-xs font-medium text-text-primary w-16 text-right">₹{d.revenue}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Payment Split */}
            <Card>
              <CardHeader title="Payment Split" subtitle="All time" icon={PieChart} />
              {paymentSplit ? (
                <div className="space-y-3">
                  {Object.entries(paymentSplit.split || {}).map(([mode, amount]) => {
                    const pct = paymentSplit.total > 0 ? Math.round((amount / paymentSplit.total) * 100) : 0;
                    return (
                      <div key={mode} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-text-primary capitalize w-16">{mode}</span>
                        <div className="flex-1 h-5 bg-surface-tertiary rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-text-muted w-12 text-right">{pct}%</span>
                        <span className="text-sm font-medium text-text-primary w-20 text-right">₹{(amount || 0).toLocaleString()}</span>
                      </div>
                    );
                  })}
                  {Object.keys(paymentSplit.split || {}).length === 0 && (
                    <p className="text-text-muted text-sm py-4 text-center">No payments yet</p>
                  )}
                </div>
              ) : <p className="text-text-muted text-sm py-8 text-center">Loading...</p>}
            </Card>

            {/* Expense Breakdown */}
            <Card>
              <CardHeader title="Expense Breakdown" subtitle="By category" icon={Receipt} />
              {expenseBreakdown ? (
                <div className="space-y-3">
                  {Object.entries(expenseBreakdown.breakdown || {}).map(([cat, val]) => {
                    const pct = expenseBreakdown.total > 0 ? Math.round((val.total / expenseBreakdown.total) * 100) : 0;
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-text-primary capitalize w-20">{cat}</span>
                        <div className="flex-1 h-5 bg-surface-tertiary rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-text-muted w-12 text-right">{pct}%</span>
                        <span className="text-sm font-medium text-text-primary w-20 text-right">₹{val.total.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-text-muted text-sm py-4 text-center">No expenses yet</p>}
            </Card>

            {/* Resource Usage */}
            <Card>
              <CardHeader title="Resource Usage" subtitle="Top earning resources" icon={BarChart3} />
              {resourceUsage?.allResources?.length > 0 ? (
                <div className="space-y-3">
                  {resourceUsage.allResources.slice(0, 5).map((r) => {
                    const maxRev = Math.max(...resourceUsage.allResources.map((u) => u.totalRevenue), 1);
                    const barW = (r.totalRevenue / maxRev) * 100;
                    return (
                      <div key={r.resourceId} className="flex items-center gap-3">
                        <span className="text-sm font-medium text-text-primary w-24 truncate">{r.resourceName}</span>
                        <div className="flex-1 h-5 bg-surface-tertiary rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${barW}%` }} />
                        </div>
                        <span className="text-xs text-text-muted w-12 text-right">{r.totalSessions}</span>
                        <span className="text-sm font-medium text-text-primary w-20 text-right">₹{r.totalRevenue.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-text-muted text-sm py-4 text-center">No session data yet</p>}
            </Card>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <p className="text-sm text-text-muted">Sessions</p>
              <p className="text-xl font-bold text-text-primary">{revenue?.totalSessions || 0}</p>
            </Card>
            <Card>
              <p className="text-sm text-text-muted">Avg / Session</p>
              <p className="text-xl font-bold text-text-primary">₹{revenue?.avgPerSession || 0}</p>
            </Card>
            <Card>
              <p className="text-sm text-text-muted">Pending Dues</p>
              <p className="text-xl font-bold text-amber-600">₹{revenue?.pendingDues?.toLocaleString() || '0'}</p>
            </Card>
            <Card>
              <p className="text-sm text-text-muted">Profit Margin</p>
              <p className={`text-xl font-bold ${profitLoss?.profitMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {profitLoss?.profitMargin || 0}%
              </p>
            </Card>
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* CUSTOMER CLV TAB */}
      {/* ============================================================ */}
      {activeTab === 'customers' && (
        <Card>
          <CardHeader title="Customer Lifetime Value" subtitle="Top customers by total spend" />
          {clvData.length === 0 ? (
            <p className="text-text-muted text-sm py-8 text-center">Not enough data yet (need 3+ completed sessions per customer).</p>
          ) : (
            <div className="overflow-x-auto -mx-6 -mb-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase">Code</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase">Sessions</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase">Total Spent</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase">Avg/Session</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase">Days Active</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase">₹/Day</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clvData.map((c, i) => (
                    <tr key={c.customerId} className="hover:bg-surface-secondary/50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-surface-tertiary text-text-muted'
                          }`}>
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium text-text-primary">{c.customerName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-text-muted font-mono">{c.customerCode}</td>
                      <td className="px-6 py-3 text-sm text-right font-medium text-text-primary">{c.sessionCount}</td>
                      <td className="px-6 py-3 text-sm text-right font-medium text-emerald-600">₹{c.totalSpent.toLocaleString()}</td>
                      <td className="px-6 py-3 text-sm text-right text-text-muted">₹{c.avgSessionValue}</td>
                      <td className="px-6 py-3 text-sm text-right text-text-muted">{c.daysActive}</td>
                      <td className="px-6 py-3 text-sm text-right font-medium text-text-primary">₹{c.valuePerDay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ============================================================ */}
      {/* PEAK HOURS TAB */}
      {/* ============================================================ */}
      {activeTab === 'hours' && peakHours && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Hourly Distribution" subtitle={`Peak: ${peakHours.peakHour?.label} (${peakHours.peakHour?.count} sessions)`} />
            <div className="space-y-1">
              {peakHours.hourly?.map((h) => {
                const barW = peakHours.maxHourlyCount > 0 ? (h.count / peakHours.maxHourlyCount) * 100 : 0;
                const isPeak = h.hour === peakHours.peakHour?.hour;
                return (
                  <div key={h.hour} className={`flex items-center gap-2 ${isPeak ? 'font-medium' : ''}`}>
                    <span className="text-xs text-text-muted w-10 text-right">{h.label}</span>
                    <div className="flex-1 h-4 bg-surface-tertiary rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${isPeak ? 'bg-emerald-500' : 'bg-blue-400'}`}
                        style={{ width: `${barW}%` }} />
                    </div>
                    <span className="text-xs text-text-primary w-8 text-right">{h.count}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Day of Week" subtitle="Session distribution" />
            <div className="space-y-2">
              {peakHours.weekly?.map((d) => {
                const maxCount = Math.max(...peakHours.weekly.map(w => w.count), 1);
                const barW = (d.count / maxCount) * 100;
                return (
                  <div key={d.index} className="flex items-center gap-2">
                    <span className="text-sm text-text-primary w-20">{d.day}</span>
                    <div className="flex-1 h-5 bg-surface-tertiary rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full transition-all duration-300" style={{ width: `${barW}%` }} />
                    </div>
                    <span className="text-xs text-text-muted w-12 text-right">{d.count}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ============================================================ */}
      {/* BRANCH P&L TAB */}
      {/* ============================================================ */}
      {activeTab === 'branches' && branchPL && (
        <>
          {/* Total Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <p className="text-xs text-text-muted">Total Revenue</p>
              <p className="text-xl font-bold text-text-primary">₹{branchPL.totals?.totalRevenue?.toLocaleString() || '0'}</p>
            </Card>
            <Card>
              <p className="text-xs text-text-muted">Total Expenses</p>
              <p className="text-xl font-bold text-text-primary">₹{branchPL.totals?.totalExpenses?.toLocaleString() || '0'}</p>
            </Card>
            <Card>
              <p className="text-xs text-text-muted">Total Profit</p>
              <p className={`text-xl font-bold ${(branchPL.totals?.profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                ₹{branchPL.totals?.profit?.toLocaleString() || '0'}
              </p>
            </Card>
          </div>

          {/* Branch breakdown */}
          <div className="grid grid-cols-1 gap-4">
            {branchPL.branches?.map((b) => (
              <Card key={b.branchId || 'main'}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-text-muted" />
                    <h3 className="font-semibold text-text-primary">{b.branchName}</h3>
                    <span className="text-xs text-text-muted font-mono">{b.branchCode}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-text-muted">{b.paymentCount} payments</span>
                    <span className="text-text-muted">{b.expenseCount} expenses</span>
                    <span className={`font-semibold ${b.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {b.profit >= 0 ? '+' : ''}{b.profitMargin}%
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-text-muted">Revenue</p>
                    <p className="text-base font-bold text-text-primary">₹{b.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Expenses</p>
                    <p className="text-base font-bold text-text-primary">₹{b.totalExpenses.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex-1">
                    <p className="text-xs text-text-muted mb-1">Payment Modes</p>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(b.paymentModes || {}).map(([mode, amt]) => (
                        <span key={mode} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 text-xs rounded-full capitalize">
                          {mode}: ₹{amt.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-text-muted mb-1">Expense Categories</p>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(b.expenseCategories || {}).map(([cat, amt]) => (
                        <span key={cat} className="px-2 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 text-xs rounded-full capitalize">
                          {cat}: ₹{amt.toLocaleString()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* STAFF PERFORMANCE TAB */}
      {/* ============================================================ */}
      {activeTab === 'staff' && (
        <Card>
          <CardHeader title="Staff Performance" subtitle="Revenue generated by each staff member" />
          {staffPerf.length === 0 ? (
            <p className="text-text-muted text-sm py-8 text-center">No staff performance data available.</p>
          ) : (
            <div className="overflow-x-auto -mx-6 -mb-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-secondary/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase">Staff</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase">Role</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase">Sessions</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase">Revenue</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase">Avg/Session</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase">Salary</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-text-muted uppercase">ROI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {staffPerf.map((s) => (
                    <tr key={s.staffId} className="hover:bg-surface-secondary/50 transition-colors">
                      <td className="px-6 py-3 text-sm font-medium text-text-primary">{s.name}</td>
                      <td className="px-6 py-3 text-sm capitalize text-text-muted">{s.role}</td>
                      <td className="px-6 py-3 text-sm text-right text-text-primary">{s.sessionCount}</td>
                      <td className="px-6 py-3 text-sm text-right font-medium text-emerald-600">₹{s.totalRevenue.toLocaleString()}</td>
                      <td className="px-6 py-3 text-sm text-right text-text-muted">₹{s.avgSessionValue}</td>
                      <td className="px-6 py-3 text-sm text-right text-text-muted">₹{s.monthlySalary.toLocaleString()}</td>
                      <td className="px-6 py-3 text-sm text-right">
                        <span className={`font-medium ${s.roi >= 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {s.roi}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ============================================================ */}
      {/* RESOURCES TAB */}
      {/* ============================================================ */}
      {activeTab === 'resources' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {heatmap.map((r) => {
            const maxCount = Math.max(...r.hourlyUtilization.map(h => h.count), 1);
            return (
              <Card key={r.resourceId}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-text-primary">{r.resourceName}</h3>
                  <span className="text-xs text-text-muted capitalize">{r.category}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                  <div><span className="text-text-muted">{r.totalSessions} sessions</span></div>
                  <div><span className="text-text-muted">{Math.round(r.utilizationRate * 100)}% util</span></div>
                  <div><span className="text-emerald-600 font-medium">₹{r.totalRevenue.toLocaleString()}</span></div>
                </div>
                {/* Mini heatmap - 24 hours */}
                <div className="flex gap-0.5 h-8">
                  {r.hourlyUtilization.map((h) => {
                    const intensity = maxCount > 0 ? (h.count / maxCount) * 100 : 0;
                    return (
                      <div key={h.hour} className="flex-1 relative group">
                        <div
                          className="w-full h-full rounded-sm cursor-pointer transition-all"
                          style={{
                            backgroundColor: intensity > 75 ? '#059669' : intensity > 50 ? '#10b981' : intensity > 25 ? '#6ee7b7' : '#e5e7eb',
                            opacity: intensity > 0 ? 0.7 + (intensity / 300) : 0.3
                          }}
                        />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          {h.label}: {h.count} sessions
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-text-muted mt-1">Hourly utilization (24h)</p>
              </Card>
            );
          })}
          {heatmap.length === 0 && (
            <div className="col-span-full text-center py-12 text-text-muted">No resource utilization data available.</div>
          )}
        </div>
      )}
    </div>
  );
}
