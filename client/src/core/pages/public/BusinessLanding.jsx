import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Clock, Users, Shield, BarChart3, Smartphone, Globe, Sparkles, ChevronDown, X, Play, Send, Mail, Phone, Building2 } from 'lucide-react';
import publicApi, { startDemo } from '../../services/publicApi';
import { clsx } from 'clsx';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';

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
  { q: 'How can I get started?', a: 'Contact our sales team for a personalized demo and onboarding. We will set up your account, configure your venue, and walk you through everything.' },
  { q: 'Can I switch plans later?', a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.' },
  { q: 'Is there a setup fee?', a: 'There is no setup fee. Our team handles the entire onboarding process as part of your subscription.' },
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

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '', email: '', phone: '', businessName: '', businessType: '', message: ''
  });
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState('');

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

  const updateContact = (key, value) => setContactForm(f => ({ ...f, [key]: value }));

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactLoading(true);
    setContactError('');
    setContactSuccess(false);
    try {
      // Fetch the Web3Forms access key from the backend
      const keyRes = await publicApi.get('/web3forms-key');
      const accessKey = keyRes.data?.data?.key;

      if (!accessKey) {
        throw new Error('Web3Forms access key is not configured on the server.');
      }

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: accessKey,
          ...contactForm
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send message. Please try again.');
      }

      setContactSuccess(true);
      setContactForm({ name: '', email: '', phone: '', businessName: '', businessType: '', message: '' });
    } catch (err) {
      setContactError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setContactLoading(false);
    }
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
            <button onClick={() => setShowDemoModal(true)} className="px-8 py-3.5 text-base font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 flex items-center gap-2">
              <Play className="w-4 h-4" /> Try Demo
            </button>
            <a href="#pricing" className="px-8 py-3.5 text-base font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
              View Pricing
            </a>
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

      {/* ===== CONTACT / SALES INQUIRY ===== */}
      <section id="contact" className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left: Message */}
            <div className="lg:sticky lg:top-28">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Get Started
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
                Want VenuePro at<br />
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Your Venue?</span>
              </h2>
              <p className="mt-6 text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                Tell us about your venue and we'll set everything up for you. No self-signup needed — our team handles the entire onboarding process.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  { icon: Mail, text: 'admin@venuepro.com' },
                  { icon: Phone, text: '+91 94253 40813' },
                  { icon: Building2, text: 'Pool, turf, gaming, pickleball & more' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-100 dark:border-indigo-800/50">
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  <strong>Prefer a demo first?</strong> Try our interactive demo to explore the dashboard before you commit.
                </p>
                <button
                  onClick={() => setShowDemoModal(true)}
                  className="mt-3 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
                >
                  Try Demo
                </button>
              </div>
            </div>

            {/* Right: Form */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Send us a message</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Fill in the form and our team will get back to you within 24 hours.</p>

              {contactSuccess ? (
                <div className="text-center py-10 animate-fadeIn">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Message Sent!</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Thank you for reaching out! Our sales team will contact you within 24 hours.
                  </p>
                  <button
                    onClick={() => setContactSuccess(false)}
                    className="mt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Your Name"
                      value={contactForm.name}
                      onChange={(e) => updateContact('name', e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => updateContact('email', e.target.value)}
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Phone (optional)"
                      type="tel"
                      value={contactForm.phone}
                      onChange={(e) => updateContact('phone', e.target.value)}
                      placeholder="+91 9876543210"
                    />
                    <Input
                      label="Business Name"
                      value={contactForm.businessName}
                      onChange={(e) => updateContact('businessName', e.target.value)}
                      placeholder="My Venue"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-900 dark:text-white">
                      Business Type
                    </label>
                    <select
                      value={contactForm.businessType}
                      onChange={(e) => updateContact('businessType', e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    >
                      <option value="">Select your venue type</option>
                      {BUSINESS_TYPES.map((bt) => (
                        <option key={bt.key} value={bt.name}>{bt.icon} {bt.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-slate-900 dark:text-white">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={contactForm.message}
                      onChange={(e) => updateContact('message', e.target.value)}
                      placeholder="Tell us about your venue and requirements..."
                      required
                      rows={4}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors resize-none"
                    />
                  </div>

                  {contactError && (
                    <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                      {contactError}
                    </div>
                  )}

                  <Button
                    type="submit"
                    loading={contactLoading}
                    disabled={!contactForm.name || !contactForm.email || !contactForm.message || contactForm.message.length < 10}
                    className="w-full"
                    size="lg"
                    icon={Send}
                  >
                    Send Inquiry
                  </Button>

                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
                    We respect your privacy. No spam, ever.
                  </p>
                </form>
              )}
            </div>
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
          <p className="mt-4 text-lg text-indigo-100">Join thousands of sports facilities already using VenuePro. See why venue owners trust us.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => setShowDemoModal(true)} className="px-8 py-3.5 text-base font-medium text-indigo-700 bg-white rounded-xl hover:bg-indigo-50 transition-all shadow-lg flex items-center gap-2">
              <Play className="w-4 h-4" /> Try Demo
            </button>
            <a href="#pricing" className="px-8 py-3.5 text-base font-medium text-white bg-white/20 border border-white/30 rounded-xl hover:bg-white/30 transition-all shadow-lg">
              View Pricing
            </a>
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
                  No sign-up required. Demo auto-expires in 24 hours.
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
