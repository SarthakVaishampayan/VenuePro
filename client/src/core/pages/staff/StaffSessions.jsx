import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import staffApi from '../../services/staffApi';
import { Card } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import { PageLoader } from '../../components/common/Loader';
import { Play, Square, Clock, Search, DollarSign } from 'lucide-react';
import { useStaffAuth } from '../../context/StaffAuthContext';
import { roundUpTo5Minutes, calculateSessionAmount, calculateBookedAmount, formatElapsed, getPricingMode } from '../../services/pricingUtils';

/* ── Active session card with continuous 1s timer ── */
function ActiveSessionCard({ session, onEnd, onTimerExpired }) {
  const startTime = new Date(session.startTimeRounded || session.startTime).getTime();
  const hasBookedDuration = session.bookedDuration && session.bookedDuration > 0;
  const endTime = session.endTime ? new Date(session.endTime).getTime() : null;
  const [elapsed, setElapsed] = useState('00m 00s');
  const [estimatedRevenue, setEstimatedRevenue] = useState(0);
  const [expired, setExpired] = useState(false);
  const hasFiredRef = useRef(false);
  const rateSnapshot = session.rateSnapshot || {};
  const pricingModeAtStart = session.pricingModeAtStart || 'day';

  const dayPrice = rateSnapshot?.dayPrice || session.dayPrice || 0;
  const nightPrice = rateSnapshot?.nightPrice || session.nightPrice || 0;
  const bookedAmount = hasBookedDuration
    ? calculateBookedAmount(session.bookedDuration, dayPrice, nightPrice, pricingModeAtStart)
    : null;

  useEffect(() => {
    hasFiredRef.current = false;
    const update = () => {
      const now = Date.now();

      if (hasBookedDuration && endTime) {
        // Countdown mode (pickleball / turf)
        const remaining = endTime - now;
        if (remaining <= 0) {
          setElapsed('00m 00s');
          setExpired(true);
          if (onTimerExpired && !hasFiredRef.current) {
            hasFiredRef.current = true;
            onTimerExpired(session._id);
          }
        } else {
          const totalSecs = Math.floor(remaining / 1000);
          const hrs = Math.floor(totalSecs / 3600);
          const mins = Math.floor((totalSecs % 3600) / 60);
          const secs = totalSecs % 60;
          setElapsed(`${hrs > 0 ? `${hrs}h ` : ''}${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`);
        }
      } else {
        // Elapsed mode (pool / snooker / gaming)
        const { text } = formatElapsed(startTime);
        setElapsed(text);

        const endRounded = roundUpTo5Minutes(new Date(now));
        const startRounded = new Date(startTime);
        if (endRounded > startRounded) {
          const calc = calculateSessionAmount(startRounded, now, dayPrice, nightPrice, pricingModeAtStart);
          setEstimatedRevenue(calc.roundedAmount);
        }
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime, endTime, hasBookedDuration, dayPrice, nightPrice, pricingModeAtStart, onTimerExpired, session._id]);

  if (expired) return null;

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
          {hasBookedDuration ? (
            <>
              <p className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">{elapsed}</p>
              <p className="text-xs text-text-muted">Remaining</p>
              {bookedAmount && (
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-1">
                  ₹{bookedAmount.roundedAmount}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-2xl font-mono font-bold text-amber-600 dark:text-amber-400">{elapsed}</p>
              <p className="text-xs text-text-muted">
                Started {new Date(session.startTimeRounded || session.startTime).toLocaleTimeString()}
              </p>
              {estimatedRevenue > 0 && (
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-1">
                  ₹{estimatedRevenue}
                </p>
              )}
            </>
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="danger" size="sm" onClick={() => onEnd(session)}>
          <Square className="w-4 h-4" />
          {hasBookedDuration ? 'End Early' : 'End Session'}
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
  const { user } = useStaffAuth();
  const isTimerModule = user?.businessType === 'pickleball' || user?.businessType === 'cricket_football';

  const [resources, setResources] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Session history
  const [sessions, setSessions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Pay modal (for timer-expired / completed sessions)
  const [showPay, setShowPay] = useState(false);
  const [paySession, setPaySession] = useState(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payAction, setPayAction] = useState(null);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paying, setPaying] = useState(false);
  const [payLoserChoice, setPayLoserChoice] = useState('');
  const [payDiscount, setPayDiscount] = useState(0);
  const [payDiscountReason, setPayDiscountReason] = useState('');

  // Start session
  const [showStart, setShowStart] = useState(false);
  const [selectedResource, setSelectedResource] = useState('');
  const [selectedResourceTile, setSelectedResourceTile] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  // Duration (timer-based modules)
  const [duration, setDuration] = useState('');
  const [customDuration, setCustomDuration] = useState('');
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
  const [discount, setDiscount] = useState(0);
  const [discountReason, setDiscountReason] = useState('');
  const [ending, setEnding] = useState(false);

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

  const fetchSessions = useCallback(async (p = 1) => {
    try {
      const { data } = await staffApi.get(`/bookings?page=${p}&limit=20`);
      setSessions(data.data || []);
      if (data.meta) {
        setTotalPages(data.meta.totalPages);
        setTotal(data.meta.total);
      }
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchResources(), fetchActive(), fetchSessions()]).finally(() => setLoading(false));
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
    setDuration('');
    setCustomDuration('');
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

      if (isTimerModule) {
        payload.duration = parseInt(customDuration || duration);
      }

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
      setDuration('');
      setCustomDuration('');
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to start session');
    } finally { setStarting(false); }
  };

  const handleEndSession = async (session) => {
    setEndSession(session);
    setShowEnd(true);
    setDiscount(0);
    setDiscountReason('');
    setPayAction(null);
    setPaymentMode('cash');
    setLoserChoice('');
    try {
      const now = new Date();
      const start = new Date(session.startTimeRounded || session.startTime);
      const dayPrice = session.rateSnapshot?.dayPrice || 0;
      const nightPrice = session.rateSnapshot?.nightPrice || 0;
      const pricingMode = session.pricingModeAtStart || 'day';

      // For timer-based sessions (pickleball/turf), use bookedDuration for estimate
      if (session.bookedDuration && session.bookedDuration > 0) {
        const bookedCalc = calculateBookedAmount(session.bookedDuration, dayPrice, nightPrice, pricingMode);
        setEndData({
          estimatedAmount: bookedCalc.roundedAmount,
          durationMinutes: session.bookedDuration,
          hourlyRate: bookedCalc.hourlyRate,
          isBookedDuration: true
        });
      } else {
        const calc = calculateSessionAmount(start, now, dayPrice, nightPrice, pricingMode);
        setEndData({
          estimatedAmount: calc.roundedAmount,
          durationMinutes: calc.durationMinutes,
          hourlyRate: calc.hourlyRate
        });
      }
    } catch { setEndData({ estimatedAmount: 0, durationMinutes: 0, hourlyRate: 0 }); }
  };

  const confirmEndSession = async () => {
    if (!endSession) return;
    setEnding(true);
    try {
      // Determine payable customer ID — for 2-player matches, the loser pays
      const hasTwoPlayers = endSession.secondaryCustomerId || endSession.secondaryCustomerNameSnapshot;
      let payableCustomerIdForPayment;

      if (hasTwoPlayers && loserChoice) {
        payableCustomerIdForPayment = loserChoice;
      } else {
        payableCustomerIdForPayment = endSession.customerId?._id
          || endSession.customerId;
      }

      const body = {
        discount: parseFloat(discount) || 0,
        discountReason
      };

      if (hasTwoPlayers && loserChoice) {
        body.loserCustomerId = loserChoice;
      }

      const { data: endResult } = await staffApi.put(`/bookings/${endSession._id}/end`, body);

      if (payAction === 'now' && endResult.data?.finalAmount > 0) {
        await staffApi.post('/payments', {
          bookingSessionId: endSession._id,
          customerId: payableCustomerIdForPayment,
          amount: endResult.data.finalAmount,
          mode: paymentMode,
          notes: `Payment at session end - ${endSession.payableCustomer || endSession.customerNameSnapshot}`
        });
      }

      if (payAction === 'later' && endResult.data?.finalAmount > 0) {
        try {
          await staffApi.post('/dues', {
            bookingSessionId: endSession._id,
            customerId: payableCustomerIdForPayment,
            amount: endResult.data.finalAmount,
            notes: `Pay later at session end - ${endSession.payableCustomer || endSession.customerNameSnapshot}`
          });
        } catch (dueErr) {
          console.error('Failed to create due:', dueErr);
        }
      }

      setShowEnd(false);
      setEndSession(null);
      setActiveSessions(prev => prev.filter(s => s._id !== endSession._id));
      const resourceId = endSession.resourceId?._id || endSession.resourceId;
      if (resourceId) {
        setResources(prev => prev.map(r =>
          r._id === resourceId ? { ...r, status: 'available' } : r
        ));
      }
      fetchSessions();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to end session');
    } finally {
      setEnding(false);
    }
  };

  /* ── Open Pay modal for a completed (unpaid) session ── */
  const handleOpenPay = (s) => {
    setPaySession(s);
    setPayAmount(s.finalAmount || 0);
    setPayAction(null);
    setPaymentMode('cash');
    setPayLoserChoice('');
    setPayDiscount(0);
    setPayDiscountReason('');
    setShowPay(true);
  };

  /* ── Confirm payment for a completed session ── */
  const handleConfirmPay = async () => {
    if (!paySession || !payAction) return;
    setPaying(true);
    try {
      let customerId;
      const hasTwoPlayers = paySession.secondaryCustomerId || paySession.secondaryCustomerNameSnapshot;
      if (hasTwoPlayers && payLoserChoice) {
        customerId = payLoserChoice;
      } else {
        customerId = paySession.payableCustomerId || paySession.customerId?._id || paySession.customerId;
      }

      const discountAmount = parseFloat(payDiscount) || 0;
      const finalPayAmount = Math.max(0, payAmount - discountAmount);

      if (payAction === 'now' && finalPayAmount > 0) {
        await staffApi.post('/payments', {
          bookingSessionId: paySession._id,
          customerId,
          amount: finalPayAmount,
          mode: paymentMode,
          notes: `Payment for session - ${paySession.resourceNameSnapshot || ''}${discountAmount > 0 ? ` (discount: ₹${discountAmount})` : ''}`
        });
      }

      if (payAction === 'later' && finalPayAmount > 0) {
        await staffApi.post('/dues', {
          bookingSessionId: paySession._id,
          customerId,
          amount: finalPayAmount,
          notes: `Pay later for session - ${paySession.resourceNameSnapshot || ''}${discountAmount > 0 ? ` (discount: ₹${discountAmount})` : ''}`
        });
      }

      setShowPay(false);
      setPaySession(null);
      fetchSessions();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const handleTimerExpired = useCallback(async (sessionId) => {
    try {
      const { data } = await staffApi.put(`/bookings/${sessionId}/timer-expired`);
      setActiveSessions(prev => prev.filter(s => s._id !== sessionId));
      setResources(prev => prev.map(r =>
        r._id === data.data?.resourceId?._id || r._id === data.data?.resourceId
          ? { ...r, status: 'available' } : r
      ));
      fetchSessions();
    } catch (err) {
      console.error('Failed to auto-end session:', err);
    }
  }, [fetchSessions]);

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
              <ActiveSessionCard key={s._id} session={s} onEnd={handleEndSession} onTimerExpired={handleTimerExpired} />
            ))}
          </div>
        </div>
      )}

      {activeSessions.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-text-muted">No active sessions right now.</p>
        </Card>
      )}

      {/* ── Session History ── */}
      <Card>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4">
            Session History
          </h2>

          {sessions.length === 0 ? (
            <p className="text-text-muted text-sm py-8 text-center">No sessions found. Start a new session!</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Resource</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Players</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-text-muted uppercase">Status</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Duration</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Amount</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Payment</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Action</th>
                      <th className="text-right px-4 py-2 text-xs font-semibold text-text-muted uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sessions.map((s) => (
                      <tr key={s._id} className="hover:bg-surface-secondary/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-text-primary">{s.resourceNameSnapshot || s.resourceId?.name}</td>
                        <td className="px-4 py-3 text-sm text-text-primary">
                          {s.customerNameSnapshot || s.customerId?.fullName}
                          {s.secondaryCustomerNameSnapshot && (
                            <span className="text-text-muted"> vs {s.secondaryCustomerNameSnapshot}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            s.bookingStatus === 'completed' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                            s.bookingStatus === 'in_progress' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                            s.bookingStatus === 'cancelled' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                            'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {s.bookingStatus?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-muted text-right">
                          {s.durationMinutes ? `${Math.floor(s.durationMinutes / 60)}h ${s.durationMinutes % 60}m` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-primary text-right font-medium">
                          {s.finalAmount ? `₹${s.finalAmount}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            s.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                            s.paymentStatus === 'due' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                            s.paymentStatus === 'partial' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' :
                            'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {s.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {s.bookingStatus === 'completed' && (s.paymentStatus === 'pending' || s.paymentStatus === 'due') && s.finalAmount > 0 ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenPay(s)}
                              icon={DollarSign}
                            >
                              Pay
                            </Button>
                          ) : (
                            <span className="text-xs text-text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-text-muted text-right">
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <span className="text-sm text-text-muted">Total: {total} sessions</span>
                  <div className="flex gap-2 items-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => {
                        const p = page - 1;
                        setPage(p);
                        fetchSessions(p);
                      }}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-text-muted">Page {page} of {totalPages}</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => {
                        const p = page + 1;
                        setPage(p);
                        fetchSessions(p);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

      {/* ── Pay Modal (for timer-expired / completed sessions) ── */}
      <Modal open={showPay} onClose={() => { setShowPay(false); setPaySession(null); }} title="Complete Payment" size="md">
        {paySession && (
          <div className="space-y-4">
            <div className="p-4 bg-surface-secondary rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-muted uppercase">Resource</p>
                  <p className="text-sm font-medium text-text-primary">{paySession.resourceNameSnapshot || paySession.resourceId?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase">Player</p>
                  <p className="text-sm font-medium text-text-primary">{paySession.customerNameSnapshot || paySession.customerId?.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase">Duration</p>
                  <p className="text-sm font-medium text-text-primary">
                    {paySession.durationMinutes ? `${Math.floor(paySession.durationMinutes / 60)}h ${paySession.durationMinutes % 60}m` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase">Amount Due</p>
                  <p className="text-lg font-bold text-text-primary">₹{payAmount}</p>
                </div>
              </div>
            </div>

            {/* Who lost? — only for 2-player matches */}
            {(paySession.secondaryCustomerId || paySession.secondaryCustomerNameSnapshot) && (
              <div className="p-4 bg-surface-secondary rounded-lg border border-border">
                <p className="text-sm font-semibold text-text-primary mb-3">Who lost?</p>
                <p className="text-xs text-text-muted mb-2">The loser will be billed for this session.</p>
                <div className="space-y-2">
                  <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${payLoserChoice === (paySession.customerId?._id || paySession.customerId) ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800' : 'bg-surface border border-border hover:bg-surface-tertiary'}`}>
                    <input
                      type="radio"
                      name="payLoserChoice"
                      checked={payLoserChoice === (paySession.customerId?._id || paySession.customerId)}
                      onChange={() => setPayLoserChoice(paySession.customerId?._id || paySession.customerId)}
                      className="accent-red-600"
                    />
                    <span className="text-sm font-medium text-text-primary">
                      {paySession.customerNameSnapshot || paySession.customerId?.fullName}
                    </span>
                    <span className="text-xs text-text-muted ml-auto">Player 1 (lost)</span>
                  </label>
                  <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${payLoserChoice === (paySession.secondaryCustomerId?._id || paySession.secondaryCustomerId) ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800' : 'bg-surface border border-border hover:bg-surface-tertiary'}`}>
                    <input
                      type="radio"
                      name="payLoserChoice"
                      checked={payLoserChoice === (paySession.secondaryCustomerId?._id || paySession.secondaryCustomerId)}
                      onChange={() => setPayLoserChoice(paySession.secondaryCustomerId?._id || paySession.secondaryCustomerId)}
                      className="accent-red-600"
                    />
                    <span className="text-sm font-medium text-text-primary">
                      {paySession.secondaryCustomerNameSnapshot}
                    </span>
                    <span className="text-xs text-text-muted ml-auto">Player 2 (lost)</span>
                  </label>
                </div>
              </div>
            )}

            {/* ── Discount Fields ── */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Discount (₹)"
                  type="number"
                  value={payDiscount}
                  onChange={(e) => {
                    const val = e.target.value;
                    const max = payAmount;
                    if (val === '' || parseFloat(val) <= max) {
                      setPayDiscount(val);
                    }
                  }}
                  min="0"
                  max={payAmount}
                />
                {payAmount > 0 && (
                  <p className="text-xs text-text-muted mt-1">Max discount: ₹{payAmount}</p>
                )}
              </div>
              <Input label="Discount Reason" value={payDiscountReason} onChange={(e) => setPayDiscountReason(e.target.value)} placeholder="Optional" />
            </div>

            {/* ── Adjusted Amount ── */}
            {(parseFloat(payDiscount) > 0) && (
              <div className="p-3 bg-surface rounded-lg border border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">Original Amount</span>
                  <span className="font-medium text-text-primary">₹{payAmount}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-text-muted">Discount</span>
                  <span className="font-medium text-red-500">-₹{parseFloat(payDiscount) || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1 pt-2 border-t border-border">
                  <span className="font-semibold text-text-primary">Final Payable</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{Math.max(0, payAmount - (parseFloat(payDiscount) || 0))}
                  </span>
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-text-primary mb-2">Payment</p>
              <div className="flex gap-2">
                <Button
                  variant={payAction === 'now' ? 'primary' : 'secondary'}
                  onClick={() => setPayAction('now')}
                  className="flex-1"
                >
                  Pay Now
                </Button>
                <Button
                  variant={payAction === 'later' ? 'primary' : 'secondary'}
                  onClick={() => setPayAction('later')}
                  className="flex-1"
                >
                  Pay Later
                </Button>
              </div>
            </div>

            {payAction === 'now' && (
              <Select
                label="Payment Mode"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'online', label: 'Online (UPI/Card)' }
                ]}
              />
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => { setShowPay(false); setPaySession(null); }}>Cancel</Button>
              <Button
                onClick={handleConfirmPay}
                loading={paying}
                disabled={!payAction || ((paySession.secondaryCustomerId || paySession.secondaryCustomerNameSnapshot) && !payLoserChoice)}
              >
                <DollarSign className="w-4 h-4" />
                {payAction === 'now' ? 'Mark as Paid' : 'Add to Dues'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Start Session Modal ── */}
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

          {/* ── Duration Picker (Timer-based modules: Pickleball, Cricket/Football) ── */}
          {isTimerModule && selectedCustomer && (
            <div className="border-t border-border pt-3">
              <label className="block text-sm font-medium text-text-primary mb-2">Session Duration</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { label: '30 min', value: 30 },
                  { label: '1 hr', value: 60 },
                  { label: '1.5 hr', value: 90 },
                  { label: '2 hr', value: 120 }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setDuration(opt.value); setCustomDuration(''); }}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      duration === opt.value && !customDuration
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-700 dark:text-amber-400 font-medium'
                        : 'bg-surface border-border text-text-muted hover:border-amber-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setDuration('custom'); setCustomDuration('30'); }}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    customDuration ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500 text-amber-700 dark:text-amber-400 font-medium'
                      : 'bg-surface border-border text-text-muted hover:border-amber-300'
                  }`}
                >
                  Custom
                </button>
              </div>
              {customDuration !== '' && (
                <div className="mt-2">
                  <Input
                    label="Custom Duration (minutes)"
                    type="number"
                    min="15"
                    max="480"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                  />
                </div>
              )}
              {(duration || customDuration) && (
                <p className="text-xs text-text-muted mt-2">
                  Est. Price: ₹{calculateBookedAmount(
                    parseInt(customDuration || duration),
                    selectedResourceTile?.dayPrice || 0,
                    selectedResourceTile?.nightPrice || 0,
                    getPricingMode()
                  ).roundedAmount}
                </p>
              )}
            </div>
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
            <Button onClick={handleStartSession} loading={starting} disabled={!selectedResource || !selectedCustomer || (isTimerModule && !(customDuration || duration))}>
              <Play className="w-4 h-4" /> Start Session
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── End Session Modal ── */}
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
                  <p className="text-sm font-medium text-text-primary">{endSession.resourceNameSnapshot || endSession.resourceId?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase">Players</p>
                  <p className="text-sm font-medium text-text-primary">
                    {endSession.customerNameSnapshot || endSession.customerId?.fullName}
                  </p>
                  {endSession.secondaryCustomerNameSnapshot && (
                    <p className="text-sm text-text-muted">vs {endSession.secondaryCustomerNameSnapshot}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase">Duration</p>
                  <p className="text-sm font-medium text-text-primary">
                    {endData?.durationMinutes ? `${Math.floor(endData.durationMinutes / 60)}h ${endData.durationMinutes % 60}m` : 'Calculating...'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-text-muted uppercase">Est. Amount</p>
                  <p className="text-lg font-bold text-text-primary">₹{endData?.estimatedAmount || '...'}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    @ ₹{endData?.hourlyRate || '?'}/hr
                    {endData?.estimatedAmount !== undefined && endData?.durationMinutes > 0 && (
                      <> · {Math.floor(endData.durationMinutes / 60)}h {endData.durationMinutes % 60}m</>
                    )}
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
                      <span className="text-sm font-medium text-text-primary">{endSession.customerNameSnapshot || endSession.customerId?.fullName}</span>
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
                      <span className="text-sm font-medium text-text-primary">{endSession.secondaryCustomerNameSnapshot}</span>
                      <span className="text-xs text-text-muted ml-auto">Player 2 (lost)</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Discount (₹)"
                    type="number"
                    value={discount}
                    onChange={(e) => {
                      const val = e.target.value;
                      const max = endData?.estimatedAmount ?? 0;
                      if (val === '' || parseFloat(val) <= max) {
                        setDiscount(val);
                      }
                    }}
                    min="0"
                    max={endData?.estimatedAmount ?? 0}
                  />
                  {endData?.estimatedAmount > 0 && (
                    <p className="text-xs text-text-muted mt-1">Max discount: ₹{endData.estimatedAmount}</p>
                  )}
                </div>
                <Input label="Discount Reason" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} placeholder="Optional" />
              </div>

              {/* ── Final Payable Amount ── */}
              {(endData?.estimatedAmount > 0 || parseFloat(discount) > 0) && (
                <div className="p-3 bg-surface rounded-lg border border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">Est. Amount</span>
                    <span className="font-medium text-text-primary">₹{endData?.estimatedAmount || 0}</span>
                  </div>
                  {parseFloat(discount) > 0 && (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-text-muted">Discount</span>
                      <span className="font-medium text-red-500">-₹{parseFloat(discount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm mt-1 pt-2 border-t border-border">
                    <span className="font-semibold text-text-primary">Final Payable</span>
                    <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{Math.max(0, (endData?.estimatedAmount || 0) - (parseFloat(discount) || 0))}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-text-primary mb-2">Payment</p>
                <div className="flex gap-2">
                  <Button
                    variant={payAction === 'now' ? 'primary' : 'secondary'}
                    onClick={() => setPayAction('now')}
                    className="flex-1"
                  >
                    Pay Now
                  </Button>
                  <Button
                    variant={payAction === 'later' ? 'primary' : 'secondary'}
                    onClick={() => setPayAction('later')}
                    className="flex-1"
                  >
                    Pay Later
                  </Button>
                </div>
              </div>

              {payAction === 'now' && (
                <Select
                  label="Payment Mode"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  options={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'online', label: 'Online (UPI/Card)' }
                  ]}
                />
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowEnd(false)}>Cancel</Button>
                <Button
                  onClick={confirmEndSession}
                  loading={ending}
                  disabled={!payAction || ((endSession.secondaryCustomerId || endSession.secondaryCustomerNameSnapshot) && !loserChoice)}
                >
                  <Square className="w-4 h-4" />
                  {payAction === 'now' ? 'End & Mark Paid' : 'End & Add to Dues'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
