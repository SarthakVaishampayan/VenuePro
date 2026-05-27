import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOwnerAuth } from '../../context/OwnerAuthContext';
import ownerApi from '../../services/ownerApi';
import { Card, CardHeader } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { KeyRound, Eye, EyeOff, CheckCircle, LayoutDashboard } from 'lucide-react';

export default function ChangePassword() {
  const { updateUser } = useOwnerAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordChanged, setPasswordChanged] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await ownerApi.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      setMessage('Password changed successfully!');
      setPasswordChanged(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Mark firstLogin as completed so the welcome wizard won't show on return
      try {
        const saved = localStorage.getItem('ownerUser');
        if (saved) {
          const u = JSON.parse(saved);
          u.firstLogin = false;
          localStorage.setItem('ownerUser', JSON.stringify(u));
          // Also update the auth context so Dashboard reads it immediately
          updateUser(u);
        }
      } catch {}
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const goToDashboard = () => {
    navigate('/owner/dashboard');
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Change Password</h1>
        <p className="text-text-muted mt-1">Update your account password</p>
      </div>

      <Card>
        {message && (
          <div className="p-3 mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>
            </div>
            {passwordChanged && (
              <Button onClick={goToDashboard} size="sm" variant="secondary" className="mt-2">
                <LayoutDashboard className="w-4 h-4" />
                Go to Dashboard
              </Button>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {!passwordChanged && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-text-primary"
                placeholder="Enter current password"
                required
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-text-primary"
                placeholder="Min 8 characters"
                required
                minLength={8}
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-text-primary"
              placeholder="Re-enter new password"
              required
            />
          </div>

          <Button type="submit" loading={saving} className="w-full" icon={KeyRound}>
            Change Password
          </Button>
        </form>
        )}
      </Card>

      {passwordChanged && (
        <div className="text-center">
          <button
            onClick={goToDashboard}
            className="text-sm text-text-muted hover:text-text-primary transition-colors underline"
          >
            Return to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
