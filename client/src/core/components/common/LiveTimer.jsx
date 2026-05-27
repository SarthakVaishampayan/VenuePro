/**
 * LiveTimer — Displays real-time session timing for occupied resources.
 *
 * Two modes:
 * 1. Countdown mode (turf/court with bookedDuration): Shows remaining time until session ends.
 * 2. Elapsed mode (gaming/pool without endTime): Shows how long the session has been running.
 */
import { useState, useEffect, useRef } from 'react';
import { Clock, Timer } from 'lucide-react';

export default function LiveTimer({ startTime, endTime, bookedDuration, className = '' }) {
  const [now, setNow] = useState(Date.now());
  const intervalRef = useRef(null);

  useEffect(() => {
    setNow(Date.now());
    intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTime, endTime]);

  if (!startTime) return null;

  const start = new Date(startTime).getTime();
  const elapsed = Math.max(0, now - start);

  // Timer-based session (cricket/football turf, pickleball court) — show countdown
  if (endTime) {
    const end = new Date(endTime).getTime();
    const remaining = Math.max(0, end - now);

    if (remaining <= 0) {
      return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium text-red-500 ${className}`}>
          <Timer className="w-3 h-3" />
          Ending now
        </span>
      );
    }

    const totalMinutes = Math.ceil(remaining / 60000);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${className} ${
        totalMinutes <= 5
          ? 'text-red-500'
          : totalMinutes <= 15
            ? 'text-amber-500'
            : 'text-emerald-600 dark:text-emerald-400'
      }`}>
        <Timer className="w-3 h-3" />
        <span className="tabular-nums">
          {minutes}:{String(seconds).padStart(2, '0')} remaining
        </span>
      </span>
    );
  }

  // Pay-per-use session (gaming zone, pool/snooker) — show elapsed time
  const elapsedMinutes = Math.floor(elapsed / 60000);
  const hours = Math.floor(elapsedMinutes / 60);
  const mins = elapsedMinutes % 60;

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 ${className}`}>
      <Clock className="w-3 h-3" />
      <span className="tabular-nums">
        {hours > 0 ? `${hours}h ` : ''}{mins}m elapsed
      </span>
    </span>
  );
}
