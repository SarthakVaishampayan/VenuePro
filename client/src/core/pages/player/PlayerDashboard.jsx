import { useState, useEffect } from 'react';import { Calendar, AlertCircle, Building2, TrendingUp,
  DollarSign, MapPin, Search, ChevronRight,
  CheckCircle, XCircle, Wrench, RefreshCw, Hash
} from 'lucide-react';
import playerApi from '../../services/playerApi';
import { StatCard } from '../../components/common/Card';
import LiveTimer from '../../components/common/LiveTimer';

const statusConfig = {
  available: { icon: CheckCircle, label: 'Available', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  occupied: { icon: XCircle, label: 'Occupied', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
  maintenance: { icon: Wrench, label: 'Maintenance', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  disabled: { icon: XCircle, label: 'Disabled', color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800' }
};

export default function PlayerDashboard() {
  const [stats, setStats] = useState(null);
  const [venues, setVenues] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Venue browsing state
  const [allVenues, setAllVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [venueResources, setVenueResources] = useState([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDashboard();
    loadAllVenues();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await playerApi.get('/dashboard');
      setStats(data.data.stats);
      setVenues(data.data.venues || []);
      setRecentSessions(data.data.recentSessions || []);
    } catch (err) {
      setError('Failed to load dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadAllVenues = async () => {
    setVenuesLoading(true);
    try {
      const { data } = await playerApi.get('/venues');
      setAllVenues(data.data || []);
    } catch (err) {
      console.error('Failed to load venues:', err);
    } finally {
      setVenuesLoading(false);
    }
  };

  const loadVenueResources = async (tenantId) => {
    setResourcesLoading(true);
    setSelectedVenue(tenantId);
    try {
      const { data } = await playerApi.get(`/venues/${tenantId}/resources`);
      setVenueResources(data.data?.resources || []);
    } catch (err) {
      console.error('Failed to load resources:', err);
      setVenueResources([]);
    } finally {
      setResourcesLoading(false);
    }
  };

  const filteredVenues = allVenues.filter(v =>
    !searchTerm || v.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.businessTypeName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-muted">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">My Dashboard</h1>
        <p className="text-sm text-text-muted mt-1">Your activity across all venues</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Bookings" value={stats?.totalBookings || 0} icon={Calendar} color="violet" />
        <StatCard label="Active Sessions" value={stats?.activeSessions || 0} icon={TrendingUp} color="emerald" />
        <StatCard label="Total Due" value={`₹${(stats?.totalDue || 0).toLocaleString()}`} icon={AlertCircle} color="amber" />
        <StatCard label="Total Paid" value={`₹${(stats?.totalPaid || 0).toLocaleString()}`} icon={DollarSign} color="cyan" subtitle={`Across ${stats?.linkedVenues || 0} venue(s)`} />
      </div>

      {/* ============================================ */}
      {/* BROWSE VENUES — Resource Availability */}
      {/* ============================================ */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Building2 className="w-5 h-5 text-violet-500" />
                Browse Venues
              </h3>
              <p className="text-sm text-text-muted mt-0.5">
                Check real-time availability of courts, tables, turfs & zones
              </p>
            </div>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, city, or type..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-text-primary placeholder:text-text-muted"
              />
            </div>
          </div>
        </div>

        {/* Venues grid */}
        {venuesLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-5 h-5 text-text-muted animate-spin" />
          </div>
        ) : filteredVenues.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-text-muted/30 mx-auto mb-3" />
            <p className="text-text-muted font-medium">
              {searchTerm ? 'No venues match your search.' : 'No venues available yet.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredVenues.map((venue) => {
              const isSelected = selectedVenue === venue._id;
              const availPct = venue.totalResources > 0
                ? Math.round((venue.availableResources / venue.totalResources) * 100)
                : 0;
              const isFullyAvailable = venue.availableResources > 0;

              return (
                <div key={venue._id}>
                  {/* Venue card header */}
                  <button
                    onClick={() => loadVenueResources(venue._id)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-surface-secondary transition-colors text-left"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isFullyAvailable
                        ? 'bg-emerald-50 dark:bg-emerald-900/20'
                        : 'bg-slate-50 dark:bg-slate-800'
                    }`}>
                      <Building2 className={`w-6 h-6 ${
                        isFullyAvailable ? 'text-emerald-600 dark:text-emerald-400' : 'text-text-muted'
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-text-primary truncate">{venue.businessName}</h4>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400">
                          {venue.businessTypeName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                        {venue.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {venue.city}
                          </span>
                        )}
                        {venue.totalResources > 0 && (
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {venue.availableResources}/{venue.totalResources} available
                          </span>
                        )}
                        {venue.totalResources === 0 && (
                          <span>No resources listed</span>
                        )}
                      </div>
                    </div>

                    {/* Availability bar */}
                    <div className="hidden sm:flex items-center gap-3">
                      {venue.totalResources > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                availPct > 50 ? 'bg-emerald-500' :
                                availPct > 0 ? 'bg-amber-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${availPct}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${
                            availPct > 50 ? 'text-emerald-600' :
                            availPct > 0 ? 'text-amber-600' :
                            'text-red-600'
                          }`}>
                            {availPct}%
                          </span>
                        </div>
                      )}
                      <ChevronRight className={`w-4 h-4 text-text-muted transition-transform ${
                        isSelected ? 'rotate-90' : ''
                      }`} />
                    </div>
                  </button>

                  {/* Expanded: resources list */}
                  {isSelected && (
                    <div className="border-t border-border bg-surface-secondary/50">
                      {resourcesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw className="w-5 h-5 text-text-muted animate-spin" />
                        </div>
                      ) : venueResources.length === 0 ? (
                        <div className="p-6 text-center">
                          <p className="text-sm text-text-muted">No resources found for this venue.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                          {venueResources.map((resource) => {
                            const StatusIcon = statusConfig[resource.status]?.icon || XCircle;
                            const statusColor = statusConfig[resource.status]?.color || 'text-slate-400';
                            const statusBg = statusConfig[resource.status]?.bg || 'bg-slate-50 dark:bg-slate-800';
                            const statusLabel = statusConfig[resource.status]?.label || resource.status;
                            const session = resource.activeSession;
                            const isTimedSession = session?.endTime != null;

                            return (
                              <div
                                key={resource._id}
                                className="bg-surface rounded-lg border border-border p-4 hover:shadow-sm transition-shadow"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="min-w-0 flex-1">
                                    <h5 className="text-sm font-semibold text-text-primary truncate">
                                      {resource.name}
                                    </h5>
                                    {resource.code && (
                                      <p className="text-xs text-text-muted">{resource.code}</p>
                                    )}
                                  </div>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBg} ${statusColor} ml-2 flex-shrink-0`}>
                                    <StatusIcon className="w-3 h-3" />
                                    {statusLabel}
                                  </span>
                                </div>

                                {/* Session timing info for occupied resources */}
                                {resource.status === 'occupied' && session && (
                                  <div className="mb-3 space-y-1 bg-red-50 dark:bg-red-900/10 rounded-lg p-2 -mx-1">
                                    {isTimedSession ? (
                                      <LiveTimer
                                        startTime={session.startTimeRounded || session.startTime}
                                        endTime={session.endTime}
                                      />
                                    ) : (
                                      <LiveTimer
                                        startTime={session.startTimeRounded || session.startTime}
                                      />
                                    )}
                                    {(session.startTimeRounded || session.startTime) && (
                                      <p className="text-[10px] text-red-600/70 dark:text-red-400/70">
                                        Since {new Date(session.startTimeRounded || session.startTime).toLocaleTimeString('en-US', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    )}
                                    {/* Customer name hidden — show timing only */}
                                  </div>
                                )}

                                <div className="flex items-center gap-3 text-xs text-text-muted mt-2">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Day: ₹{resource.dayPrice}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Night: ₹{resource.nightPrice}
                                  </span>
                                </div>

                                {resource.category && resource.category !== 'standard' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 mt-2 capitalize">
                                    {resource.category}
                                  </span>
                                )}

                                {resource.notes && (
                                  <p className="text-xs text-text-muted mt-2 truncate">{resource.notes}</p>
                                )}
                              </div>
                            );
                          })}
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

      {/* My Linked Venues */}
      {venues.length > 0 && (
        <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">My Linked Venues</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {venues.map((venue, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary border border-border">
                <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{venue.businessName}</p>
                  <p className="text-xs text-text-muted">Linked {new Date(venue.linkedAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No venues yet — prompt to browse */}
      {venues.length === 0 && (
        <div className="bg-surface rounded-xl border border-border shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">No venues linked yet</h3>
          <p className="text-sm text-text-muted mb-4 max-w-md mx-auto">
            Browse venues above to check availability. When you visit a venue,
            ask them to link your player account to see your bookings and history.
          </p>
        </div>
      )}

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Activity</h3>
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <div key={session._id} className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {session.resourceId?.name || 'Session'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {new Date(session.createdAt).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize">
                  {session.bookingStatus?.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
