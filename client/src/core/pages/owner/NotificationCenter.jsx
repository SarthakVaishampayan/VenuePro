import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Bell, Check, CheckCheck, ArrowLeft, Loader2, RefreshCw,
  Filter, X
} from 'lucide-react';
import { fetchNotifications, markAsRead, markAllAsRead, getNotificationMeta } from '../../services/notificationApi';

/**
 * NotificationCenter — Full page notification listing with filtering.
 * Works for both owner and superadmin roles.
 *
 * @param {Object} props
 * @param {'owner'|'superadmin'} props.role — User role
 * @param {string} props.backPath — Path to navigate back
 * @param {string} props.title — Page title
 */
export default function NotificationCenter({ role = 'owner', backPath = '/owner/dashboard', title = 'Notifications' }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const navigate = useNavigate();

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNotifications({
        limit: 100,
        unreadOnly: filter === 'unread',
        role
      });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [filter, role]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (id) => {
    await markAsRead(id, role);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead(role);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(backPath)}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-tertiary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{title}</h1>
            <p className="text-sm text-text-muted">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : 'All caught up'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="flex items-center bg-surface-tertiary rounded-lg p-0.5">
            <button
              onClick={() => setFilter('all')}
              className={clsx(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                filter === 'all'
                  ? 'bg-surface text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={clsx(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                filter === 'unread'
                  ? 'bg-surface text-text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              Unread
            </button>
          </div>

          {/* Mark all read */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-primary-500 hover:text-primary-600 hover:bg-primary-500/10 rounded-lg transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}

          {/* Refresh */}
          <button
            onClick={loadNotifications}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-tertiary transition-colors"
            title="Refresh"
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
            <Bell className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-sm text-text-muted mb-4">{error}</p>
          <button
            onClick={loadNotifications}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-3" />
          <p className="text-sm text-text-muted">Loading notifications...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredNotifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-tertiary flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-text-muted opacity-40" />
          </div>
          <h3 className="text-base font-medium text-text-primary mb-1">No notifications yet</h3>
          <p className="text-sm text-text-muted max-w-sm">
            {filter === 'unread'
              ? 'You have no unread notifications. Great job staying on top of things!'
              : 'When something happens — a payment comes in, a session starts or ends — you\'ll see it here.'}
          </p>
        </div>
      )}

      {/* Notification list */}
      {!loading && !error && filteredNotifications.length > 0 && (
        <div className="space-y-1">
          {filteredNotifications.map((n) => {
            const meta = getNotificationMeta(n.eventType);
            return (
              <div
                key={n._id}
                className={clsx(
                  'flex items-start gap-4 p-4 rounded-xl transition-colors',
                  !n.isRead
                    ? 'bg-primary-500/5 border border-primary-500/10'
                    : 'bg-surface border border-border hover:bg-surface-tertiary'
                )}
              >
                {/* Icon */}
                <div className={clsx(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  meta.bg
                )}>
                  <span className={clsx('text-lg font-bold', meta.color)}>!</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={clsx(
                        'text-xs font-medium px-1.5 py-0.5 rounded-full',
                        meta.bg, meta.color
                      )}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-text-muted/60 whitespace-nowrap">
                        {formatTime(n.createdAt)}
                      </span>
                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkRead(n._id)}
                          className="p-1 rounded text-text-muted hover:text-primary-500 hover:bg-surface-tertiary transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <h4 className={clsx(
                    'text-sm mt-1.5',
                    n.isRead ? 'text-text-primary' : 'text-text-primary font-semibold'
                  )}>
                    {n.title}
                  </h4>
                  <p className="text-sm text-text-muted mt-0.5">{n.message}</p>
                  {n.priority === 'urgent' && (
                    <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                      Urgent
                    </span>
                  )}
                  {n.priority === 'high' && (
                    <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                      High Priority
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
