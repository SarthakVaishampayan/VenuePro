import { useState, useEffect } from 'react';
import { Calendar, Clock, Building2, IndianRupee, Timer, CreditCard, AlertCircle, ChevronRight, Play, CheckCircle } from 'lucide-react';
import { PageLoader } from '../../components/common/Loader';
import playerApi from '../../services/playerApi';

const statusConfig = {
  in_progress: {
    label: 'Active',
    bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    icon: Play
  },
  completed: {
    label: 'Completed',
    bg: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
    dot: 'bg-blue-500',
    icon: CheckCircle
  },
  cancelled: {
    label: 'Cancelled',
    bg: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
    dot: 'bg-red-500',
    icon: AlertCircle
  },
  booked: {
    label: 'Upcoming',
    bg: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
    dot: 'bg-violet-500',
    icon: Calendar
  },
  checked_in: {
    label: 'Checked In',
    bg: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    dot: 'bg-amber-500',
    icon: Clock
  }
};

const paymentStatusColors = {
  paid: 'text-emerald-600 dark:text-emerald-400',
  pending: 'text-amber-600 dark:text-amber-400',
  due: 'text-red-600 dark:text-red-400',
  partial: 'text-orange-600 dark:text-orange-400'
};

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return null;
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

function formatCurrency(amount) {
  return amount != null ? `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : null;
}

export default function PlayerBookings() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadSessions();
  }, [statusFilter]);

  const loadSessions = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await playerApi.get(`/bookings${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`);
      setSessions(data.data?.data || data.data || []);
    } catch (err) {
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">My Sessions</h1>
        <p className="text-sm text-text-muted mt-1">Complete session history across all venues</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'in_progress', 'completed', 'cancelled'].map((status) => {
          const cfg = statusConfig[status];
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                statusFilter === status
                  ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-tertiary'
              }`}
            >
              {status === 'all' ? 'All' : (cfg?.label || status)}
            </button>
          );
        })}
      </div>

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No sessions yet</h3>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            When a venue staff starts a session for you, it will appear here automatically with all details.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const resourceName = session.resourceId?.name || session.resourceNameSnapshot || 'Session';
            const venueName = session.tenantId?.businessName || session.businessName || '';
            const status = statusConfig[session.bookingStatus] || statusConfig.completed;
            const StatusIcon = status.icon;
            const startTime = new Date(session.startTimeRounded || session.startTime || session.createdAt);
            const endTime = session.endTime ? new Date(session.endTime) : null;
            // For timer-based sessions (bookedDuration > 0), use the booked duration
            // instead of calculating from (endTime - startTimeRounded), which can
            // overcount due to startTimeRounded being rounded down while endTime
            // is calculated from the actual (unrounded) start time.
            const duration = session.durationMinutes || session.bookedDuration || (endTime ? Math.round((endTime - startTime) / 60000) : null);
            const isActive = session.bookingStatus === 'in_progress';

            return (
              <div key={session._id} className={`bg-surface rounded-xl border shadow-sm transition-all duration-200 overflow-hidden ${
                isActive
                  ? 'border-emerald-200 dark:border-emerald-800 ring-1 ring-emerald-500/20'
                  : 'border-border hover:shadow-md'
              }`}>
                {/* Top section: Status bar + Resource name */}
                <div className="px-5 pt-4 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`w-4 h-4 ${isActive ? 'text-emerald-500 animate-pulse' : ''}`} />
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </div>
                    {session.finalAmount > 0 && (
                      <span className={`text-sm font-semibold ${paymentStatusColors[session.paymentStatus] || 'text-text-primary'}`}>
                        {formatCurrency(session.finalAmount)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-text-primary">{resourceName}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-text-muted">
                        {venueName && (
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5" />
                            {venueName}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {startTime.toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric'
                          })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          {endTime && (
                            <> — {endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom section: Detailed stats for completed/active sessions */}
                {(duration || session.finalAmount > 0 || session.discount > 0) && (
                  <div className="border-t border-border bg-surface-secondary/50 px-5 py-3">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                      {duration && (
                        <span className="flex items-center gap-1.5 text-text-muted">
                          <Timer className="w-3.5 h-3.5" />
                          Duration: <strong className="text-text-primary">{formatDuration(duration)}</strong>
                        </span>
                      )}
                      {session.rawAmount > 0 && (
                        <span className="flex items-center gap-1.5 text-text-muted">
                          <IndianRupee className="w-3.5 h-3.5" />
                          Amount: <strong className="text-text-primary">{formatCurrency(session.rawAmount)}</strong>
                        </span>
                      )}
                      {session.discount > 0 && (
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          Discount: <strong>-{formatCurrency(session.discount)}</strong>
                          {session.discountReason && (
                            <span className="text-text-muted text-xs">({session.discountReason})</span>
                          )}
                        </span>
                      )}
                      {session.paymentStatus && (
                        <span className={`flex items-center gap-1.5 ml-auto ${paymentStatusColors[session.paymentStatus] || 'text-text-muted'}`}>
                          <CreditCard className="w-3.5 h-3.5" />
                          <span className="capitalize font-medium">{session.paymentStatus}</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Throbber for active sessions */}
                {isActive && (
                  <div className="px-5 pb-4">
                    <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Live — session in progress
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
