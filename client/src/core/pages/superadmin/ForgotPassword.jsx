import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-secondary p-4">
        <div className="w-full max-w-md bg-surface rounded-2xl border border-border shadow-sm p-8 text-center">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">Check your email</h2>
          <p className="text-text-muted text-sm mb-6">
            If an account with that email exists, we've sent password reset instructions.
          </p>
          <Link to="/superadmin/login" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary p-4">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-2xl border border-border shadow-sm p-8">
          <h2 className="text-xl font-semibold text-text-primary mb-2">Reset password</h2>
          <p className="text-sm text-text-muted mb-6">
            Enter your email and we'll send you a reset link.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@venuepro.com"
              icon={Mail}
              required
            />
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}
            <Button type="submit" loading={loading} className="w-full">
              Send reset link
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Link to="/superadmin/login" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text-primary">
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
