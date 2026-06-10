import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useStaffAuth } from '../../context/StaffAuthContext';
import Button from '../../components/common/Button';

export default function StaffLogin() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useStaffAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phone || !password) {
      setError('Please enter phone and password');
      return;
    }

    setLoading(true);
    try {
      await login(phone, password);
      navigate('/staff/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl bg-amber-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
            <span className="text-white font-bold text-xl">VP</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">VenuePro</h1>
          <p className="text-text-muted mt-1">Staff Portal</p>
        </div>

        {/* Login form */}
        <div className="bg-surface rounded-2xl border border-border shadow-sm p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-text-primary mb-6">Sign in to your shift</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your registered phone number"
                required
                autoFocus
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-text-muted text-text-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-3 py-2 pr-10 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-text-muted text-text-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full !bg-amber-600 hover:!bg-amber-700" size="lg">
              <LogIn className="w-4 h-4" />
              Sign in
            </Button>
          </form>

          <p className="text-center mt-6 text-sm text-text-muted">
            This portal is for venue staff only.
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-text-muted hover:text-amber-600 transition-colors">
            ← Back to Home
          </Link>
        </div>

        <p className="text-center mt-6 text-xs text-text-muted">
          VenuePro SaaS v1.0 — Staff Access
        </p>
      </div>
    </div>
  );
}
