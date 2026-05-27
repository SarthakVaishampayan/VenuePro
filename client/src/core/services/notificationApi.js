import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Create an axios instance that reads the correct token for each role.
 * Uses the same interceptor pattern as api.js and ownerApi.js.
 */
const createNotifApi = (tokenKey, basePath) => {
  const instance = axios.create({
    baseURL: `${API_BASE}${basePath}`,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000
  });

  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem(tokenKey);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return instance;
};

const ownerNotifApi = createNotifApi('ownerAccessToken', '/api/tenant/notifications');
const saNotifApi = createNotifApi('accessToken', '/api/platform/notifications');

/**
 * Fetch notifications for the current user.
 * @param {Object} options
 * @param {number} [options.limit=50] - Max notifications to fetch
 * @param {boolean} [options.unreadOnly=false] - Only unread notifications
 * @param {'owner'|'superadmin'} [options.role='owner'] - User role
 * @returns {Promise<{notifications: Array, unreadCount: number}>}
 */
export const fetchNotifications = async ({ limit = 50, unreadOnly = false, role = 'owner' } = {}) => {
  const api = role === 'superadmin' ? saNotifApi : ownerNotifApi;
  const params = { limit: String(limit) };
  if (unreadOnly) params.unreadOnly = 'true';

  const res = await api.get('/', { params });
  return {
    notifications: res.data?.data || [],
    unreadCount: res.data?.meta?.unreadCount || 0
  };
};

/**
 * Fetch unread notification count only.
 */
export const fetchUnreadCount = async (role = 'owner') => {
  try {
    const api = role === 'superadmin' ? saNotifApi : ownerNotifApi;
    const res = await api.get('/unread-count');
    return res.data?.data?.count || 0;
  } catch {
    return 0;
  }
};

/**
 * Mark a single notification as read.
 */
export const markAsRead = async (notificationId, role = 'owner') => {
  const api = role === 'superadmin' ? saNotifApi : ownerNotifApi;
  await api.patch(`/${notificationId}/read`);
};

/**
 * Mark all notifications as read.
 */
export const markAllAsRead = async (role = 'owner') => {
  const api = role === 'superadmin' ? saNotifApi : ownerNotifApi;
  await api.patch('/read-all');
};

/**
 * Get the notification icon and color based on event type.
 */
export const getNotificationMeta = (eventType) => {
  const meta = {
    session_started: { icon: 'Play', color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Session Started' },
    session_ended: { icon: 'StopCircle', color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Session Ended' },
    payment_received: { icon: 'DollarSign', color: 'text-green-500', bg: 'bg-green-500/10', label: 'Payment' },
    due_created: { icon: 'AlertCircle', color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Due Added' },
    due_paid: { icon: 'CheckCircle', color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Due Paid' },
    invoice_generated: { icon: 'FileText', color: 'text-violet-500', bg: 'bg-violet-500/10', label: 'Invoice' },
    subscription_renewed: { icon: 'RefreshCw', color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Renewed' },
    subscription_overdue: { icon: 'AlertTriangle', color: 'text-red-500', bg: 'bg-red-500/10', label: 'Overdue' },
    subscription_expired: { icon: 'XCircle', color: 'text-red-600', bg: 'bg-red-600/10', label: 'Expired' },
    trial_expiring: { icon: 'Clock', color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Trial Ending' },
    tenant_created: { icon: 'Building2', color: 'text-indigo-500', bg: 'bg-indigo-500/10', label: 'New Tenant' },
    system_alert: { icon: 'Shield', color: 'text-red-500', bg: 'bg-red-500/10', label: 'System Alert' }
  };
  return meta[eventType] || { icon: 'Bell', color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'Notification' };
};
