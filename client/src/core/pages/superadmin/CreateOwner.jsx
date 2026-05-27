import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, CreditCard, CheckCircle, Download, ArrowLeft,
  ArrowRight, Copy, Eye, EyeOff
} from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { Card } from '../../components/common/Card';

const steps = [
  { id: 1, label: 'Business Type' },
  { id: 2, label: 'Business Info' },
  { id: 3, label: 'Subscription' },
  { id: 4, label: 'Review & Create' }
];

export default function CreateOwner() {
  const [currentStep, setCurrentStep] = useState(1);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    businessTypeId: '',
    businessName: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    address: { street: '', city: '', state: '', country: 'India' },
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    planKey: 'free',
    billingCycle: 'monthly',
    trialDays: 14
  });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [btRes, plansRes] = await Promise.all([
          api.get('/business-types'),
          api.get('/subscription-plans')
        ]);
        setBusinessTypes(btRes.data.data);
        setPlans(plansRes.data.data);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = () => {
    setError('');
    switch (currentStep) {
      case 1:
        if (!form.businessTypeId) { setError('Please select a business type'); return false; }
        return true;
      case 2:
        if (!form.businessName) { setError('Business name is required'); return false; }
        if (!form.ownerName) { setError('Owner name is required'); return false; }
        if (!form.ownerEmail) { setError('Owner email is required'); return false; }
        if (!form.ownerPhone) { setError('Owner phone is required'); return false; }
        return true;
      case 3:
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep()) {
      setCurrentStep(s => Math.min(s + 1, 4));
    }
  };

  const prevStep = () => {
    setCurrentStep(s => Math.max(s - 1, 1));
    setError('');
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/tenants', form);
      setResult(data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create tenant');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Portal Created!</h1>
          <p className="text-text-muted mt-1">Tenant provisioned successfully</p>
        </div>

        <Card>
          <h3 className="text-lg font-semibold text-text-primary mb-4">Credentials</h3>
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                ⚠️ Save these credentials — they won't be shown again!
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                <div>
                  <p className="text-xs text-text-muted">Owner Email</p>
                  <p className="text-sm font-medium text-text-primary">{result.tenant.ownerEmail}</p>
                </div>
                <button onClick={() => copyToClipboard(result.tenant.ownerEmail)} className="p-1.5 rounded hover:bg-surface-tertiary">
                  <Copy className="w-4 h-4 text-text-muted" />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                <div>
                  <p className="text-xs text-text-muted">Temporary Password</p>
                  <p className="text-sm font-mono font-medium text-text-primary">{result.tempPassword}</p>
                </div>
                <button onClick={() => copyToClipboard(result.tempPassword)} className="p-1.5 rounded hover:bg-surface-tertiary">
                  <Copy className="w-4 h-4 text-text-muted" />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                <div>
                  <p className="text-xs text-text-muted">Portal URL</p>
                  <p className="text-sm font-medium text-text-primary">/owner/login</p>
                </div>
                <Button size="sm" variant="ghost" icon={Download}>Download PDF</Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/superadmin/owners')}>
            Go to Owners
          </Button>
          <Button onClick={() => { setResult(null); setCurrentStep(1); setForm({ ...form, businessName: '', ownerName: '', ownerEmail: '', ownerPhone: '' }); }}>
            Create Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Create Portal</h1>
        <p className="text-text-muted mt-1">Provision a new tenant portal</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= s.id ? 'bg-primary-600 text-white' : 'bg-surface-tertiary text-text-muted'
            }`}>
              {currentStep > s.id ? <CheckCircle className="w-4 h-4" /> : s.id}
            </div>
            <span className={`text-sm hidden sm:block ${currentStep >= s.id ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${currentStep > s.id ? 'bg-primary-500' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card>
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Select Business Type</h2>
            <p className="text-sm text-text-muted">Choose the type of business for this tenant.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {businessTypes.map((bt) => (
                <button
                  key={bt._id}
                  onClick={() => setForm(prev => ({ ...prev, businessTypeId: bt._id }))}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    form.businessTypeId === bt._id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-border hover:border-gray-400'
                  }`}
                >
                  <p className="font-medium text-text-primary">{bt.name}</p>
                  <p className="text-sm text-text-muted mt-1">
                    {bt.labels?.resourcePlural} · {bt.bookingMode} mode
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Business Information</h2>
            <p className="text-sm text-text-muted">Enter the owner and business details.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Business Name" value={form.businessName} onChange={(e) => updateForm('businessName', e.target.value)} placeholder="My Sports Parlour" required />
              <Input label="Owner Name" value={form.ownerName} onChange={(e) => updateForm('ownerName', e.target.value)} placeholder="John Doe" required />
              <Input label="Owner Email" type="email" value={form.ownerEmail} onChange={(e) => updateForm('ownerEmail', e.target.value)} placeholder="owner@email.com" required />
              <Input label="Owner Phone" value={form.ownerPhone} onChange={(e) => updateForm('ownerPhone', e.target.value)} placeholder="+919876543210" required />
              <Input label="City" value={form.address.city} onChange={(e) => setForm(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))} placeholder="Mumbai" />
              <Input label="State" value={form.address.state} onChange={(e) => setForm(prev => ({ ...prev, address: { ...prev.address, state: e.target.value } }))} placeholder="Maharashtra" />
              <Select label="Timezone" value={form.timezone} onChange={(e) => updateForm('timezone', e.target.value)} options={[{ value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' }, { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' }, { value: 'America/New_York', label: 'America/New_York (EST)' }, { value: 'Europe/London', label: 'Europe/London (GMT)' }]} />
              <Select label="Currency" value={form.currency} onChange={(e) => updateForm('currency', e.target.value)} options={[{ value: 'INR', label: '₹ INR' }, { value: 'USD', label: '$ USD' }, { value: 'EUR', label: '€ EUR' }, { value: 'AED', label: 'د.إ AED' }]} />
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Subscription Plan</h2>
            <p className="text-sm text-text-muted">Choose a plan and billing cycle.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plans.map((plan) => (
                <button
                  key={plan._id}
                  onClick={() => updateForm('planKey', plan.key)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    form.planKey === plan.key
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-border hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-text-primary">{plan.name}</p>
                    {plan.badge && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-muted mt-1">${plan.prices?.monthly || 0}/mo</p>
                  <p className="text-xs text-text-muted mt-1">{plan.limits?.resources || 5} resources, {plan.limits?.staff || 2} staff</p>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select label="Billing Cycle" value={form.billingCycle} onChange={(e) => updateForm('billingCycle', e.target.value)} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'yearly', label: 'Yearly' }]} />
              <Input label="Trial Days" type="number" value={form.trialDays} onChange={(e) => updateForm('trialDays', parseInt(e.target.value) || 0)} min={0} max={90} />
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Review & Confirm</h2>
            <p className="text-sm text-text-muted">Please review the details before creating the portal.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-surface-secondary rounded-xl">
              <div>
                <p className="text-xs text-text-muted">Business Type</p>
                <p className="text-sm font-medium text-text-primary">{businessTypes.find(bt => bt._id === form.businessTypeId)?.name}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Business Name</p>
                <p className="text-sm font-medium text-text-primary">{form.businessName}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Owner</p>
                <p className="text-sm font-medium text-text-primary">{form.ownerName} · {form.ownerEmail}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Phone</p>
                <p className="text-sm font-medium text-text-primary">{form.ownerPhone}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Plan</p>
                <p className="text-sm font-medium text-text-primary capitalize">{form.planKey} · {form.billingCycle}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Trial</p>
                <p className="text-sm font-medium text-text-primary">{form.trialDays} days</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}
      </Card>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={currentStep === 1 ? () => navigate('/superadmin/owners') : prevStep}
          icon={ArrowLeft}
        >
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </Button>
        {currentStep < 4 ? (
          <Button onClick={nextStep} icon={ArrowRight}>
            Continue
          </Button>
        ) : (
          <Button onClick={handleSubmit} loading={submitting} icon={CheckCircle}>
            Create Portal
          </Button>
        )}
      </div>
    </div>
  );
}
