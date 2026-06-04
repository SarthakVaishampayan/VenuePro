import { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, Building2, Save, Sparkles, Eye, EyeOff, Camera } from 'lucide-react';
import { Card, CardHeader } from '../../components/common/Card';
import Button from '../../components/common/Button';
import { PageLoader } from '../../components/common/Loader';
import { usePlayerAuth } from '../../context/PlayerAuthContext';
import playerApi from '../../services/playerApi';

export default function PlayerProfile() {
  const { user, updateUser, logout } = usePlayerAuth();
  const [profile, setProfile] = useState({
    fullName: user?.fullName || '',
    nickname: user?.nickname || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  const [linkedVenues, setLinkedVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const passwordTimeoutRef = useRef(null);

  // Cleanup password success timeout on unmount
  useEffect(() => {
    return () => clearTimeout(passwordTimeoutRef.current);
  }, []);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data } = await playerApi.get('/auth/me');
      const userData = data.data || data;
      setProfile({
        fullName: userData.fullName || '',
        nickname: userData.nickname || '',
        email: userData.email || '',
        phone: userData.phone || ''
      });
      setLinkedVenues(userData.linkedVenues || []);
    } catch (err) {
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile.fullName) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const { data } = await playerApi.patch('/auth/profile', {
        fullName: profile.fullName,
        nickname: profile.nickname || undefined,
        email: profile.email || undefined,
        phone: profile.phone || undefined
      });
      const updatedUser = data.data || data;
      updateUser(updatedUser);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      await playerApi.put('/auth/change-password', {
        currentPassword,
        newPassword
      });
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Keep success message visible for 3s before hiding the form
      clearTimeout(passwordTimeoutRef.current);
      passwordTimeoutRef.current = setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordSuccess('');
      }, 3000);
    } catch (err) {
      setPasswordError(err.response?.data?.error?.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">My Profile</h1>
        <p className="text-sm text-text-muted mt-1">Manage your personal information and account settings</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader title="Personal Information" />
        
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
          </div>
        )}

        <div className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-violet-500 flex items-center justify-center text-white text-xl font-bold">
                {(profile.fullName || 'P').charAt(0).toUpperCase()}
              </div>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center hover:bg-surface-tertiary transition-colors">
                <Camera className="w-3.5 h-3.5 text-text-muted" />
              </button>
            </div>
            <div>
              <p className="text-lg font-semibold text-text-primary">{profile.fullName || 'Player'}</p>
              {profile.nickname && <p className="text-sm text-text-muted">aka "{profile.nickname}"</p>}
            </div>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">Full Name</label>
              <input
                type="text"
                value={profile.fullName}
                onChange={(e) => setProfile(p => ({ ...p, fullName: e.target.value }))}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-text-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">Nickname</label>
              <input
                type="text"
                value={profile.nickname}
                onChange={(e) => setProfile(p => ({ ...p, nickname: e.target.value }))}
                placeholder="Optional"
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-text-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-text-primary"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 9876543210"
                  className="w-full pl-10 pr-4 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-text-primary"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} loading={saving} icon={Save}>
              Save Changes
            </Button>
          </div>
        </div>
      </Card>

      {/* Linked Venues */}
      <Card>
        <CardHeader title="Linked Venues" subtitle={linkedVenues.length > 0 ? `${linkedVenues.length} venue(s)` : ''} />
        {linkedVenues.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">
            No venues linked yet. Visit a venue and ask them to link your account.
          </p>
        ) : (
          <div className="space-y-2">
            {linkedVenues.map((venue, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary border border-border">
                <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{venue.businessName}</p>
                  <p className="text-xs text-text-muted">
                    {venue.businessType?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    {venue.linkedAt && ` · Linked ${new Date(venue.linkedAt).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader title="Security" />
        {!showPasswordForm ? (
          <Button variant="secondary" onClick={() => setShowPasswordForm(true)}>
            Change Password
          </Button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-400">{passwordError}</p>
              </div>
            )}
            {passwordSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-emerald-700 dark:text-emerald-400">{passwordSuccess}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-text-primary"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className="w-full px-3 py-2 pr-10 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-text-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-text-primary"
                required
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" type="button" onClick={() => { setShowPasswordForm(false); setPasswordError(''); }}>
                Cancel
              </Button>
              <Button type="submit" loading={changingPassword}>
                Update Password
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
