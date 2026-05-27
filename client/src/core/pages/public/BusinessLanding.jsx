import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Clock, Users, Shield, BarChart3, Smartphone, Globe, Sparkles, ChevronDown, X, Play } from 'lucide-react';
import publicApi, { startDemo } from '../../services/publicApi';
import { clsx } from 'clsx';

const BUSINESS_TYPES = [
  { key: 'pool_snooker', name: 'Pool & Snooker Parlour', icon: '🎱', description: 'Tables, sessions, timer-based billing' },
  { key: 'cricket_football', name: 'Cricket / Football Turf', icon: '🏏', description: 'Turf booking, duration-based sessions' },
  { key: 'pickleball', name: 'Pickleball Court', icon: '🏓', description: 'Court booking, duration-based sessions' },
  { key: 'gaming_zone', name: 'Gaming Zone', icon: '🎮', description: 'Console/PC/VR session billing' },
];

const FEATURES = [
  { icon: Clock, title: 'Session Timer', description: 'Auto 5-min rounding timer prevents disputes over partial minutes.' },
  { icon: Users, title: 'Customer Management', description: 'Track regulars, dues, and booking history with partial payment support.' },
  { icon: Shield, title: 'Staff Controls', description: 'Role-based access for managers, staff, and cashiers with permissions.' },
  { icon: BarChart3, title: 'Analytics & Reports', description: 'Revenue trends, payment splits, and resource utilization insights.' },
  { icon: Smartphone, title: 'Mobile-Optimized', description: 'Works on any device — phone, tablet, or desktop.' },
  { icon: Globe, title: 'Multi-Business Types', description: 'Pool, snooker, turf, gaming — one platform for any venue.' }
];

