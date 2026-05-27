import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Clock, Users, DollarSign, BadgeDollarSign,
  Menu, LogOut, User, Moon, Sun, ChevronDown
} from 'lucide-react';
import { useStaffAuth } from '../../context/StaffAuthContext';
import { useTheme } from '../../context/ThemeContext';
import NotificationBell from '../notifications/NotificationBell';

// Navigation items — shown based on staff permissions
const buildNavItems = (permissions) => {
  const items = [
    { path: '/staff/dashboard', label: 'Dashboard', icon: LayoutDashboard, requiredPerm: null },
    { path: '/staff/sessions', label: 'Sessions', icon: Clock, requiredPerm: 'canManageSessions' },
    { path: '/staff/customers', label: 'Players', icon: Users, requiredPerm: 'canManageCustomers' },
    { path: '/staff/payments', label: 'Payments', icon: DollarSign, requiredPerm: 'canManagePayments' },
    { path: '/staff/dues', label: 'Dues', icon: BadgeDollarSign, requiredPerm: 'canManageDues' }
  ];

  // If no permissions object (owner fallback), show all
  if (!permissions) return items;

  return items.filter(item => {
    if (!item.requiredPerm) return true;
    return permissions[item.requiredPerm] === true;
  });
};

export default function StaffLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useStaffAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const permissions = user?.permissions || {};
  const navItems = buildNavItems(permissions);

  const handleLogout = async () => {
    await logout();
    navigate('/staff/login');
  };

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const parts = path.split('/').filter(Boolean);
    return parts.map((part, i) => {
      const item = navItems.find(n => n.path === `/${parts.slice(0, i + 1).join('/')}`);
      return item?.label || part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
    });
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="flex h-screen overflow-hidden bg-surface-secondary">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col',
        'bg-sidebar text-sidebar-text transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-white/10 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">VP</span>
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm">VenuePro</h1>
            <p className="text-sidebar-text text-xs opacity-60">Staff Portal</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/staff/dashboard' && location.pathname.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-sidebar-active text-white'
                    : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0 opacity-70" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-white/10">
          {user?.role && (
            <p className="text-xs text-sidebar-text opacity-40 capitalize mb-1">
              {user.role}
            </p>
          )}
          <p className="text-xs text-sidebar-text opacity-40">VenuePro v1.0</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex-shrink-0 bg-surface border-b border-border flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-tertiary"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Breadcrumbs */}
            <nav className="hidden sm:flex items-center gap-2 text-sm text-text-muted">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-text-muted/40">/</span>}
                  <span className={i === breadcrumbs.length - 1 ? 'text-text-primary font-medium' : ''}>
                    {crumb}
                  </span>
                </span>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-tertiary transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <NotificationBell role="owner" notificationsPath="/staff/notifications" />

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg hover:bg-surface-tertiary transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden sm:block text-sm font-medium text-text-primary max-w-[120px] truncate">
                  {user?.name || 'Staff'}
                </span>
                <ChevronDown className="w-4 h-4 text-text-muted" />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-1 z-20 w-56 bg-surface rounded-xl shadow-lg border border-border animate-scaleIn overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium text-text-primary">{user?.name}</p>
                      <p className="text-xs text-text-muted capitalize">{user?.role}</p>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
