import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, MapPin, Building2, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Wrench, Hash, Sparkles,
  RefreshCw, Filter, Moon, Sun, Menu, X, Users
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getVenues, getVenueResources } from '../../services/publicApi';
import LiveTimer from '../../components/common/LiveTimer';

const BUSINESS_ICONS = {
  pool_snooker: '🎱',
  cricket_football: '🏏',
  pickleball: '🏓',
  gaming_zone: '🎮',
  unknown: '🏟️'
};

const STATUS_CONFIG = {
  available: { icon: CheckCircle, label: 'Available', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', dot: 'bg-emerald-500' },
  occupied: { icon: XCircle, label: 'Occupied', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', dot: 'bg-red-500' },
  maintenance: { icon: Wrench, label: 'Maintenance', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', dot: 'bg-amber-500' },
  disabled: { icon: XCircle, label: 'Disabled', color: 'text-slate-400 dark:text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800', dot: 'bg-slate-400' }
};

const BUSINESS_TYPES = [
  { key: 'pool_snooker', label: 'Pool & Snooker', icon: '🎱' },
  { key: 'cricket_football', label: 'Cricket/Football', icon: '🏏' },
  { key: 'pickleball', label: 'Pickleball', icon: '🏓' },
  { key: 'gaming_zone', label: 'Gaming Zone', icon: '🎮' }
];

export default function Venues() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedVenue, setExpandedVenue] = useState(null);
  const [venueResources, setVenueResources] = useState({});
  const [resourcesLoading, setResourcesLoading] = useState({});
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getVenues();
      setVenues(res.data?.data || []);
    } catch (err) {
      setError('Failed to load venues. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVenue = async (venueId) => {
    if (expandedVenue === venueId) {
      setExpandedVenue(null);
      return;
    }

    setExpandedVenue(venueId);

    // Load resources if not already loaded
    if (!venueResources[venueId]) {
      setResourcesLoading(prev => ({ ...prev, [venueId]: true }));
      try {
        const res = await getVenueResources(venueId);
        setVenueResources(prev => ({ ...prev, [venueId]: res.data?.data?.resources || [] }));
      } catch (err) {
        console.error('Failed to load resources for venue:', venueId, err);
        setVenueResources(prev => ({ ...prev, [venueId]: [] }));
      } finally {
        setResourcesLoading(prev => ({ ...prev, [venueId]: false }));
      }
    }
  };

  // Apply search + type filter
  const filteredVenues = venues.filter(v => {
    const matchesSearch = !searchTerm ||
      v.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.businessTypeName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || v.businessType === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-700">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">VenuePro</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-4">
              <Link to="/" className="text-sm text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                Home
              </Link>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                <Hash className="w-4 h-4" />
                Live Availability
              </span>
              <Link to="/business" className="text-sm text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                For Venues
              </Link>

              <div className="h-5 w-px bg-slate-300 dark:bg-slate-600" />

              <Link to="/play/login" className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <Users className="w-4 h-4" />
                Player Hub
              </Link>
              <Link to="/portal" className="px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                Admin
              </Link>

              <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            {/* Mobile buttons */}
            <div className="flex items-center gap-2 md:hidden">
              <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div className="md:hidden pb-4 border-t border-slate-200 dark:border-slate-700 mt-2 pt-4 space-y-2">
              <Link to="/" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Home</Link>
              <Link to="/venues" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-medium text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 rounded-lg">Live Availability</Link>
              <Link to="/business" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">For Venues</Link>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2" />
              <Link to="/play/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Player Hub</Link>
              <Link to="/portal" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Admin Portal</Link>
            </div>
          )}
        </nav>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="relative pt-16 pb-12 sm:pt-20 sm:pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-300/20 dark:bg-violet-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-sm font-medium mb-6">
              <Hash className="w-4 h-4" />
              Live Resource Availability
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
              Find What's Available<br />
              <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 dark:from-violet-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Right Now
              </span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              Browse pool tables, cricket turfs, pickleball courts, and gaming zones near you.
              See real-time availability — no sign-up required.
            </p>
          </div>
        </div>
      </section>

      {/* ===== SEARCH & FILTERS ===== */}
      <section className="pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by venue name, city, or type..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors"
                />
              </div>

              {/* Type filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                    typeFilter === 'all'
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  All Types
                </button>
                {BUSINESS_TYPES.map(bt => (
                  <button
                    key={bt.key}
                    onClick={() => setTypeFilter(bt.key)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                      typeFilter === bt.key
                        ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {bt.icon} {bt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats bar */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>
                {loading ? 'Loading...' : (
                  <><strong className="text-slate-700 dark:text-slate-200">{filteredVenues.length}</strong> venue{filteredVenues.length !== 1 ? 's' : ''} found</>
                )}
              </span>
              <button
                onClick={loadVenues}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== VENUES LIST ===== */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-violet-500 animate-spin mb-4" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading venues...</p>
            </div>
          ) : error ? (
            <div className="max-w-lg mx-auto text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Something went wrong</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error}</p>
              <button
                onClick={loadVenues}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          ) : filteredVenues.length === 0 ? (
            <div className="max-w-lg mx-auto text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {searchTerm || typeFilter !== 'all' ? 'No venues match your filters' : 'No venues available yet'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {searchTerm || typeFilter !== 'all'
                  ? 'Try adjusting your search or filter to find what you\'re looking for.'
                  : 'Venues will appear here once they are set up and active on the platform.'}
              </p>
              {(searchTerm || typeFilter !== 'all') && (
                <button
                  onClick={() => { setSearchTerm(''); setTypeFilter('all'); }}
                  className="mt-4 px-4 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVenues.map((venue) => {
                const isExpanded = expandedVenue === venue._id;
                const availPct = venue.totalResources > 0
                  ? Math.round((venue.availableResources / venue.totalResources) * 100)
                  : 0;
                const hasAvailability = venue.availableResources > 0;
                const businessIcon = BUSINESS_ICONS[venue.businessType] || BUSINESS_ICONS.unknown;

                return (
                  <div
                    key={venue._id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    {/* Venue header (clickable) */}
                    <button
                      onClick={() => handleToggleVenue(venue._id)}
                      className="w-full flex items-center gap-4 p-4 sm:p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                    >
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl ${
                        hasAvailability
                          ? 'bg-emerald-50 dark:bg-emerald-900/20'
                          : venue.totalResources > 0
                            ? 'bg-red-50 dark:bg-red-900/20'
                            : 'bg-slate-50 dark:bg-slate-800'
                      }`}>
                        {businessIcon}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                            {venue.businessName}
                          </h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400">
                            {venue.businessTypeName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {venue.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {venue.city}{venue.state ? `, ${venue.state}` : ''}
                            </span>
                          )}
                          {venue.totalResources > 0 && (
                            <span className="flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              <span className={hasAvailability ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>
                                {venue.availableResources}
                              </span>
                              /{venue.totalResources} available
                            </span>
                          )}
                          {venue.totalResources === 0 && (
                            <span className="text-slate-400">No resources listed</span>
                          )}
                        </div>
                      </div>

                      {/* Right side: availability + expand indicator */}
                      <div className="flex items-center gap-4">
                        {venue.totalResources > 0 && (
                          <div className="hidden sm:flex flex-col items-end">
                            {/* Progress ring */}
                            <div className="relative w-10 h-10">
                              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-slate-200 dark:stroke-slate-600" strokeWidth="3" />
                                <circle
                                  cx="18" cy="18" r="15.5" fill="none"
                                  className={`transition-all duration-700 ${
                                    availPct > 50 ? 'stroke-emerald-500' :
                                    availPct > 0 ? 'stroke-amber-500' :
                                    'stroke-red-500'
                                  }`}
                                  strokeWidth="3"
                                  strokeDasharray={`${availPct} ${100 - availPct}`}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200">
                                {availPct}%
                              </span>
                            </div>
                          </div>
                        )}

                        <div className={`p-1 rounded-lg transition-colors ${
                          isExpanded ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' : 'text-slate-400'
                        }`}>
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </button>

                    {/* Expanded: Resources */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
                        {resourcesLoading[venue._id] ? (
                          <div className="flex items-center justify-center py-10">
                            <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
                          </div>
                        ) : !venueResources[venue._id] || venueResources[venue._id].length === 0 ? (
                          <div className="p-8 text-center">
                            <p className="text-sm text-slate-500 dark:text-slate-400">No resources available for this venue.</p>
                          </div>
                        ) : (
                          <div className="p-4 sm:p-5">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                Resources ({venueResources[venue._id].length})
                              </h4>
                              {/* Legend */}
                              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Available</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Occupied</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Maintenance</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                              {venueResources[venue._id].map((resource) => {
                                const status = STATUS_CONFIG[resource.status] || STATUS_CONFIG.disabled;
                                const StatusIcon = status.icon;
                                const session = resource.activeSession;
                                const isTimedSession = session?.endTime != null;

                                return (
                                  <div
                                    key={resource._id}
                                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-sm transition-shadow"
                                  >
                                    {/* Resource header */}
                                    <div className="flex items-start justify-between mb-3">
                                      <div className="min-w-0 flex-1">
                                        <h5 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                          {resource.name}
                                        </h5>
                                        {resource.code && (
                                          <p className="text-xs text-slate-400 mt-0.5">Code: {resource.code}</p>
                                        )}
                                      </div>
                                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${status.bg} ${status.color} ml-2 flex-shrink-0`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                                        {status.label}
                                      </div>
                                    </div>

                                    {/* Session timing info for occupied resources */}
                                    {resource.status === 'occupied' && session && (
                                      <div className="mb-3 space-y-1">
                                        {isTimedSession ? (
                                          // Timer-based (turf/court): show countdown
                                          <LiveTimer
                                            startTime={session.startTimeRounded || session.startTime}
                                            endTime={session.endTime}
                                          />
                                        ) : (
                                          // Pay-per-use (gaming/pool): show elapsed time
                                          <LiveTimer
                                            startTime={session.startTimeRounded || session.startTime}
                                          />
                                        )}
                                        {(session.startTimeRounded || session.startTime) && (
                                          <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                            Since {new Date(session.startTimeRounded || session.startTime).toLocaleTimeString('en-US', {
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </p>
                                        )}
                                        {/* Customer name hidden on public page for privacy */}
                                      </div>
                                    )}

                                    {/* Details */}
                                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                      <span>Day: ₹{resource.dayPrice}</span>
                                      <span>Night: ₹{resource.nightPrice}</span>
                                    </div>

                                    {/* Extra attributes */}
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                      {resource.category && resource.category !== 'standard' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 capitalize">
                                          {resource.category}
                                        </span>
                                      )}
                                      {resource.capacity > 0 && (
                                        <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                          <Users className="w-3 h-3" />
                                          Up to {resource.capacity}
                                        </span>
                                      )}
                                    </div>

                                    {/* Status indicator bar */}
                                    <div className={`mt-3 h-1 rounded-full ${
                                      resource.status === 'available' ? 'bg-emerald-200 dark:bg-emerald-800' :
                                      resource.status === 'occupied' ? 'bg-red-200 dark:bg-red-800' :
                                      resource.status === 'maintenance' ? 'bg-amber-200 dark:bg-amber-800' :
                                      'bg-slate-200 dark:bg-slate-700'
                                    }`} />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-white dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">VenuePro</span>
            </Link>
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <Link to="/" className="hover:text-violet-600 transition-colors">Home</Link>
              <Link to="/venues" className="hover:text-violet-600 transition-colors">Live Availability</Link>
              <Link to="/business" className="hover:text-violet-600 transition-colors">For Venues</Link>
              <Link to="/portal" className="hover:text-violet-600 transition-colors">Admin</Link>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              &copy; {new Date().getFullYear()} VenuePro
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
