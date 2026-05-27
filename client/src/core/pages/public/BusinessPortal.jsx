import { useNavigate, Link } from 'react-router-dom';
import { Shield, Building2, Users, Sparkles, ArrowRight, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const roles = [
  {
    key: 'superadmin',      title: 'Platform Admin',
    description: 'Manage all tenants, plans, and platform settings',
    icon: Shield,
    path: '/superadmin/login',
    color: 'from-indigo-600 to-indigo-700',
    bgLight: 'bg-indigo-50 dark:bg-indigo-900/20',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
    iconColor: 'text-indigo-600 dark:text-indigo-400'
  },
  {
    key: 'owner',
    title: 'Venue Owner',
    description: 'Manage your venue, staff, sessions, and payments',
    icon: Building2,
    path: '/owner/login',
    color: 'from-emerald-600 to-emerald-700',
    bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400'
  },
  {
    key: 'staff',
    title: 'Staff Member',
    description: 'Manage sessions, customers, and daily operations',
    icon: Users,
    path: '/staff/login',
    color: 'from-amber-600 to-amber-700',
    bgLight: 'bg-amber-50 dark:bg-amber-900/20',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400'
  }
];

export default function BusinessPortal() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">VenuePro</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            Business Portal
          </h1>
          <p className="mt-3 text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Sign in to manage your venue, staff, or platform. Select your role below to continue.
          </p>
        </div>

        {/* Role Cards */}
        <div className="w-full max-w-lg space-y-4">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.key}
                onClick={() => navigate(role.path)}
                className="group w-full flex items-center gap-5 p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 text-left"
              >
                <div className={`w-14 h-14 rounded-xl ${role.iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                  <Icon className={`w-7 h-7 ${role.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {role.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {role.description}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="relative w-full max-w-lg my-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-4 text-xs text-slate-400 dark:text-slate-500 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
              OR
            </span>
          </div>
        </div>

        {/* Player Portal Link */}
        <div className="text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Are you a player looking for your bookings and payments?
          </p>
          <Link
            to="/play/login"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-all"
          >
            <Users className="w-4 h-4" />
            Go to Player Hub
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Back to home */}
        <div className="mt-10">
          <Link to="/" className="text-sm text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            ← Back to Home
          </Link>
        </div>

        <p className="mt-8 text-xs text-slate-400 dark:text-slate-500">
          VenuePro SaaS v1.0 — Business Portal
        </p>
      </div>
    </div>
  );
}
