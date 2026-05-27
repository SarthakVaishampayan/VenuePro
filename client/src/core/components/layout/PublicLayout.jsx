import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, Moon, Sun, Sparkles, Users } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center group-hover:opacity-90 transition-opacity shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">VenuePro</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Features</a>
              <a href="#pricing" className="text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Pricing</a>
              <a href="#faq" className="text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">FAQ</a>
              <div className="h-5 w-px bg-slate-300 dark:bg-slate-600" />
              <Link to="/" className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-violet-600 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/30 rounded-lg transition-colors">
                <Users className="w-4 h-4" />
                Player Hub
              </Link>
              <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={() => navigate('/signup')} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                Start Free Trial
              </button>
              <Link to="/portal" className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            </div>

            {/* Mobile menu button */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <div className="md:hidden pb-4 border-t border-slate-200 dark:border-slate-700 mt-2 pt-4 space-y-2">
              <a href="#features" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Features</a>
              <a href="#pricing" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Pricing</a>
              <a href="#faq" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">FAQ</a>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2" />
              <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-violet-600 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/40 rounded-lg">
                <Users className="w-4 h-4" /> Player Hub
              </Link>
              <button onClick={() => { navigate('/signup'); setMobileOpen(false); }} className="w-full px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Start Free Trial</button>
              <Link to="/portal" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Sign In</Link>
            </div>
          )}
        </nav>
      </header>

      {/* Main content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <span className="text-base font-bold text-slate-900 dark:text-white">VenuePro</span>
              </Link>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                The complete management platform for sports facilities. Run your venue smarter with VenuePro.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Product</h4>
              <ul className="space-y-2">
                <li><Link to="/business" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">Overview</Link></li>
                <li><a href="/business#features" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">Features</a></li>
                <li><a href="/business#pricing" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">Pricing</a></li>
                <li><Link to="/signup" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Players</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">Player Hub</Link></li>
                <li><Link to="/play/login" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">Sign In</Link></li>
                <li><Link to="/play/signup" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">Sign Up</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Company</h4>
              <ul className="space-y-2">
                <li><span className="text-sm text-slate-500 dark:text-slate-400">support@venuepro.com</span></li>
                <li><span className="text-sm text-slate-500 dark:text-slate-400">Terms of Service</span></li>
                <li><span className="text-sm text-slate-500 dark:text-slate-400">Privacy Policy</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
            <p className="text-center text-xs text-slate-400 dark:text-slate-500">
              &copy; {new Date().getFullYear()} VenuePro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
