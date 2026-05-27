import { useState, useEffect } from 'react';
import { DollarSign, Search, Check, X } from 'lucide-react';
import api from '../../services/api';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import Select from './Select';

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' }
];

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' }
];

export default function RecordPaymentModal({ open, onClose, onSuccess, tenantId: preselectedTenantId }) {
  const [step, setStep] = useState('tenant'); // tenant, details, confirm, done
  const [tenants, setTenants] = useState([]);
  const [plans, setPlans] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form state
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [amount, setAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [extendPeriod, setExtendPeriod] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch tenants and plans on mount
  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      setTenantsLoading(true);
      try {
        const [tenantRes, planRes] = await Promise.all([
          api.get('/tenants', { params: { limit: 200 } }),
          api.get('/subscription-plans', { params: { active: 'true' } })
        ]);
        setTenants(tenantRes.data.data || []);
        setPlans(planRes.data.data || []);
      } catch (err) {
        console.error('Failed to load data for payment:', err);
      } finally {
        setTenantsLoading(false);
      }
    };
    fetchData();
  }, [open]);

  // Reset form on open
  useEffect(() => {
    if (open) {
      setStep(preselectedTenantId ? 'details' : 'tenant');
      setSelectedTenant(preselectedTenantId ? { _id: preselectedTenantId } : null);
      setSelectedPlan(null);
      setBillingCycle('monthly');
      setAmount(0);
      setPaymentMode('cash');
      setPaymentReference('');
      setNotes('');
      setExtendPeriod(true);
      setError('');
      setSearch('');
    }
  }, [open, preselectedTenantId]);

  // Auto-fill amount when plan changes
  useEffect(() => {
    if (selectedPlan) {
      const price = selectedPlan.prices?.[billingCycle];
      if (price > 0) setAmount(price);
    }
  }, [selectedPlan, billingCycle]);

  const filteredTenants = tenants.filter(t =>
    !search || t.businessName?.toLowerCase().includes(search.toLowerCase()) ||
    t.ownerName?.toLowerCase().includes(search.toLowerCase()) ||
    t.tenantCode?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectTenant = async (tenant) => {
    setSelectedTenant(tenant);
    // Try to find existing subscription to pre-fill plan
    try {
      const subRes = await api.get('/subscriptions', { params: { search: tenant.businessName, limit: 1 } });
      const existingSub = subRes.data.data?.[0];
      if (existingSub?.planId) {
        setSelectedPlan(existingSub.planId);
        setBillingCycle(existingSub.billingCycle || 'monthly');
        setAmount(existingSub.amount || 0);
      }
    } catch (err) {
      // Ignore - just start fresh
    }
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!selectedTenant || !paymentMode) {
      setError('Please fill all required fields');
      return;
    }
    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        tenantId: selectedTenant._id,
        planId: selectedPlan?._id || undefined,
        billingCycle,
        amount,
        paymentMode,
        paymentReference: paymentReference || undefined,
        notes: notes || undefined,
        extendPeriod
      };
      const { data } = await api.post('/subscriptions/record-payment', payload);
      setStep('done');
      onSuccess?.(data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (step === 'done') {
      onClose?.();
      setStep('tenant');
    } else {
      onClose?.();
    }
  };

  // Calculate amounts for display
  const planPrice = selectedPlan?.prices?.[billingCycle] || 0;
  const discountPercent = selectedPlan?.discountPercent || 0;
  const finalAmount = discountPercent > 0 ? amount * (1 - discountPercent / 100) : amount;

  return (
    <Modal open={open} onClose={handleClose} title="Record Payment" size="lg">
      {/* Step 1: Select Tenant */}
      {step === 'tenant' && (
        <div className="space-y-4">
          <p className="text-sm text-text-muted">Search and select the tenant to record a payment for.</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by business name, owner, or tenant code..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary placeholder:text-text-muted"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-lg divide-y divide-border">
            {tenantsLoading ? (
              <div className="p-8 text-center text-sm text-text-muted">Loading tenants...</div>
            ) : filteredTenants.length === 0 ? (
              <div className="p-8 text-center text-sm text-text-muted">No tenants found matching your search.</div>
            ) : (
              filteredTenants.map((t) => (
                <button
                  key={t._id}
                  onClick={() => handleSelectTenant(t)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-secondary transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{t.businessName}</p>
                    <p className="text-xs text-text-muted">{t.ownerName} · {t.tenantCode}</p>
                  </div>
                  <span className="text-xs text-text-muted capitalize">{t.subscription?.status || '—'}</span>
                </button>
              ))
            )}
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Step 2: Payment Details */}
      {step === 'details' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary">
            <div className="w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{selectedTenant?.businessName}</p>
              <p className="text-xs text-text-muted">{selectedTenant?.ownerEmail} · {selectedTenant?.tenantCode}</p>
            </div>
            <button
              onClick={() => setStep('tenant')}
              className="ml-auto p-1 rounded text-text-muted hover:text-text-primary hover:bg-surface-tertiary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Subscription Plan"
              value={selectedPlan?._id || ''}
              onChange={(e) => {
                const plan = plans.find(p => p._id === e.target.value);
                setSelectedPlan(plan || null);
              }}
              options={[
                { value: '', label: '— No plan selected —' },
                ...plans.map(p => ({ value: p._id, label: `${p.name} (₹${p.prices?.monthly || 0}/mo)` }))
              ]}
            />
            <Select
              label="Billing Cycle"
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value)}
              options={BILLING_CYCLES}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (₹)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              min="0"
              step="1"
              placeholder="0"
            />
            <Select
              label="Payment Mode"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              options={PAYMENT_MODES}
            />
          </div>

          <Input
            label="Reference / Transaction ID"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="Optional reference number"
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary placeholder:text-text-muted"
              rows={2}
              placeholder="Optional notes about this payment"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={extendPeriod}
              onChange={(e) => setExtendPeriod(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-text-primary">Extend subscription period</span>
          </label>

          {selectedPlan && planPrice > 0 && amount !== planPrice && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                ⚠️ The amount (₹{amount}) differs from the plan price (₹{planPrice} for {billingCycle}). Make sure this is intentional.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setStep('tenant')}>Back</Button>
            <Button onClick={handleSubmit} loading={saving} icon={DollarSign}>
              Record Payment — ₹{amount.toLocaleString()}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === 'done' && (
        <div className="py-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Payment Recorded!</h3>
            <p className="text-sm text-text-muted mt-1">
              ₹{(amount || 0).toLocaleString()} payment recorded for {selectedTenant?.businessName}.
              An invoice has been generated automatically.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setStep('tenant'); setSelectedTenant(null); }}>
              Record Another Payment
            </Button>
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
