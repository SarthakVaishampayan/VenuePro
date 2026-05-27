import { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard, Calendar, CreditCard, AlertCircle, User,
  Menu, X, LogOut, Moon, Sun, ChevronDown, Bell, Sparkles
} from 'lucide-react';
import { usePlayerAuth } from '../../context/PlayerAuthContext';
import { useTheme } from '../../context/ThemeContext';
// Notification bell is available for owners/staff via tenantAuth — players not yet supported

const navItems = [
  { path: '/play/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/play/bookings', label: 'My Bookings', icon: Calendar },
  { path: '/play/payments', label: 'Payments', icon: CreditCard },
  { path: '/play/dues', label: 'Dues', icon: AlertCircle },
  { path: '/play/profile', label: 'Profile', icon: User }
];

export default function PlayerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = usePlayerAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/play/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface-secondary">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col',
        'bg-gradient-to-b from-violet-700 to-violet-900 text-white transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-white/10 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm">Player Hub</h1>
            <p className="text-white/60 text-xs">VenuePro</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-white/40">VenuePro v1.0</p>
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
            <h2 className="text-sm font-medium text-text-muted hidden sm:block">
              Welcome back, <span className="text-text-primary font-semibold">{user?.fullName || 'Player'}</span>
            </h2>
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

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg hover:bg-surface-tertiary transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden sm:block text-sm font-medium text-text-primary max-w-[120px] truncate">
                  {user?.fullName || 'Player'}
                </span>
                <ChevronDown className="w-4 h-4 text-text-muted" />
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-1 z-20 w-56 bg-surface rounded-xl shadow-lg border border-border animate-scaleIn overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-medium text-text-primary">{user?.fullName}</p>
                      <p className="text-xs text-text-muted">{user?.email || user?.phone}</p>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={() => { setProfileOpen(false); navigate('/play/profile'); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary rounded-lg hover:bg-surface-tertiary transition-colors"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </button>
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
