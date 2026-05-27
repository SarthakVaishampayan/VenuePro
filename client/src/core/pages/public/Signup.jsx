import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Building2, User, CreditCard, Sparkles, Eye, EyeOff, Loader2 } from 'lucide-react';
import publicApi from '../../services/publicApi';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { clsx } from 'clsx';

const STEPS = [
  { id: 'business-type', title: 'Business Type', icon: Building2 },
  { id: 'account', title: 'Your Account', icon: User },
  { id: 'details', title: 'Business Details', icon: Building2 },
  { id: 'plan', title: 'Choose Plan', icon: CreditCard },
  { id: 'done', title: 'All Set!', icon: Sparkles }
];

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPlan = searchParams.get('plan') || 'free';

  const [step, setStep] = useState(0);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    // Step 1: Business type
    businessTypeKey: '',
    // Step 2: Account
    ownerName: '', ownerEmail: '', ownerPhone: '', password: '',
    // Step 3: Business details
    businessName: '', address: '', city: '', state: '', timezone: 'Asia/Kolkata', currency: 'INR',
    // Step 4: Plan
    planKey: preselectedPlan, billingCycle: 'monthly'
  });

  useEffect(() => {
    Promise.all([
      publicApi.get('/business-types'),
      publicApi.get('/subscription-plans')
    ])
      .then(([btRes, planRes]) => {
        setBusinessTypes(btRes.data.data || []);
        setPlans(planRes.data.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedType = businessTypes.find(bt => bt.key === form.businessTypeKey);
  const selectedPlan = plans.find(p => p.key === form.planKey);

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const canProceed = () => {
    switch (step) {
      case 0: return !!form.businessTypeKey;
      case 1: return form.ownerName.length >= 2 && form.ownerEmail.includes('@') && form.ownerPhone.length >= 10 && form.password.length >= 8;
      case 2: return form.businessName.length >= 2;
      case 3: return !!form.planKey;
      default: return true;
    }
  };

  const next = () => {
    setError('');
    if (canProceed()) setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const prev = () => {
    setError('');
    setStep(s => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const { data } = await publicApi.post('/auth/signup', form);
      setResult(data.data);
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Steps */}
        {step < 4 && (
          <div className="mb-10">
            <div className="flex items-center justify-between">
              {STEPS.slice(0, -1).map((s, i) => (
                <div key={s.id} className="flex items-center">
                  <div className={clsx(
                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                    i < step ? 'bg-indigo-600 text-white' : i === step ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  )}>
                    {i < step ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  {i < STEPS.length - 2 && (
                    <div className={clsx('w-12 sm:w-20 h-0.5 mx-1', i < step ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700')} />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-3">{STEPS[step].title}</p>
          </div>
        )}

        {/* Step 0: Business Type */}
        {step === 0 && (
          <Card className="animate-fadeIn">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">What type of business do you run?</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Choose the option that best describes your venue.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {businessTypes.map((bt) => (
                <button
                  key={bt.key}
                  onClick={() => { update('businessTypeKey', bt.key); update('businessName', bt.name); }}
                  className={clsx(
                    'p-4 rounded-xl border-2 text-left transition-all',
                    form.businessTypeKey === bt.key
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{bt.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 capitalize">{bt.bookingMode} mode</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-end">
              <Button onClick={next} disabled={!form.businessTypeKey} icon={ArrowRight}>Continue</Button>
            </div>
          </Card>
        )}

        {/* Step 1: Account */}
        {step === 1 && (
          <Card className="animate-fadeIn">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Create your account</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">You'll use these credentials to login to your dashboard.</p>
            <div className="space-y-4">
              <Input label="Full Name" value={form.ownerName} onChange={(e) => update('ownerName', e.target.value)} placeholder="John Doe" required />
              <Input label="Email" type="email" value={form.ownerEmail} onChange={(e) => update('ownerEmail', e.target.value)} placeholder="john@example.com" required />
              <Input label="Phone" type="tel" value={form.ownerPhone} onChange={(e) => update('ownerPhone', e.target.value)} placeholder="+91 9876543210" required />
              <div className="relative">
                <Input label="Password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Min 8 chars, 1 uppercase, 1 number" required />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && form.password.length < 8 && <p className="text-xs text-amber-600">Password must be at least 8 characters</p>}
            </div>
            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={prev} icon={ArrowLeft}>Back</Button>
              <Button onClick={next} disabled={!canProceed()} icon={ArrowRight}>Continue</Button>
            </div>
          </Card>
        )}

        {/* Step 2: Business Details */}
        {step === 2 && (
          <Card className="animate-fadeIn">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Tell us about your business</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">This information helps us set up your dashboard.</p>
            <div className="space-y-4">
              <Input label="Business Name" value={form.businessName} onChange={(e) => update('businessName', e.target.value)} placeholder="My Pool Parlour" required />
              <Input label="Address" value={form.address} onChange={(e) => update('address', e.target.value)} placeholder="123 Main Street" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="City" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="Mumbai" />
                <Input label="State" value={form.state} onChange={(e) => update('state', e.target.value)} placeholder="Maharashtra" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-900 dark:text-white">Timezone</label>
                  <select value={form.timezone} onChange={(e) => update('timezone', e.target.value)} className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-900 dark:text-white">Currency</label>
                  <select value={form.currency} onChange={(e) => update('currency', e.target.value)} className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="AED">AED (د.إ)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="SGD">SGD (S$)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={prev} icon={ArrowLeft}>Back</Button>
              <Button onClick={next} disabled={!canProceed()} icon={ArrowRight}>Continue</Button>
            </div>
          </Card>
        )}

        {/* Step 3: Plan */}
        {step === 3 && (
          <Card className="animate-fadeIn">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Choose your plan</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Start with a free trial — no credit card needed.</p>

            {/* Billing toggle */}
            <div className="flex items-center gap-2 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
              {['monthly', 'quarterly', 'yearly'].map(c => (
                <button key={c} onClick={() => update('billingCycle', c)} className={clsx('px-4 py-2 text-sm font-medium rounded-lg transition-all', form.billingCycle === c ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300')}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                  {c === 'yearly' && <span className="ml-1 text-xs text-emerald-500">-15%</span>}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {plans.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((plan) => {
                const price = plan.prices?.[form.billingCycle] || plan.prices?.monthly || 0;
                const periodLabel = form.billingCycle === 'yearly' ? '/yr' : form.billingCycle === 'quarterly' ? '/qtr' : '/mo';
                const isPopular = plan.badge === 'Most Popular';
                return (
                  <button
                    key={plan.key}
                    onClick={() => update('planKey', plan.key)}
                    className={clsx(
                      'w-full p-4 rounded-xl border-2 text-left transition-all',
                      form.planKey === plan.key
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-slate-50 dark:hover:bg-slate-800/50',
                      isPopular && 'ring-1 ring-indigo-500'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{plan.name}</p>
                          {plan.badge && <span className={clsx('px-2 py-0.5 text-xs font-medium rounded-full', isPopular ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500')}>{plan.badge}</span>}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{plan.description}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-slate-900 dark:text-white">₹{price}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{periodLabel}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {error && <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-400">{error}</div>}

            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={prev} icon={ArrowLeft}>Back</Button>
              <Button onClick={handleSubmit} loading={submitting} icon={Sparkles}>Create Account</Button>
            </div>
          </Card>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <Card className="animate-scaleIn text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">You're all set!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Your account has been created successfully.</p>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 mb-6 text-left space-y-3">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Business</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{result?.tenant?.businessName}</p>
              </div>
              {selectedType && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Business Type</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{selectedType.name}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Plan</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{result?.subscription?.plan} Plan</p>
              </div>
              {result?.subscription?.trialEndsAt && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium">Trial Ends</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{new Date(result.subscription.trialEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button onClick={() => navigate('/')} className="w-full" icon={ArrowRight}>Go to Dashboard</Button>
              <Button variant="ghost" onClick={() => navigate('/')} className="w-full">Back to Home</Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
