/**
 * Frontend Pricing Utilities
 * Mirrors the backend pricingService.js for accurate client-side estimates.
 * These are used for live revenue display — final amounts are always calculated server-side.
 */

/**
 * Round a date DOWN to the nearest 5 minutes
 */
export const roundDownTo5Minutes = (date) => {
  const d = new Date(date);
  const minutes = d.getMinutes();
  const roundedMinutes = Math.floor(minutes / 5) * 5;
  d.setMinutes(roundedMinutes, 0, 0);
  return d;
};

/**
 * Round a date UP to the nearest 5 minutes
 */
export const roundUpTo5Minutes = (date) => {
  const d = new Date(date);
  const minutes = d.getMinutes();
  const remainder = minutes % 5;
  if (remainder === 0) {
    d.setSeconds(0, 0);
  } else {
    d.setMinutes(minutes + (5 - remainder), 0, 0);
  }
  return d;
};

/**
 * Calculate duration in minutes between two dates
 */
export const calculateDurationMinutes = (start, end) => {
  return Math.round((end - start) / (1000 * 60));
};

/**
 * Round amount to nearest 5
 */
export const roundToNearest5 = (amount) => {
  return Math.round(amount / 5) * 5;
};

/**
 * Determine pricing mode based on current time
 * @param {number} nightStartHour - Hour when night pricing begins (default 18)
 * @param {number} nightEndHour - Hour when night pricing ends (default 6)
 */
export const getPricingMode = (nightStartHour = 18, nightEndHour = 6) => {
  const now = new Date();
  const hour = now.getHours();
  return (hour >= nightStartHour || hour < nightEndHour) ? 'night' : 'day';
};

/**
 * Get the hourly rate based on pricing mode
 */
export const getHourlyRate = (pricingMode, dayPrice, nightPrice) => {
  return pricingMode === 'night' ? nightPrice : dayPrice;
};

/**
 * Calculate session amount with 5-minute rounding (client-side estimate)
 * @param {Date|number} startTime - Start time
 * @param {Date|number} endTime - End time
 * @param {number} dayPrice - Day rate
 * @param {number} nightPrice - Night rate
 * @param {string} pricingMode - 'day' or 'night'
 * @param {number} discount - Discount amount (optional)
 * @returns {Object} { durationMinutes, rawAmount, roundedAmount, finalAmount, hourlyRate }
 */
export const calculateSessionAmount = (startTime, endTime, dayPrice, nightPrice, pricingMode, discount = 0) => {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const startRounded = roundDownTo5Minutes(start);
  const endRounded = roundUpTo5Minutes(end);
  const durationMinutes = calculateDurationMinutes(startRounded, endRounded);

  if (durationMinutes <= 0) {
    return {
      durationMinutes: 0,
      rawAmount: 0,
      roundedAmount: 0,
      finalAmount: 0,
      hourlyRate: pricingMode === 'night' ? nightPrice : dayPrice
    };
  }

  const hourlyRate = pricingMode === 'night' ? nightPrice : dayPrice;
  const rawAmount = (durationMinutes / 60) * hourlyRate;
  const roundedAmount = roundToNearest5(rawAmount);
  const discountAmount = Math.min(discount || 0, roundedAmount);
  const finalAmount = Math.max(0, roundedAmount - discountAmount);

  return {
    durationMinutes,
    rawAmount,
    roundedAmount,
    finalAmount,
    discountAmount,
    hourlyRate
  };
};

/**
 * Format duration as human-readable string
 */
export const formatDuration = (minutes) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}min`;
  if (mins === 0) return `${hrs}hr`;
  return `${hrs}hr ${mins}min`;
};

/**
 * Format elapsed time from a start time (for live timers)
 */
export const formatElapsed = (startTime) => {
  const diff = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  const hrs = Math.floor(diff / 3600);
  const mins = Math.floor((diff % 3600) / 60);
  const secs = diff % 60;
  return {
    text: `${hrs > 0 ? `${hrs}h ` : ''}${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`,
    totalSeconds: diff
  };
};

/**
 * Format countdown time from endTime (for timer-based sessions)
 * Returns remaining time until endTime, or null if expired.
 */
export const formatCountdown = (endTime) => {
  const remaining = Math.floor((new Date(endTime).getTime() - Date.now()) / 1000);
  if (remaining <= 0) return null;
  const hrs = Math.floor(remaining / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  const secs = remaining % 60;
  return {
    text: `${hrs > 0 ? `${hrs}h ` : ''}${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`,
    totalSeconds: remaining,
    expired: false
  };
};

/**
 * Calculate the fixed amount for a booked session duration
 */
export const calculateBookedAmount = (bookedDuration, dayPrice, nightPrice, pricingMode) => {
  const hourlyRate = pricingMode === 'night' ? nightPrice : dayPrice;
  const rawAmount = (bookedDuration / 60) * hourlyRate;
  const roundedAmount = roundToNearest5(rawAmount);
  return { hourlyRate, rawAmount, roundedAmount };
};
