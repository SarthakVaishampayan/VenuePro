// ============================================================
// PRODUCT PREVIEW — Interactive VenuePro Demo Preview
// ============================================================
// 100% client-side. No API calls. No database writes.
// Shows visitors how VenuePro works through an interactive
// walkthrough with clickable sidebar navigation.
//
// Tour auto-starts on open. Visitors can skip to free-explore.
// At the end: "Want the full experience?" → Contact/Email CTA.
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  X, ChevronRight, ChevronLeft, Play, SkipForward, Menu,
  LayoutDashboard, Table2, Clock, Users, CreditCard,
  Wallet, BarChart3, UserCog, Receipt, Mail, Phone,
  Building2, Sparkles, Check, ArrowRight, HelpCircle,
  ShoppingBag, Timer, TrendingUp, DollarSign, AlertCircle
} from 'lucide-react';
import {
  BUSINESS_TYPES, DASHBOARD_STATS, RESOURCES, CUSTOMERS,
  SESSIONS, PAYMENTS, DUES, EXPENSES, STAFF,
  WEEKLY_REVENUE, PAYMENT_MODE_SPLIT, TOUR_STEPS, FEATURE_TOOLTIPS
} from './preview/mockData.js';

// ============================================================
// SIDEBAR NAVIGATION ITEMS
// ============================================================

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-indigo-500' },
  { key: 'resources', label: 'Resources', icon: Table2, color: 'text-emerald-500' },
  { key: 'sessions', label: 'Sessions', icon: Clock, color: 'text-amber-500' },
  { key: 'customers', label: 'Customers', icon: Users, color: 'text-violet-500' },
  { key: 'payments', label: 'Payments', icon: CreditCard, color: 'text-rose-500' },
  { key: 'dues', label: 'Dues', icon: Wallet, color: 'text-orange-500' },
  { key: 'reports', label: 'Reports', icon: BarChart3, color: 'text-blue-500' },
  { key: 'staff', label: 'Staff', icon: UserCog, color: 'text-cyan-500' },
  { key: 'expenses', label: 'Expenses', icon: Receipt, color: 'text-red-500' },
];

// ============================================================
// ANIMATED COUNTER
// ============================================================