const FAQS = [
  { q: 'How does the free trial work?', a: 'Sign up for a 14-day free trial with full access to all features. No credit card required. After the trial, choose a plan that fits your needs.' },
  { q: 'Can I switch plans later?', a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.' },
  { q: 'Is there a setup fee?', a: 'No setup fee for self-service signup. Enterprise customers can request white-glove onboarding for a one-time fee.' },
  { q: 'What payment methods do you accept?', a: 'Subscription fees are collected via bank transfer, UPI, or cheque. Your customers can pay you via cash or online.' },
  { q: 'Can I use VenuePro for multiple locations?', a: 'Yes! The Professional and Enterprise plans support multiple branches with centralized management.' },
  { q: 'Is my data secure?', a: 'Absolutely. We use encryption at rest and in transit, strict tenant isolation, and regular security audits.' }
];

export default function BusinessLanding() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState('');

  useEffect(() => {
    publicApi.get('/subscription-plans')
      .then(({ data }) => setPlans(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleStartDemo = async (businessTypeKey) => {
    setDemoLoading(true);
    setDemoError('');
    try {
      const res = await startDemo(businessTypeKey);
      const { accessToken, refreshToken, user } = res.data;
      localStorage.setItem('ownerAccessToken', accessToken);
      localStorage.setItem('ownerRefreshToken', refreshToken);
      localStorage.setItem('ownerUser', JSON.stringify(user));
      setShowDemoModal(false);
      navigate('/owner/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to start demo. Please try again.';
      setDemoError(msg);
    } finally {
      setDemoLoading(false);
    }
  };

  const getPrice = (plan) => {
    const prices = plan.prices || {};
    if (billingCycle === 'yearly') return prices.yearly || prices.monthly * 12 * 0.85;
    if (billingCycle === 'quarterly') return prices.quarterly || prices.monthly * 3;
    return prices.monthly || 0;
  };

  const getPeriodLabel = () => {
    if (billingCycle === 'yearly') return '/year';
    if (billingCycle === 'quarterly') return '/quarter';
    return '/month';
  };

  return (
    <div className="overflow-hidden">
      {/* ===== HERO ===== */}
      <section className="relative pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            The all-in-one platform for sports facilities
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight max-w-4xl mx-auto">
            Run Your Sports Facility<br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Smarter, Not Harder</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Manage sessions, track payments, handle dues, and grow your business — all from one powerful dashboard.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/signup')} className="px-8 py-3.5 text-base font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 flex items-center gap-2">
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => setShowDemoModal(true)} className="px-8 py-3.5 text-base font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all shadow-lg flex items-center gap-2">
              <Play className="w-4 h-4" /> Try Demo
            </button>
            <a href="#pricing" className="px-8 py-3.5 text-base font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
              View Pricing
            </a>
          </div>
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> 14-day free trial</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> Cancel anytime</span>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Everything you need to run your venue</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              From session timers to staff management — VenuePro handles it all.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div key={i} className="group p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700 transition-all hover:shadow-md">
                <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="py-20 bg-slate-50 dark:bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">No hidden fees. No transaction costs.</p>
            <div className="mt-6 inline-flex items-center gap-3 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              {['monthly', 'quarterly', 'yearly'].map((cycle) => (
                <button
                  key={cycle}
                  onClick={() => setBillingCycle(cycle)}
                  className={clsx(
                    'px-4 py-2 text-sm font-medium rounded-lg transition-all',
                    billingCycle === cycle
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                  {cycle === 'yearly' && <span className="ml-1 text-xs opacity-80">-15%</span>}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((plan) => {
                const price = getPrice(plan);
                const isPopular = plan.badge === 'Most Popular';
                return (
                  <div key={plan._id} className={clsx(
                    'relative p-6 rounded-2xl border-2 transition-all',
                    isPopular
                      ? 'bg-white dark:bg-slate-800 border-indigo-500 shadow-xl shadow-indigo-500/10 scale-105'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  )}>
                    {plan.badge && (
                      <span className={clsx(
                        'absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-semibold rounded-full',
                        isPopular ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      )}>
                        {plan.badge}
                      </span>
                    )}
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{plan.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{plan.description}</p>
                      <div className="mt-4">
                        <span className="text-4xl font-bold text-slate-900 dark:text-white">₹{Math.round(price)}</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{getPeriodLabel()}</span>
                      </div>
                    </div>
                    <ul className="mt-6 space-y-3">
                      {(plan.features || []).slice(0, 6).map((feat, i) => {
                        const name = typeof feat === 'string' ? feat : feat.name || feat.key;
                        const included = typeof feat === 'string' ? true : feat.included !== false;
                        return (
                          <li key={i} className={clsx('flex items-start gap-2 text-sm', included ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 line-through')}>
                            <Check className={clsx('w-4 h-4 mt-0.5 flex-shrink-0', included ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600')} />
                            {name}
                          </li>
                        );
                      })}
                    </ul>
                    <button
                      onClick={() => navigate(`/signup?plan=${plan.key}`)}
                      className={clsx(
                        'w-full mt-6 px-4 py-2.5 text-sm font-medium rounded-xl transition-all',
                        isPopular
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
                      )}
                    >
                      {plan.key === 'free' ? 'Get Started' : 'Start Free Trial'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Frequently asked questions</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">Everything you need to know about VenuePro.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-900 dark:text-white pr-4">{faq.q}</span>
                  <ChevronDown className={clsx('w-4 h-4 text-slate-400 flex-shrink-0 transition-transform', openFaq === i && 'rotate-180')} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 to-purple-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Ready to transform your venue?</h2>
          <p className="mt-4 text-lg text-indigo-100">Join thousands of sports facilities already using VenuePro. Start your free trial today.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/signup')} className="px-8 py-3.5 text-base font-medium text-indigo-700 bg-white rounded-xl hover:bg-indigo-50 transition-all shadow-lg flex items-center gap-2">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => setShowDemoModal(true)} className="px-8 py-3.5 text-base font-medium text-white bg-white/20 border border-white/30 rounded-xl hover:bg-white/30 transition-all shadow-lg flex items-center gap-2">
              <Play className="w-4 h-4" /> Try Demo
            </button>
          </div>
        </div>
      </section>

      {/* ===== DEMO MODAL ===== */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={() => !demoLoading && setShowDemoModal(false)}>
          <div className="w-full max-w-lg mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scaleIn" onClick={e => e.stopPropagation()}>
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Try VenuePro</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select your business type to start a demo</p>
                </div>
                <button
                  onClick={() => setShowDemoModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {demoError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                  {demoError}
                </div>
              )}

              <div className="space-y-3">
                {BUSINESS_TYPES.map((bt) => (
                  <button
                    key={bt.key}
                    onClick={() => handleStartDemo(bt.key)}
                    disabled={demoLoading}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    <span className="text-2xl">{bt.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{bt.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{bt.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  No sign-up required. Demo auto-expires in 24 hours.{' '}
                  <button onClick={() => { setShowDemoModal(false); navigate('/signup'); }} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                    Sign up free instead
                  </button>
                </p>
              </div>

              {demoLoading && (
                <div className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 rounded-2xl flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-slate-600 dark:text-slate-300">Setting up your demo...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
