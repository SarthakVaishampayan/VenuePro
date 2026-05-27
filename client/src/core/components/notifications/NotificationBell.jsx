import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Bell, Check, CheckCheck, ExternalLink, Loader2 } from 'lucide-react';
import { fetchNotifications, fetchUnreadCount, markAsRead, markAllAsRead, getNotificationMeta } from '../../services/notificationApi';

/**
 * NotificationBell — Header bell icon with unread badge + dropdown panel.
 * Polls every 30s for unread count and fetches full list on dropdown open.
 *
 * @param {Object} props
 * @param {'owner'|'superadmin'} props.role — User role to determine API base
 * @param {string} [props.notificationsPath] — Path to navigate to "View all"
 * @param {string} [props.className] — Extra classes for the bell button
 */
export default function NotificationBell({ role = 'owner', notificationsPath, className }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Fetch unread count
  const refreshCount = useCallback(async () => {
    try {
      const count = await fetchUnreadCount(role);
      setUnreadCount(count);
    } catch {
      // silent
    }
  }, [role]);

  // Fetch full notification list
  const refreshList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNotifications({ limit: 10, role });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [role]);

  // Poll every 30 seconds
  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 30000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  // Open/close dropdown
  useEffect(() => {
    if (open) {
      refreshList();
    }
  }, [open, refreshList]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMarkRead = async (id, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    await markAsRead(id, role);
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead(role);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleViewAll = () => {
    setOpen(false);
    if (notificationsPath) {
      navigate(notificationsPath);
    }
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
    return d.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          'p-2 rounded-lg transition-colors relative',
          'text-text-muted hover:text-text-primary hover:bg-surface-tertiary',
          className
        )}
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none min-w-[18px] min-h-[18px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className={clsx(
          'absolute right-0 mt-2 z-50 w-80 sm:w-96',
          'bg-surface rounded-xl shadow-xl border border-border',
          'animate-scaleIn origin-top-right overflow-hidden'
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-text-muted">
                <Bell className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const meta = getNotificationMeta(n.eventType);
                return (
                  <button
                    key={n._id}
                    onClick={() => handleMarkRead(n._id)}
                    className={clsx(
                      'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-surface-tertiary border-b border-border/50 last:border-0',
                      !n.isRead && 'bg-primary-500/5'
                    )}
                  >
                    {/* Icon */}
                    <div className={clsx(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                      meta.bg
                    )}>
                      <span className="text-sm font-bold">!</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={clsx(
                          'text-sm truncate',
                          n.isRead ? 'text-text-primary' : 'text-text-primary font-semibold'
                        )}>
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <button
                            onClick={(e) => handleMarkRead(n._id, e)}
                            className="flex-shrink-0 p-0.5 rounded text-text-muted hover:text-primary-500 hover:bg-surface-tertiary transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[11px] text-text-muted/60 mt-1">{formatTime(n.createdAt)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notificationsPath && (
            <button
              onClick={handleViewAll}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm text-primary-500 hover:text-primary-600 hover:bg-surface-tertiary transition-colors border-t border-border"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View all notifications
            </button>
          )}
        </div>
      )}
    </div>
  );
}
