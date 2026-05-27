import { useState, useEffect } from 'react';
import { useOwnerAuth } from '../../context/OwnerAuthContext';
import ownerApi from '../../services/ownerApi';
import { Card, CardHeader } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { PageLoader } from '../../components/common/Loader';
import { StatusBadge } from '../../components/common/Badge';
import { Save, Building2, Clock, Moon, Sliders, CreditCard, DollarSign, FileText, Calendar, Download } from 'lucide-react';

export default function Settings() {
  const { user } = useOwnerAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('business');
  // Billing state
  const [billing, setBilling] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Settings form fields
  const [form, setForm] = useState({
    businessName: '',
    businessPhone: '',
    businessEmail: '',
    businessAddress: '',
    openingTime: '09:00',
    closingTime: '23:00',
    nightStartHour: '18',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    sessionBaseUnit: '1'
  });

  const fetchSettings = async () => {
    try {
      const { data } = await ownerApi.get('/settings');
      const s = data.data || {};
      setSettings(s);
      setForm((prev) => ({
        ...prev,
        businessName: s.businessName || prev.businessName,
        businessPhone: s.businessPhone || prev.businessPhone,
        businessEmail: s.businessEmail || prev.businessEmail,
        businessAddress: s.businessAddress || prev.businessAddress,
        openingTime: s.openingTime || prev.openingTime,
        closingTime: s.closingTime || prev.closingTime,
        nightStartHour: s.nightStartHour || prev.nightStartHour,
        currency: s.currency || prev.currency,
        timezone: s.timezone || prev.timezone,
        sessionBaseUnit: s.sessionBaseUnit || prev.sessionBaseUnit
      }));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSettings(); }, []);

  // Fetch billing data
  const fetchBilling = async () => {
    setBillingLoading(true);
    try {
      const { data } = await ownerApi.get('/billing');
      setBilling(data.data);
      const invRes = await ownerApi.get('/billing/invoices', { params: { limit: 20 } });
      setInvoices(invRes.data.data || []);
    } catch (err) {
      console.error('Failed to load billing:', err);
    } finally {
      setBillingLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'billing') fetchBilling();
  }, [activeTab]);

  const buildSettingsArray = () => {
    return Object.entries(form).map(([key, value]) => ({ key, value: String(value) }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await ownerApi.put('/settings/bulk', { settings: buildSettingsArray() });
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert('Failed to save settings');
    } finally { setSaving(false); }
  };

  if (loading) return <PageLoader />;

  const TABS = [
    { id: 'business', label: 'Business Setup', icon: Building2 },
    { id: 'billing', label: 'Billing & Subscription', icon: CreditCard }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          <p className="text-text-muted mt-1">Configure your venue and manage your subscription</p>
        </div>
        {activeTab === 'business' && (
          <Button onClick={handleSave} loading={saving} icon={Save}>Save All</Button>
        )}
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-secondary rounded-lg p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
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

      {/* Business Setup Tab */}
      {activeTab === 'business' && (
        <>
          <Card>
            <CardHeader title="Business Information" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Business Name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder="Your venue name" />
              <Input label="Phone" type="tel" value={form.businessPhone} onChange={(e) => setForm({ ...form, businessPhone: e.target.value })} placeholder="+1 555-0000" />
              <Input label="Email" type="email" value={form.businessEmail} onChange={(e) => setForm({ ...form, businessEmail: e.target.value })} placeholder="info@myvenue.com" />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary">Address</label>
                <textarea value={form.businessAddress} onChange={(e) => setForm({ ...form, businessAddress: e.target.value })} className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-text-primary" rows={2} placeholder="123 Main St, City" />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Operating Hours" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Opening Time" type="time" value={form.openingTime} onChange={(e) => setForm({ ...form, openingTime: e.target.value })} />
              <Input label="Closing Time" type="time" value={form.closingTime} onChange={(e) => setForm({ ...form, closingTime: e.target.value })} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Configure Night Hours" subtitle="Night pricing is set per-resource. Configure when night rates apply." />
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 max-w-xs">
              <div>
                <Input label="Night Start Hour (0-23)" type="number" value={form.nightStartHour} onChange={(e) => setForm({ ...form, nightStartHour: e.target.value })} min="0" max="23" />
                <p className="text-xs text-text-muted mt-1.5">Hour when night pricing begins (e.g., 18 = 6:00 PM). Set per-resource prices in the Resources section.</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Advanced Settings" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Currency"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                options={[
                  { value: 'INR', label: 'INR (₹)' },
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'EUR', label: 'EUR (€)' },
                  { value: 'GBP', label: 'GBP (£)' },
                  { value: 'CAD', label: 'CAD (C$)' }
                ]}
              />
              <Select
                label="Timezone"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                options={[
                  { value: 'Asia/Kolkata', label: 'India (IST)' },
                  { value: 'America/New_York', label: 'Eastern (EST/EDT)' },
                  { value: 'America/Chicago', label: 'Central (CST/CDT)' },
                  { value: 'America/Denver', label: 'Mountain (MST/MDT)' },
                  { value: 'America/Los_Angeles', label: 'Pacific (PST/PDT)' },
                  { value: 'Europe/London', label: 'London (GMT/BST)' }
                ]}
              />
              <Select
                label="Session Base Unit"
                value={form.sessionBaseUnit}
                onChange={(e) => setForm({ ...form, sessionBaseUnit: e.target.value })}
                options={[
                  { value: '1', label: '1 hour' },
                  { value: '0.5', label: '30 minutes' }
                ]}
              />
            </div>

          </Card>
        </>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <>
          {billingLoading ? (
            <PageLoader />
          ) : !billing ? (
            <Card>
              <p className="text-sm text-text-muted">No billing information available.</p>
            </Card>
          ) : (
            <>
              {/* Subscription Overview */}
              <Card>
                <CardHeader title="Current Subscription" />
                {billing.subscription ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-text-muted">Plan</p>
                      <p className="text-sm font-medium text-text-primary capitalize">{billing.subscription.planSnapshot?.key || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Status</p>
                      <StatusBadge status={billing.subscription.status} />
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Billing Cycle</p>
                      <p className="text-sm font-medium text-text-primary capitalize">{billing.subscription.billingCycle || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Amount</p>
                      <p className="text-sm font-medium text-text-primary">₹{(billing.subscription.amount || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Period Start</p>
                      <p className="text-sm text-text-primary">{billing.subscription.currentPeriodStart ? new Date(billing.subscription.currentPeriodStart).toLocaleDateString() : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Period End</p>
                      <p className="text-sm text-text-primary">{billing.subscription.currentPeriodEnd ? new Date(billing.subscription.currentPeriodEnd).toLocaleDateString() : '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Total Paid</p>
                      <p className="text-sm font-medium text-text-primary">₹{(billing.subscription.totalPaid || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Last Payment</p>
                      <p className="text-sm text-text-primary">{billing.subscription.lastPaymentDate ? new Date(billing.subscription.lastPaymentDate).toLocaleDateString() : '—'}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">No active subscription. Contact support to set up billing.</p>
                )}
              </Card>

              {/* Invoice Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
                      <FileText className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Total Invoices</p>
                      <p className="text-lg font-bold text-text-primary">{billing.invoiceStats?.count || 0}</p>
                    </div>
                  </div>
                </Card>
                <Card>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Amount Paid</p>
                      <p className="text-lg font-bold text-text-primary">₹{(billing.invoiceStats?.paid || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </Card>
                <Card>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                      <Calendar className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Pending</p>
                      <p className="text-lg font-bold text-text-primary">₹{(billing.invoiceStats?.pending || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Invoice History */}
              <Card>
                <CardHeader title="Invoice History" subtitle={`${invoices.length} invoices`} />
                {invoices.length === 0 ? (
                  <p className="text-sm text-text-muted">No invoices yet.</p>
                ) : (
                  <div className="overflow-x-auto -mx-6 -mb-6">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-surface-secondary/50">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase">Invoice #</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase">Period</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {invoices.map((inv) => (
                          <tr key={inv._id} className="hover:bg-surface-secondary/50 transition-colors">
                            <td className="px-6 py-3">
                              <span className="text-sm font-mono font-medium text-text-primary">{inv.invoiceNumber}</span>
                            </td>
                            <td className="px-6 py-3 text-sm text-text-muted">
                              {inv.billingPeriodStart ? new Date(inv.billingPeriodStart).toLocaleDateString() : '—'}
                              {' — '}
                              {inv.billingPeriodEnd ? new Date(inv.billingPeriodEnd).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-6 py-3 text-sm font-medium text-text-primary">₹{(inv.totalAmount || 0).toLocaleString()}</td>
                            <td className="px-6 py-3"><StatusBadge status={inv.paymentStatus} /></td>
                            <td className="px-6 py-3 text-sm text-text-muted">{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
