import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Sparkles, Calendar, CreditCard, UserCircle, TrendingUp,
  Shield, Smartphone, Clock, ArrowRight, ChevronDown,
  Check, Star, Users, Building2, Menu, X, Moon, Sun
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { clsx } from 'clsx';

const STEPS = [
  {
    number: '01',
    title: 'Create Your Account',
    description: 'Sign up in seconds with your email or phone. No credit card needed.',
    icon: UserCircle
  },
  {
    number: '02',
    title: 'Play at Partner Venues',
    description: 'Visit any partner venue and play — your sessions get tracked automatically.',
    icon: Calendar
  },
  {
    number: '03',
    title: 'Play & Track Everything',
    description: 'View your sessions, payments, and dues — all in one place.',
    icon: TrendingUp
  }
];

const FEATURES = [
  {
    icon: Calendar,
    title: 'Session History',
    description: 'View all your past sessions across every venue you play at — all in one timeline.',
    gradient: 'from-violet-500 to-purple-500'
  },
  {
    icon: CreditCard,
    title: 'Payment Hub',
    description: 'Track payments, view dues, and manage your balance with ease.',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    icon: Clock,
    title: 'Session History',
    description: 'See exactly when you played, for how long, and what you paid.',
    gradient: 'from-indigo-500 to-violet-500'
  },
  {
    icon: UserCircle,
    title: 'Player Profile',
    description: 'One profile works across all partner venues. Update your details anytime.',
    gradient: 'from-blue-500 to-indigo-500'
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'Your data is encrypted and secure. You control what venues can see.',
    gradient: 'from-emerald-500 to-teal-500'
  },
  {
    icon: Smartphone,
    title: 'Mobile Friendly',
    description: 'Works perfectly on your phone. Check sessions and payments on the go.',
    gradient: 'from-orange-500 to-amber-500'
  }
];

const TESTIMONIALS = [
  {
    name: 'Arjun M.',
    text: 'I play at 3 different pool parlours and now I can see all my sessions and payments in one place. Game changer!',
    rating: 5,
    game: '🎱 Pool'
  },
  {
    name: 'Priya K.',
    text: 'The dues tracking is amazing. I never forget how much I owe at my cricket turf anymore.',
    rating: 5,
    game: '🏏 Cricket'
  },
  {
    name: 'Rahul S.',
    text: 'I love being able to check my payment history and dues across all venues from one account.',
    rating: 5,
    game: '🏓 Pickleball'
  }
];