function AnimatedCounter({ value, prefix = '', suffix = '', duration = 1500 }) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef(null);

  useEffect(() => {
    if (!startRef.current) startRef.current = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{prefix}{display.toLocaleString('en-IN')}{suffix}</span>;
}

// ============================================================
// FEATURE TOOLTIP
// ============================================================

function FeatureTooltip({ id, children }) {
  const [show, setShow] = useState(false);
  const tooltip = FEATURE_TOOLTIPS[id];

  if (!tooltip) return children;

  return (
    <div className="relative group" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 dark:bg-slate-700 rounded-xl shadow-2xl border border-slate-600 pointer-events-none">
          <p className="text-xs font-semibold text-white mb-1">{tooltip.title}</p>
          <p className="text-[11px] text-slate-300 leading-relaxed">{tooltip.description}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45 -mt-1 border-r border-b border-slate-600" />
        </div>
      )}
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({ icon: Icon, label, value, sub, color, tooltipId, animate = false }) {
  return (
    <FeatureTooltip id={tooltipId}>
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all cursor-default">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
          <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', color)}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">
          {animate ? <AnimatedCounter value={value} prefix={label.includes('Revenue') || label.includes('Dues') ? '₹' : ''} /> : value}
        </p>
        {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
      </div>
    </FeatureTooltip>
  );
}

// ============================================================
// PAGE: Welcome
// ============================================================

function WelcomePage({ onStartTour }) {
  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/25">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3">
          Welcome to <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">VenuePro</span>
        </h1>
        <p className="text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
          The all-in-one platform for sports facilities. Manage sessions, track payments, handle staff, and grow your business.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {BUSINESS_TYPES.map((bt) => (
          <div key={bt.key} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center hover:border-indigo-300 transition-all">
            <span className="text-3xl block mb-2">{bt.icon}</span>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{bt.name}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{bt.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { icon: Timer, title: 'Time-Based Billing', desc: 'Accurate timer-based billing with 5-minute rounding' },
          { icon: Users, title: 'Customer Management', desc: 'Track regulars, dues, and booking history' },
          { icon: TrendingUp, title: 'Analytics & Reports', desc: 'Data-driven insights for your venue' },
        ].map((f, i) => (
          <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
              <f.icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{f.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center">
        <button
          onClick={onStartTour}
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
        >
          <Play className="w-4 h-4" /> Start Guided Tour
        </button>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
          Or use the sidebar to explore on your own
        </p>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: Dashboard
// ============================================================

function DashboardPage() {
  const stats = DASHBOARD_STATS;

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Dashboard</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Your venue at a glance — today's performance overview</p>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard icon={DollarSign} label="Today's Revenue" value={stats.todayRevenue} sub="↑ 12.5% vs yesterday" color="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" tooltipId="stat-revenue" animate />
        <StatCard icon={Clock} label="Active Sessions" value={stats.activeSessions} sub="3 resources occupied" color="bg-amber-100 dark:bg-amber-900/30 text-amber-600" tooltipId="stat-sessions" animate />
        <StatCard icon={Table2} label="Available Resources" value={`${stats.availableResources}/${stats.totalResources}`} sub="2 occupied" color="bg-blue-100 dark:bg-blue-900/30 text-blue-600" tooltipId="stat-resources" />
        <StatCard icon={Wallet} label="Pending Dues" value={stats.pendingDues * 100} sub={`${stats.pendingDues} customers`} color="bg-orange-100 dark:bg-orange-900/30 text-orange-600" tooltipId="stat-dues" animate />
      </div>

      {/* Resource Status Grid */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Resource Status</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {RESOURCES.map((r) => (
            <FeatureTooltip key={r.id} id="resource-tile">
              <div className={clsx(
                'p-3 rounded-xl border-2 transition-all cursor-default',
                r.status === 'available'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              )}>
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{r.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  ₹{r.dayPrice}/hr day · ₹{r.nightPrice}/hr night
                </p>
                <span className={clsx(
                  'inline-block mt-1.5 px-2 py-0.5 text-[10px] font-medium rounded-full',
                  r.status === 'available'
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                    : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                )}>
                  {r.status === 'available' ? '● Available' : '● Occupied'}
                </span>
              </div>
            </FeatureTooltip>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Clock, label: 'Start Session', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
            { icon: Users, label: 'Add Customer', color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20' },
            { icon: CreditCard, label: 'Record Payment', color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' },
            { icon: Receipt, label: 'Add Expense', color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
          ].map((action, i) => (
            <button key={i} className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition-all text-left">
              <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', action.color)}>
                <action.icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: Resources
// ============================================================

function ResourcesPage() {
  const [selectedResource, setSelectedResource] = useState(null);

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Resources</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Manage your tables, courts, and their pricing</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {RESOURCES.map((r) => (
          <FeatureTooltip key={r.id} id="resource-tile">
            <button
              onClick={() => setSelectedResource(selectedResource?.id === r.id ? null : r)}
              className={clsx(
                'p-4 rounded-xl border-2 transition-all text-left w-full',
                selectedResource?.id === r.id
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md'
                  : r.status === 'available'
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-red-300'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.name}</p>
                <span className={clsx(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full',
                  r.status === 'available'
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                    : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                )}>
                  {r.status}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">Day: <span className="font-medium text-slate-700 dark:text-slate-200">₹{r.dayPrice}/hr</span></p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Night: <span className="font-medium text-slate-700 dark:text-slate-200">₹{r.nightPrice}/hr</span></p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Capacity: <span className="font-medium text-slate-700 dark:text-slate-200">{r.capacity} players</span></p>
              </div>
            </button>
          </FeatureTooltip>
        ))}
      </div>

      {selectedResource && (
        <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 animate-fadeIn">
          <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
            💡 How Resources Work
          </p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed">
            Each resource has day (before 6 PM) and night (after 6 PM) pricing. When you start a session,
            the system uses the rate at the start time. Resources change to "occupied" during an active
            session and go back to "available" when the session ends.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PAGE: Sessions
// ============================================================

function SessionsPage() {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);

  // Mock timer — simulates a live session
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [running]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const rate = 100; // ₹100/hr
  // Bill per second for smooth real-time display in demo
  const cost = Math.floor((elapsed / 3600) * rate);

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Sessions</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Start, track, and end customer sessions</p>

      {/* Mock Live Timer */}
      <FeatureTooltip id="session-timer">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 mb-6 text-center">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Live Session — Pool Table 1</p>
          <div className="text-5xl sm:text-6xl font-mono font-bold text-white mb-2 tabular-nums">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <p className="text-lg text-emerald-400 font-semibold">₹{cost}</p>
          <p className="text-xs text-slate-500 mt-1">Rate: ₹{rate}/hr</p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => setRunning(!running)}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-xl transition-all',
                running
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              )}
            >
              {running ? '⏹ End Session' : '▶ Start Session'}
            </button>
          </div>
        </div>
      </FeatureTooltip>

      {/* Recent Sessions */}
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Today's Sessions</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="text-left py-2 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Resource</th>
              <th className="text-left py-2 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Customer</th>
              <th className="text-left py-2 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Time</th>
              <th className="text-left py-2 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Duration</th>
              <th className="text-right py-2 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Amount</th>
              <th className="text-center py-2 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody>
            {SESSIONS.filter(s => s.status === 'completed').slice(0, 5).map((s) => (
              <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="py-2.5 px-2 sm:px-4 text-slate-700 dark:text-slate-200 whitespace-nowrap">{s.resourceName}</td>
                <td className="py-2.5 px-2 sm:px-4 text-slate-700 dark:text-slate-200 whitespace-nowrap">{s.customerName}</td>
                <td className="py-2.5 px-2 sm:px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{s.startTime}</td>
                <td className="py-2.5 px-2 sm:px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{s.elapsed}</td>
                <td className="py-2.5 px-2 sm:px-4 text-right font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">₹{s.amount}</td>
                <td className="py-2.5 px-2 sm:px-4 text-center whitespace-nowrap">
                  <span className={clsx(
                    'text-[10px] font-medium px-2 py-0.5 rounded-full',
                    s.paid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                  )}>
                    {s.paid ? 'Paid' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: Customers
// ============================================================

function CustomersPage() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Customers</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Track your regular players and their activity</p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="text-left py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Name</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Phone</th>
              <th className="text-center py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Bookings</th>
              <th className="text-center py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Wins</th>
              <th className="text-center py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Losses</th>
              <th className="text-right py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Due</th>
            </tr>
          </thead>
          <tbody>
            {CUSTOMERS.map((c) => (
              <tr
                key={c.id}
                onClick={() => setSelected(selected?.id === c.id ? null : c)}
                className={clsx(
                  'border-t border-slate-100 dark:border-slate-700/50 transition-colors cursor-pointer',
                  selected?.id === c.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                )}
              >
                <td className="py-3 px-2 sm:px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{c.name}</td>
                <td className="py-3 px-2 sm:px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{c.phone}</td>
                <td className="py-3 px-2 sm:px-4 text-center text-slate-700 dark:text-slate-200 whitespace-nowrap">{c.bookings}</td>
                <td className="py-3 px-2 sm:px-4 text-center text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{c.wins}</td>
                <td className="py-3 px-2 sm:px-4 text-center text-red-500 dark:text-red-400 whitespace-nowrap">{c.losses}</td>
                <td className="py-3 px-2 sm:px-4 text-right font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                  {c.totalDue > 0 ? <span className="text-amber-600 dark:text-amber-400">₹{c.totalDue}</span> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="mt-4 p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 animate-fadeIn">
          <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
            {selected.name} — Customer Details
          </p>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 leading-relaxed">
            {selected.bookings} total bookings · Win rate: {Math.round((selected.wins / selected.bookings) * 100)}%
            · Outstanding dues: ₹{selected.totalDue}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PAGE: Payments
// ============================================================

function PaymentsPage() {
  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Payments</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Record and track all payments</p>

      <FeatureTooltip id="payment-mode">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: "Today's Collection", value: '₹520', sub: '4 payments', color: 'from-emerald-500 to-teal-600' },
            { label: 'Cash', value: '₹320', sub: '62% of today', color: 'from-amber-500 to-orange-600' },
            { label: 'Online', value: '₹200', sub: '38% of today', color: 'from-blue-500 to-indigo-600' },
          ].map((card, i) => (
            <div key={i} className="p-4 rounded-xl bg-gradient-to-br text-white" style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))` }}>
              <div className={`bg-gradient-to-br ${card.color} p-4 rounded-xl`}>
                <p className="text-xs opacity-80">{card.label}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
                <p className="text-xs opacity-70 mt-1">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </FeatureTooltip>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="text-left py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Customer</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Type</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Mode</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Date</th>
              <th className="text-right py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Amount</th>
            </tr>
          </thead>
          <tbody>
            {PAYMENTS.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="py-3 px-2 sm:px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{p.customerName}</td>
                <td className="py-3 px-2 sm:px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{p.type}</td>
                <td className="py-3 px-2 sm:px-4 whitespace-nowrap">
                  <span className={clsx(
                    'text-[10px] font-medium px-2 py-0.5 rounded-full',
                    p.mode === 'cash' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                  )}>
                    {p.mode}
                  </span>
                </td>
                <td className="py-3 px-2 sm:px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{p.date}</td>
                <td className="py-3 px-2 sm:px-4 text-right font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">₹{p.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: Dues
// ============================================================

function DuesPage() {
  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Dues</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Track and collect outstanding payments</p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="text-left py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Customer</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Session</th>
              <th className="text-right py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Total</th>
              <th className="text-right py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Paid</th>
              <th className="text-right py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Remaining</th>
              <th className="text-center py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Status</th>
              <th className="text-center py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {DUES.map((d) => (
              <tr key={d.id} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="py-3 px-2 sm:px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{d.customerName}</td>
                <td className="py-3 px-2 sm:px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{d.session}</td>
                <td className="py-3 px-2 sm:px-4 text-right font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">₹{d.amount}</td>
                <td className="py-3 px-2 sm:px-4 text-right text-slate-500 dark:text-slate-400 whitespace-nowrap">₹{d.paid}</td>
                <td className="py-3 px-2 sm:px-4 text-right font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">₹{d.amount - d.paid}</td>
                <td className="py-3 px-2 sm:px-4 text-center whitespace-nowrap">
                  <span className={clsx(
                    'text-[10px] font-medium px-2 py-0.5 rounded-full',
                    d.status === 'partial' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                  )}>
                    {d.status}
                  </span>
                </td>
                <td className="py-3 px-2 sm:px-4 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1">
                    <button className="px-2 py-1 text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 transition-colors">
                      Pay
                    </button>
                    <button className="px-2 py-1 text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-lg hover:bg-slate-200 transition-colors">
                      Waive
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          💡 <strong>Pro tip:</strong> You can accept <strong>partial payments</strong> — collect ₹200 now,
          remaining ₹250 later. Or waive off dues for your regular customers as a goodwill gesture.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// PAGE: Reports
// ============================================================

function ReportsPage() {
  const maxRevenue = Math.max(...WEEKLY_REVENUE.map(d => d.amount));

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Reports</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Revenue analytics and performance insights</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        {/* Weekly Revenue Chart */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Weekly Revenue</h3>
          <div className="flex items-end justify-between gap-2 h-32">
            {WEEKLY_REVENUE.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-md transition-all hover:opacity-80"
                  style={{ height: `${(d.amount / maxRevenue) * 100}%` }}
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Mode Split */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Payment Split</h3>
          <div className="space-y-4">
            {PAYMENT_MODE_SPLIT.map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700 dark:text-slate-200">{item.mode}</span>
                  <span className="font-medium text-slate-900 dark:text-white">₹{item.amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all',
                      item.mode === 'Cash' ? 'bg-amber-500' : 'bg-blue-500'
                    )}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.percentage}% of total</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue (7d)', value: '₹70,800', change: '+12.5%', positive: true },
          { label: 'Avg. Daily', value: '₹10,114', change: '+8.3%', positive: true },
          { label: 'Total Sessions', value: '48', change: '+5.2%', positive: true },
          { label: 'Collection Rate', value: '82%', change: '-3.1%', positive: false },
        ].map((card, i) => (
          <div key={i} className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{card.value}</p>
            <p className={clsx('text-xs mt-1', card.positive ? 'text-emerald-600' : 'text-red-500')}>
              {card.change}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PAGE: Staff
// ============================================================

function StaffPage() {
  const [selectedStaff, setSelectedStaff] = useState(null);

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Staff</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Manage your team and their permissions</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {STAFF.map((s) => (
          <FeatureTooltip key={s.id} id="staff-permissions">
            <button
              onClick={() => setSelectedStaff(selectedStaff?.id === s.id ? null : s)}
              className={clsx(
                'p-5 rounded-xl border-2 transition-all text-left',
                selectedStaff?.id === s.id
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white',
                  s.role === 'manager' ? 'bg-indigo-500' : 'bg-emerald-500'
                )}>
                  {s.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{s.role}</p>
                </div>
                <span className={clsx(
                  'ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full',
                  s.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'
                )}>
                  {s.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">₹{s.salary.toLocaleString('en-IN')}/month · {s.phone}</p>
            </button>
          </FeatureTooltip>
        ))}
      </div>

      {selectedStaff && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 animate-fadeIn">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{selectedStaff.name} — Permissions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(selectedStaff.permissions).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <div className={clsx('w-5 h-5 rounded-full flex items-center justify-center', value ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-slate-200 dark:bg-slate-700')}>
                  {value ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-400" />}
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  {key.replace('manage', '').replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PAGE: Expenses
// ============================================================

function ExpensesPage() {
  const totalExpenses = EXPENSES.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Expenses</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Track operational costs and keep your P&L clear</p>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">Total Expenses (This Month)</p>
        <p className="text-3xl font-bold text-slate-900 dark:text-white">₹{totalExpenses.toLocaleString('en-IN')}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="text-left py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Description</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Category</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Date</th>
              <th className="text-left py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Paid By</th>
              <th className="text-right py-3 px-2 sm:px-4 text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Amount</th>
            </tr>
          </thead>
          <tbody>
            {EXPENSES.map((e) => (
              <tr key={e.id} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td className="py-3 px-2 sm:px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{e.description}</td>
                <td className="py-3 px-2 sm:px-4 whitespace-nowrap">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
                    {e.category}
                  </span>
                </td>
                <td className="py-3 px-2 sm:px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{e.date}</td>
                <td className="py-3 px-2 sm:px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap capitalize">{e.paidBy}</td>
                <td className="py-3 px-2 sm:px-4 text-right font-medium text-red-600 dark:text-red-400 whitespace-nowrap">₹{e.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// TOUR OVERLAY
// ============================================================

function TourOverlay({ step, totalSteps, onNext, onPrev, onSkip, onGoToPage }) {
  const tourStep = TOUR_STEPS[step];
  if (!tourStep) return null;

  const isFinal = tourStep.isFinal;
  const progress = ((step + 1) / totalSteps) * 100;

  // Navigate to the page when tour step changes
  useEffect(() => {
    if (tourStep.page && onGoToPage) {
      onGoToPage(tourStep.page);
    }
  }, [step]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onSkip} />

      {isFinal ? (
        // Final CTA — Full Experience
        <div className="relative w-full max-w-lg mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scaleIn">
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Want the Full Experience?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
              Our team will set up a <strong>personalized free trial</strong> for your venue —
              tailored to your specific business needs. No self-signup required.
            </p>

            <div className="space-y-3 max-w-sm mx-auto mb-6">
              <a
                href="mailto:admin@venuepro.com"
                className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Email us directly</p>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400">admin@venuepro.com</p>
                </div>
              </a>
              <button
                onClick={() => {
                  onSkip();
                  // Scroll to contact form
                  setTimeout(() => {
                    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                  }, 300);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Fill the enquiry form</p>
                  <p className="text-xs text-emerald-500 dark:text-emerald-400">Our team will reach out within 24 hrs</p>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400 ml-auto" />
              </button>
            </div>

            <button
              onClick={onSkip}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Close Tour
            </button>
          </div>
        </div>
      ) : (
        // Normal tour step
        <div className="relative w-full max-w-md mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scaleIn">
          {/* Progress bar */}
          <div className="h-1 bg-slate-200 dark:bg-slate-700">
            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          <div className="p-6">
            {/* Step counter */}
            <div className="flex items-center gap-1.5 mb-4">
              {TOUR_STEPS.slice(0, -1).map((_, i) => (
                <div key={i} className={clsx('w-2 h-2 rounded-full transition-all', i <= step ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600')} />
              ))}
            </div>

            <div className="text-3xl mb-3">{tourStep.icon}</div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{tourStep.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{tourStep.description}</p>

            <div className="mt-6 flex items-center justify-between">
              <div>
                {step > 0 && (
                  <button onClick={onPrev} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={onSkip} className="flex items-center gap-1 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                  <SkipForward className="w-3.5 h-3.5" /> Skip
                </button>
                <button onClick={onNext} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25">
                  {step < TOUR_STEPS.length - 2 ? 'Next' : 'See Plans'} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN: ProductPreview
// ============================================================

export default function ProductPreview({ onClose }) {
  const [currentPage, setCurrentPage] = useState('welcome');
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourCompleted, setTourCompleted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleStartTour = useCallback(() => {
    setShowTour(true);
    setTourStep(0);
    setCurrentPage('dashboard'); // Will be overridden by tour overlay
  }, []);

  const handleTourNext = useCallback(() => {
    if (tourStep < TOUR_STEPS.length - 1) {
      setTourStep(tourStep + 1);
    }
  }, [tourStep]);

  const handleTourPrev = useCallback(() => {
    if (tourStep > 0) {
      setTourStep(tourStep - 1);
    }
  }, [tourStep]);

  const handleTourSkip = useCallback(() => {
    setShowTour(false);
    setTourCompleted(true);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'welcome': return <WelcomePage onStartTour={handleStartTour} />;
      case 'dashboard': return <DashboardPage />;
      case 'resources': return <ResourcesPage />;
      case 'sessions': return <SessionsPage />;
      case 'customers': return <CustomersPage />;
      case 'payments': return <PaymentsPage />;
      case 'dues': return <DuesPage />;
      case 'reports': return <ReportsPage />;
      case 'staff': return <StaffPage />;
      case 'expenses': return <ExpensesPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-100 dark:bg-slate-900">
      {/* ===== MOBILE OVERLAY ===== */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== SIDEBAR ===== */}
      <div className={clsx(
        'fixed lg:static inset-y-0 left-0 z-50 w-56 lg:w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Brand */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">VP</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">VenuePro</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Interactive Preview</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <button
            onClick={() => { setCurrentPage('welcome'); setShowTour(false); setSidebarOpen(false); }}
            className={clsx(
              'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all',
              currentPage === 'welcome'
                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-medium'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <Sparkles className="w-4 h-4" />
            Welcome
          </button>

          <div className="py-1">
            <p className="px-3 text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Features</p>
          </div>

          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => { setCurrentPage(item.key); setShowTour(false); setTourCompleted(true); setSidebarOpen(false); }}
              className={clsx(
                'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all',
                currentPage === item.key
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <item.icon className={clsx('w-4 h-4', item.color)} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Close button */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
          >
            <X className="w-4 h-4" /> Close Preview
          </button>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Header bar */}
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">🔍 Interactive Preview</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400"></p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25"
            >
              <Mail className="w-3.5 h-3.5" /> Get Started
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Page content */}
        <div className="min-h-[calc(100vh-57px)]">
          {renderPage()}
        </div>

        {/* Tour overlay */}
        {showTour && (
          <TourOverlay
            step={tourStep}
            totalSteps={TOUR_STEPS.length}
            onNext={handleTourNext}
            onPrev={handleTourPrev}
            onSkip={handleTourSkip}
            onGoToPage={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}