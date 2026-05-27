import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import staffApi from '../../services/staffApi';
import { Card } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { PageLoader } from '../../components/common/Loader';
import { Play, Square, Clock, Search } from 'lucide-react';
import { roundUpTo5Minutes, calculateSessionAmount, formatElapsed } from '../../services/pricingUtils';

/* ── Active session card with continuous 1s timer ── */
function ActiveSessionCard({ session, onEnd }) {
  const startTime = new Date(session.startTimeRounded || session.startTime).getTime();
  const [elapsed, setElapsed] = useState('00m 00s');
  const [estimatedRevenue, setEstimatedRevenue] = useState(0);
  const rateSnapshot = session.rateSnapshot || {};
  const pricingModeAtStart = session.pricingModeAtStart || 'day';

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const { text } = formatElapsed(startTime);
      setElapsed(text);

      const dayPrice = rateSnapshot?.dayPrice || 0;
      const nightPrice = rateSnapshot?.nightPrice || 0;
      const pricingMode = pricingModeAtStart;
      const endRounded = roundUpTo5Minutes(new Date(now));
      const startRounded = new Date(startTime);

      if (endRounded > startRounded) {
        const calc = calculateSessionAmount(startRounded, now, dayPrice, nightPrice, pricingMode);
        setEstimatedRevenue(calc.roundedAmount);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime, rateSnapshot?.dayPrice, rateSnapshot?.nightPrice, pricingModeAtStart]);

  return (
    <Card className="border-l-4 border-l-amber-500">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-text-primary truncate">
                {session.resourceNameSnapshot || session.resourceId?.name}
              </h3>
              <p className="text-sm text-text-muted truncate">
                {session.customerNameSnapshot || session.customerId?.fullName}
                {session.secondaryCustomerNameSnapshot && (
                  <span className="text-text-muted"> vs {session.secondaryCustomerNameSnapshot}</span>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">{elapsed}</p>
          <p className="text-xs text-text-muted">
            Started {new Date(session.startTimeRounded || session.startTime).toLocaleTimeString()}
          </p>
          {estimatedRevenue > 0 && (
            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-1">
              ₹{estimatedRevenue}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="danger" size="sm" onClick={() => onEnd(session)}>
          <Square className="w-4 h-4" />
          End Session
        </Button>
      </div>
    </Card>
  );
}

/* ── Resource Tile ── */
function ResourceTile({ resource, session, onStart }) {
  const isAvailable = resource.status === 'available';
  const isOccupied = resource.status === 'occupied';

  return (
    <Card
      className={`border-l-4 ${
        isAvailable ? 'border-l-emerald-500 cursor-pointer hover:shadow-md hover:-translate-y-0.5' :
        isOccupied ? 'border-l-amber-500' : 'border-l-gray-400 opacity-70'
      } transition-all duration-200`}
      onClick={() => { if (isAvailable) onStart(resource); }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-text-primary truncate">{resource.name}</h3>
          {resource.category && (
            <p className="text-xs text-text-muted capitalize">{resource.category}</p>
          )}
        </div>
        <span className={`flex items-center gap-1.5 text-xs font-medium shrink-0 ml-2 ${
          isAvailable ? 'text-emerald-600 dark:text-emerald-400' :
          isOccupied ? 'text-amber-600 dark:text-amber-400' :
          'text-gray-500'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            isAvailable ? 'bg-emerald-500' :
            isOccupied ? 'bg-amber-500' : 'bg-gray-400'
          }`} />
          {isAvailable ? 'Available' : isOccupied ? 'In Use' : resource.status}
        </span>
      </div>
      <div className="flex items-center gap-3 text-sm text-text-muted">
        <span>Day: ₹{resource.dayPrice}/hr</span>
        <span>Night: ₹{resource.nightPrice}/hr</span>
      </div>
      <div className="mt-3 pt-3 border-t border-border">
        {isAvailable && (
          <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5" /> Start Session
          </span>
        )}
        {isOccupied && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-sm text-text-primary truncate">{session?.customerNameSnapshot || 'In use'}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ── Main Staff Sessions Page ── */
export default function StaffSessions() {
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Start session
  const [showStart, setShowStart] = useState(false);
  const [selectedResource, setSelectedResource] = useState('');
  const [selectedResourceTile, setSelectedResourceTile] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  // Second player / opponent
  const [showSecondPlayer, setShowSecondPlayer] = useState(false);
  const [secondaryCustomerId, setSecondaryCustomerId] = useState('');
  const [secondaryCustomerName, setSecondaryCustomerName] = useState('');
  const [secondaryCustomerSearch, setSecondaryCustomerSearch] = useState('');
  const [secondaryCustomerSearchResults, setSecondaryCustomerSearchResults] = useState([]);
  const [starting, setStarting] = useState(false);

  // End session
  const [showEnd, setShowEnd] = useState(false);
  const [endSession, setEndSession] = useState(null);
  const [endData, setEndData] = useState(null);
  const [loserChoice, setLoserChoice] = useState('');

  const syncTimeoutRef = useRef(null);

  const fetchResources = useCallback(async () => {
    try {
      const { data } = await staffApi.get('/resources');
      setResources(data.data || []);
    } catch {}
  }, []);

  const fetchActive = useCallback(async () => {
    try {
      const { data } = await staffApi.get('/bookings/active');
      setActiveSessions(data.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchResources(), fetchActive()]).finally(() => setLoading(false));
  }, []);

  // Chained setTimeout sync
  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      fetchActive()
        .catch(() => {})
        .finally(() => {
          if (cancelled) return;
          const jitter = Math.random() * 2000;
          syncTimeoutRef.current = setTimeout(sync, 10000 + jitter);
        });
    };
    sync();
    return () => {
      cancelled = true;
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [fetchActive]);

  const handleCustomerSearch = async (q) => {
    setCustomerSearch(q);
    if (q.length < 1) { setCustomerSearchResults([]); return; }
    try {
      const { data } = await staffApi.get(`/customers/search?q=${encodeURIComponent(q)}`);
      setCustomerSearchResults(data.data || []);
    } catch { setCustomerSearchResults([]); }
  };

  const handleSecondarySearch = async (q) => {
    setSecondaryCustomerSearch(q);
    if (q.length < 1) { setSecondaryCustomerSearchResults([]); return; }
    try {
      const { data } = await staffApi.get(`/customers/search?q=${encodeURIComponent(q)}`);
      setSecondaryCustomerSearchResults(data.data || []);
    } catch { setSecondaryCustomerSearchResults([]); }
  };

  const handleTileStart = async (resource) => {
    setSelectedResourceTile(resource);
    setSelectedResource(resource._id);
    setShowStart(true);
    setShowSecondPlayer(false);
    setSecondaryCustomerId('');
    setSecondaryCustomerName('');
    setSecondaryCustomerSearch('');
    setSecondaryCustomerSearchResults([]);
    try {
      const { data } = await staffApi.get('/customers');
      setCustomers(data.data || []);
    } catch {}
  };

  const handleStartSession = async () => {
    if (!selectedResource || !selectedCustomer) return;
    setStarting(true);
    try {
        const payload = {
        resourceId: selectedResource,
        customerId: selectedCustomer
      };

      if (showSecondPlayer && secondaryCustomerId) {
        payload.secondaryCustomerId = secondaryCustomerId;
        payload.secondaryCustomerName = secondaryCustomerName;
      }

      const response = await staffApi.post('/bookings/start', payload);
      const newSession = response.data?.data;
      if (newSession) {
        setActiveSessions(prev => [newSession, ...prev]);
        setResources(prev => prev.map(r =>
          r._id === selectedResource ? { ...r, status: 'occupied' } : r
        ));
      }
      setShowStart(false);
      setSelectedResource('');
      setSelectedCustomer('');
      setSelectedCustomerName('');
      setSelectedResourceTile(null);
      setCustomerSearch('');
      setCustomerSearchResults([]);
      setShowSecondPlayer(false);
      setSecondaryCustomerId('');
      setSecondaryCustomerName('');
      setSecondaryCustomerSearch('');
      setSecondaryCustomerSearchResults([]);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to start session');
    } finally { setStarting(false); }
  };

  const handleEndSession = async (session) => {
    setEndSession(session);
    setShowEnd(true);
    try {
      const now = new Date();
      const start = new Date(session.startTimeRounded || session.startTime);
      const dayPrice = session.rateSnapshot?.dayPrice || 0;
      const nightPrice = session.rateSnapshot?.nightPrice || 0;
      const pricingMode = session.pricingModeAtStart || 'day';
      const calc = calculateSessionAmount(start, now, dayPrice, nightPrice, pricingMode);
      setEndData({
        estimatedAmount: calc.roundedAmount,
        durationMinutes: calc.durationMinutes,
        hourlyRate: calc.hourlyRate
      });
    } catch { setEndData({ estimatedAmount: 0, durationMinutes: 0, hourlyRate: 0 }); }
  };

  const confirmEndSession = async () => {
    if (!endSession) return;
    try {
      const body = {
        discount: 0,
        discountReason: 'Ended by staff'
      };

      // For 2-player matches, send loserCustomerId so backend updates stats & sets payable
      const hasTwoPlayers = endSession.secondaryCustomerId || endSession.secondaryCustomerNameSnapshot;
      if (hasTwoPlayers && loserChoice) {
        body.loserCustomerId = loserChoice;
      }

      await staffApi.put(`/bookings/${endSession._id}/end`, body);
      setShowEnd(false);
      setActiveSessions(prev => prev.filter(s => s._id !== endSession._id));
      const resourceId = endSession.resourceId?._id || endSession.resourceId;
      if (resourceId) {
        setResources(prev => prev.map(r =>
          r._id === resourceId ? { ...r, status: 'available' } : r
        ));
      }
      setEndSession(null);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to end session');
    }
  };

  const getSessionForResource = (resourceId) => {
    return activeSessions.find(s =>
      (s.resourceId?._id && s.resourceId._id === resourceId) ||
      s.resourceId === resourceId
    );
  };

  if (loading) return <PageLoader />;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Sessions</h1>
          <p className="text-text-muted mt-1">Start and manage sessions</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">
            {activeSessions.length} active · {resources.filter(r => r.status === 'available').length} available
          </span>
        </div>
      </div>

      {/* Resource Tiles */}
      <div>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
          Resources ({resources.length})
        </h2>
        {resources.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-text-muted">No resources available.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {resources.map((resource) => (
              <ResourceTile
                key={resource._id}
                resource={resource}
                session={getSessionForResource(resource._id)}
                onStart={handleTileStart}
              />
            ))}
          </div>
        )}
      </div>

      {/* Active Sessions */}
      {activeSessions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
            Active Sessions ({activeSessions.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSessions.map((s) => (
              <ActiveSessionCard key={s._id} session={s} onEnd={handleEndSession} />
            ))}
          </div>
        </div>
      )}

      {activeSessions.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-text-muted">No active sessions right now.</p>
        </Card>
      )}

      {/* Start Session Modal */}
      <Modal open={showStart} onClose={() => {
        setShowStart(false);
        setSelectedResourceTile(null);
      }} title="Start New Session" size="lg">
        <div className="space-y-4">
          {selectedResourceTile && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-0.5">Selected Resource</p>
              <p className="text-sm font-semibold text-text-primary">{selectedResourceTile.name}</p>
              <p className="text-xs text-text-muted">
                Day: ₹{selectedResourceTile.dayPrice}/hr · Night: ₹{selectedResourceTile.nightPrice}/hr
              </p>
            </div>
          )}
          <Select
            label="Resource"
            value={selectedResource}
            onChange={(e) => setSelectedResource(e.target.value)}
            placeholder="Select available resource"
            options={resources
              .filter(r => r.status === 'available')
              .map(r => ({ value: r._id, label: `${r.name} (₹${r.dayPrice}/${r.nightPrice})` }))
            }
          />

          {/* Player 1 */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text-primary">Player 1</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                placeholder="Search by name, phone, or code..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-text-primary"
              />
            </div>
            {customerSearchResults.length > 0 && (
              <div className="border border-border rounded-lg divide-y divide-border max-h-40 overflow-y-auto">
                {customerSearchResults.map((c) => (
                  <button
                    key={c._id}
                    onClick={() => {
                      setSelectedCustomer(c._id);
                      setSelectedCustomerName(c.fullName);
                      setCustomerSearch(`${c.fullName} (${c.customerCode})`);
                      setCustomerSearchResults([]);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-surface-tertiary transition-colors"
                  >
                    <span className="font-medium">{c.fullName}</span>
                    <span className="text-text-muted ml-2">{c.customerCode}</span>
                    {c.phone && <span className="text-text-muted ml-2">{c.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Opponent Toggle */}
          {selectedCustomer && (
            <div className="border-t border-border pt-3">
              {!showSecondPlayer ? (
                <button
                  onClick={() => setShowSecondPlayer(true)}
                  className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-medium hover:text-amber-700 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full border-2 border-amber-500 flex items-center justify-center text-xs font-bold">+</span>
                  Add Opponent / Second Player
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-text-primary">Player 2 (Opponent)</label>
                    <button
                      onClick={() => {
                        setShowSecondPlayer(false);
                        setSecondaryCustomerId('');
                        setSecondaryCustomerName('');
                        setSecondaryCustomerSearch('');
                        setSecondaryCustomerSearchResults([]);
                      }}
                      className="text-xs text-text-muted hover:text-red-500 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      value={secondaryCustomerSearch}
                      onChange={(e) => handleSecondarySearch(e.target.value)}
                      placeholder="Search opponent by name, phone, or code..."
                      className="w-full pl-10 pr-4 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-text-primary"
                    />
                  </div>
                  {secondaryCustomerSearchResults.length > 0 && (
                    <div className="border border-border rounded-lg divide-y divide-border max-h-40 overflow-y-auto">
                      {secondaryCustomerSearchResults.map((c) => (
                        <button
                          key={c._id}
                          onClick={() => {
                            setSecondaryCustomerId(c._id);
                            setSecondaryCustomerName(c.fullName);
                            setSecondaryCustomerSearch(`${c.fullName} (${c.customerCode})`);
                            setSecondaryCustomerSearchResults([]);
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-surface-tertiary transition-colors"
                        >
                          <span className="font-medium">{c.fullName}</span>
                          <span className="text-text-muted ml-2">{c.customerCode}</span>
                          {c.phone && <span className="text-text-muted ml-2">{c.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedCustomer && !showSecondPlayer && (
            <p className="text-xs text-text-muted italic">
              {selectedCustomerName} will be billed for this session. Add an opponent for match play.
            </p>
          )}

          {/* Summary */}
          {selectedCustomer && (
            <div className="p-3 bg-surface-secondary rounded-lg border border-border">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Session Summary</p>
              <p className="text-sm text-text-primary">
                <span className="font-medium">P1:</span> {selectedCustomerName}
                {showSecondPlayer && secondaryCustomerName && (
                  <span className="ml-3"><span className="font-medium">P2:</span> {secondaryCustomerName}</span>
                )}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {showSecondPlayer && secondaryCustomerName
                  ? 'Loser pays at session end'
                  : 'Single player session'}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => { setShowStart(false); setSelectedResourceTile(null); }}>
              Cancel
            </Button>
            <Button onClick={handleStartSession} loading={starting} disabled={!selectedResource || !selectedCustomer}>
              <Play className="w-4 h-4" /> Start Session
            </Button>
          </div>
        </div>
      </Modal>

      {/* End Session Modal */}
      <Modal open={showEnd} onClose={() => {
        setShowEnd(false);
        setLoserChoice('');
      }} title="End Session" size="lg">
        {endSession && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-secondary rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-muted uppercase">Resource</p>
                  <p className="text-sm font-medium text-text-primary">
                    {endSession.resourceNameSnapshot || endSession.resourceId?.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase">Players</p>
                  <p className="text-sm font-medium text-text-primary">
                    {endSession.customerNameSnapshot || endSession.customerId?.fullName}
                  </p>
                  {endSession.secondaryCustomerNameSnapshot && (
                    <p className="text-sm text-text-muted">
                      vs {endSession.secondaryCustomerNameSnapshot}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase">Duration</p>
                  <p className="text-sm font-medium text-text-primary">
                    {endData?.durationMinutes
                      ? `${Math.floor(endData.durationMinutes / 60)}h ${endData.durationMinutes % 60}m`
                      : 'Calculating...'}
                  </p>
                </div>
              </div>

              {/* Who lost? — only for 2-player matches */}
              {(endSession.secondaryCustomerId || endSession.secondaryCustomerNameSnapshot) && (
                <div className="p-4 bg-surface-secondary rounded-lg border border-border">
                  <p className="text-sm font-semibold text-text-primary mb-3">Who lost?</p>
                  <p className="text-xs text-text-muted mb-2">The loser will be billed for this session.</p>
                  <div className="space-y-2">
                    <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${loserChoice === (endSession.customerId?._id || endSession.customerId) ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800' : 'bg-surface border border-border hover:bg-surface-tertiary'}`}>
                      <input
                        type="radio"
                        name="staffLoserChoice"
                        checked={loserChoice === (endSession.customerId?._id || endSession.customerId)}
                        onChange={() => setLoserChoice(endSession.customerId?._id || endSession.customerId)}
                        className="accent-red-600"
                      />
                      <span className="text-sm font-medium text-text-primary">
                        {endSession.customerNameSnapshot || endSession.customerId?.fullName}
                      </span>
                      <span className="text-xs text-text-muted ml-auto">Player 1 (lost)</span>
                    </label>
                    <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${loserChoice === (endSession.secondaryCustomerId?._id || endSession.secondaryCustomerId) ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800' : 'bg-surface border border-border hover:bg-surface-tertiary'}`}>
                      <input
                        type="radio"
                        name="staffLoserChoice"
                        checked={loserChoice === (endSession.secondaryCustomerId?._id || endSession.secondaryCustomerId)}
                        onChange={() => setLoserChoice(endSession.secondaryCustomerId?._id || endSession.secondaryCustomerId)}
                        className="accent-red-600"
                      />
                      <span className="text-sm font-medium text-text-primary">
                        {endSession.secondaryCustomerNameSnapshot}
                      </span>
                      <span className="text-xs text-text-muted ml-auto">Player 2 (lost)</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="col-span-2">
                  <p className="text-xs text-text-muted uppercase">Amount</p>
                  <p className="text-lg font-bold text-text-primary">₹{endData?.estimatedAmount || '...'}</p>
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowEnd(false)}>Cancel</Button>
              <Button onClick={confirmEndSession}>
                <Square className="w-4 h-4" /> End Session
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