export default function PlayerLanding() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const FAQS = [
    { q: 'How do I sign up?', a: 'Click "Get Started" above, enter your name, email or phone number, and create a password. It takes less than 30 seconds.' },
    { q: 'Is it free for players?', a: 'Absolutely! Creating an account and using the Player Hub is completely free. You only pay the venues directly for your sessions.' },
    { q: 'Can I play at multiple venues?', a: 'Yes! Your single Player Hub account works across all partner venues — pool parlours, cricket turfs, pickleball courts, and gaming zones.' },
    { q: 'How do I pay?', a: 'Each venue handles its own payments. The Player Hub helps you track what you\'ve paid and what you still owe at each venue.' },
    { q: 'Is my data safe?', a: 'Your personal information is encrypted and secure. We never share your data with third parties without your consent.' },
    { q: 'Can I update my profile?', a: 'Yes! You can edit your name, phone, email, and password anytime from your Profile page in the Player Hub.' }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">VenuePro</span>
              <span className="hidden sm:inline text-xs text-violet-600 dark:text-violet-400 font-medium ml-1 px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30">
                Player Hub
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#how-it-works" className="text-sm text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">How It Works</a>
              <a href="#features" className="text-sm text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Features</a>
              <a href="#testimonials" className="text-sm text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">Testimonials</a>
              <a href="#faq" className="text-sm text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">FAQ</a>

              <div className="h-5 w-px bg-slate-300 dark:bg-slate-600" />

              <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Admin Access - subtle link to business portal */}
              <Link
                to="/portal"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Building2 className="w-4 h-4" />
                Admin
              </Link>

              <Link
                to="/play/login"
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Sign In
              </Link>

              <button
                onClick={() => navigate('/play/signup')}
                className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25"
              >
                Get Started
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center gap-2 md:hidden">
              <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <div className="md:hidden pb-4 border-t border-slate-200 dark:border-slate-700 mt-2 pt-4 space-y-2">
              <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">How It Works</a>
              <a href="#features" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Features</a>
              <a href="#testimonials" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Testimonials</a>
              <a href="#faq" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">FAQ</a>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2" />
              <Link to="/portal" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <Building2 className="w-4 h-4" /> Admin Access
              </Link>
              <Link to="/play/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-violet-600 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/40 rounded-lg">Sign In</Link>
              <button onClick={() => { navigate('/play/signup'); setMobileOpen(false); }} className="w-full px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-lg">Get Started</button>
            </div>
          )}
        </nav>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative pt-20 pb-24 sm:pt-28 sm:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950" />
        <div className="absolute top-0 -left-40 w-[500px] h-[500px] bg-violet-300/20 dark:bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-40 w-[600px] h-[600px] bg-purple-300/20 dark:bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-300/10 dark:bg-indigo-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Your universal sports & gaming companion
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight max-w-4xl mx-auto">
            Everything You Need<br />
            <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 dark:from-violet-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
              to Play & Track
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Play at pool tables, cricket turfs, pickleball courts, and gaming zones. Track your sessions, payments, and dues — all with one account across every venue.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/play/signup')}
              className="px-8 py-3.5 text-base font-medium text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 flex items-center gap-2"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/play/login')}
              className="px-8 py-3.5 text-base font-medium text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-all"
            >
              Sign In
            </button>
          </div>
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> Free to join</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> One account, all venues</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> Track everything</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-500" /> No spam, ever</span>
          </div>
        </div>
      </section>

      {/* ===== STATS BANNER ===== */}
      <section className="py-12 bg-slate-50 dark:bg-slate-800/50 border-y border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { number: '10K+', label: 'Active Players' },
              { number: '500+', label: 'Partner Venues' },
              { number: '50K+', label: 'Sessions Tracked' },
              { number: '4.9★', label: 'Player Rating' }
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">{stat.number}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">How It Works</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Getting started takes less than a minute. Then play, track, and stay on top of your activity across all your favourite venues.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="relative group">
                  <div className="text-5xl font-bold text-violet-100 dark:text-violet-900/40 group-hover:text-violet-200 dark:group-hover:text-violet-800/40 transition-colors leading-none mb-4">
                    {step.number}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{step.description}</p>
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-8 -right-4 text-violet-300 dark:text-violet-600">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="py-20 bg-slate-50 dark:bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Everything in Your Player Hub</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              One account gives you access to all the tools you need to manage your sports and gaming life.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-700 transition-all hover:shadow-lg hover:shadow-violet-500/5"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section id="testimonials" className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Loved by Players</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Here's what players like you say about the VenuePro Player Hub.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-700 transition-all">
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.name}</p>
                  <span className="text-sm">{t.game}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-20 bg-slate-50 dark:bg-slate-800/30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Questions? We've got answers</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">Everything you need to know about the Player Hub.</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800/50">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
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
      <section className="py-20 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Ready to Play?</h2>            <p className="mt-4 text-lg text-violet-100">Join thousands of players already using VenuePro to play, track, and manage their activity.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/play/signup')}
              className="px-8 py-3.5 text-base font-medium text-violet-700 bg-white rounded-xl hover:bg-violet-50 transition-all shadow-lg flex items-center gap-2"
            >
              Create Free Account <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/play/login')}
              className="px-8 py-3.5 text-base font-medium text-white bg-white/20 border border-white/30 rounded-xl hover:bg-white/30 transition-all shadow-lg"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-slate-900 dark:bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <span className="text-base font-bold text-white">VenuePro</span>
              </Link>
              <p className="text-sm text-slate-400 max-w-sm">
                The complete player hub for sports and gaming venues. One account, endless play.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Player Hub</h4>
              <ul className="space-y-2">
                <li><Link to="/play/signup" className="text-sm text-slate-400 hover:text-violet-400 transition-colors">Sign Up</Link></li>
                <li><Link to="/play/login" className="text-sm text-slate-400 hover:text-violet-400 transition-colors">Sign In</Link></li>
                <li><a href="#how-it-works" className="text-sm text-slate-400 hover:text-violet-400 transition-colors">How It Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">Explore</h4>
              <ul className="space-y-2">
                <li><Link to="/venues" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">Live Availability</Link></li>
                <li><Link to="/business" className="text-sm text-slate-400 hover:text-violet-400 transition-colors">For Venue Owners</Link></li>
                <li><Link to="/portal" className="text-sm text-slate-400 hover:text-violet-400 transition-colors">Admin Portal</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} VenuePro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
