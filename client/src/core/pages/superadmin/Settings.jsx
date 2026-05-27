import { useState } from 'react';
import {
  User, Shield, Bell, Globe, Save, Eye, EyeOff,
  CheckCircle
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { Card, CardHeader } from '../../components/common/Card';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'platform', label: 'Platform', icon: Globe }
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Profile form
  const [profile, setProfile] = useState({
    name: 'Super Admin',
    email: 'admin@venuepro.com',
    phone: '+1-555-0100'
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Platform settings
  const [platform, setPlatform] = useState({
    platformName: 'VenuePro',
    supportEmail: 'support@venuepro.com',
    defaultCurrency: 'USD',
    defaultTimezone: 'UTC',
    trialDays: 14,
    maintenanceMode: false
  });

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    // Simulate save
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-muted mt-1">Manage your profile and platform configuration</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-surface-secondary rounded-xl p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader
            title="Profile Information"
            subtitle="Update your personal details"
          />
          <div className="space-y-4">
            <div className="flex items-center gap-6 pb-4 border-b border-border">
              <div className="w-16 h-16 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                <User className="w-7 h-7 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">Profile Photo</p>
                <p className="text-xs text-text-muted">JPG, PNG or GIF. 1MB max.</p>
                <Button size="sm" variant="secondary" className="mt-2">Upload</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Full Name" value={profile.name} onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))} />
              <Input label="Email" type="email" value={profile.email} onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))} />
              <Input label="Phone" value={profile.phone} onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} loading={saving} icon={saved ? CheckCircle : Save}>
                {saved ? 'Saved!' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader
            title="Change Password"
            subtitle="Update your account password"
          />
          <div className="space-y-4 max-w-md">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary"
                />
                <button onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary"
                />
                <button onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Input label="Confirm New Password" type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))} />
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} loading={saving} icon={Save}>Update Password</Button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <CardHeader title="Two-Factor Authentication" subtitle="Add an extra layer of security" />
            <div className="flex items-center justify-between mt-2">
              <div>
                <p className="text-sm font-medium text-text-primary">2FA via Authenticator App</p>
                <p className="text-xs text-text-muted">Coming soon</p>
              </div>
              <Button variant="secondary" disabled>Enable</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader title="Notification Preferences" subtitle="Configure what notifications you receive" />
          <div className="space-y-4">
            {[
              { key: 'newTenant', label: 'New Tenant Registration', desc: 'When a new tenant portal is created' },
              { key: 'paymentReceived', label: 'Payment Received', desc: 'When a subscription payment is processed' },
              { key: 'paymentFailed', label: 'Payment Failed', desc: 'When a subscription payment fails' },
              { key: 'supportTicket', label: 'New Support Ticket', desc: 'When a support ticket is created' },
              { key: 'subscriptionExpiring', label: 'Subscription Expiring', desc: 'When a subscription is about to expire' },
              { key: 'systemAlert', label: 'System Alerts', desc: 'Critical system notifications' }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-text-primary">{item.label}</p>
                  <p className="text-xs text-text-muted">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} loading={saving} icon={Save}>Save Preferences</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Platform Tab */}
      {activeTab === 'platform' && (
        <div className="space-y-6">
          <Card>
            <CardHeader title="General Settings" subtitle="Platform-wide configuration" />
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Platform Name" value={platform.platformName} onChange={(e) => setPlatform(p => ({ ...p, platformName: e.target.value }))} />
                <Input label="Support Email" type="email" value={platform.supportEmail} onChange={(e) => setPlatform(p => ({ ...p, supportEmail: e.target.value }))} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select label="Default Currency" value={platform.defaultCurrency} onChange={(e) => setPlatform(p => ({ ...p, defaultCurrency: e.target.value }))} options={[
                  { value: 'USD', label: '$ USD' },
                  { value: 'INR', label: '₹ INR' },
                  { value: 'EUR', label: '€ EUR' },
                  { value: 'GBP', label: '£ GBP' }
                ]} />
                <Select label="Default Timezone" value={platform.defaultTimezone} onChange={(e) => setPlatform(p => ({ ...p, defaultTimezone: e.target.value }))} options={[
                  { value: 'UTC', label: 'UTC' },
                  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
                  { value: 'America/New_York', label: 'America/New_York' },
                  { value: 'Europe/London', label: 'Europe/London' }
                ]} />
                <Input label="Default Trial Days" type="number" value={platform.trialDays} onChange={(e) => setPlatform(p => ({ ...p, trialDays: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} loading={saving} icon={Save}>Save Settings</Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Maintenance Mode" subtitle="Temporarily disable platform access" />
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={platform.maintenanceMode}
                  onChange={(e) => setPlatform(p => ({ ...p, maintenanceMode: e.target.checked }))}
                  className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <p className="text-sm font-medium text-text-primary">Enable Maintenance Mode</p>
                  <p className="text-xs text-text-muted">All tenant portals will show a maintenance page</p>
                </div>
              </label>
              {platform.maintenanceMode && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-700 dark:text-amber-400">⚠️ Maintenance mode is ON. All tenant-facing services will be unavailable.</p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Danger Zone" subtitle="Irreversible actions" />
            <div className="p-4 rounded-xl border-2 border-red-200 dark:border-red-900/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">Clear All Data</p>
                  <p className="text-xs text-text-muted">Permanently remove all tenant data and invoices</p>
                </div>
                <Button variant="danger">Clear Data</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
