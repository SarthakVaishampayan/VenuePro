// ============================================================
// POOL & SNOOKER — Pricing Service
// ============================================================
// Implements 5-minute rounding:
// - Start time rounds DOWN to nearest 5 minutes
// - End time rounds UP to nearest 5 minutes
// - Amount rounded to nearest 5
// - Discount capped at base amount

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
 * Day mode: 6:00 AM to 6:00 PM (configurable)
 * Night mode: 6:00 PM to 6:00 AM
 */
export const getPricingMode = (nightStartHour = 18, nightEndHour = 6) => {
  const now = new Date();
  const hour = now.getHours();
  // If night crosses midnight (e.g., 18 to 6), use OR logic.
  // If night is within same day (e.g., 2 to 6), use AND logic.
  if (nightStartHour > nightEndHour) {
    return (hour >= nightStartHour || hour < nightEndHour) ? 'night' : 'day';
  }
  return (hour >= nightStartHour && hour < nightEndHour) ? 'night' : 'day';
};

/**
 * Get the hourly rate based on pricing mode
 */
export const getHourlyRate = (pricingMode, dayPrice, nightPrice) => {
  return pricingMode === 'night' ? nightPrice : dayPrice;
};

/**
 * Calculate session amount with 5-minute rounding
 * @param {Date} startTime - Actual start time
 * @param {Date} endTime - Actual end time
 * @param {number} dayPrice - Day rate
 * @param {number} nightPrice - Night rate
 * @param {number} discount - Discount amount (optional)
 * @returns {Object} { startTimeRounded, endTimeRounded, durationMinutes, rawAmount, roundedAmount, finalAmount }
 */
export const calculateSessionAmount = (startTime, endTime, dayPrice, nightPrice, pricingMode, discount = 0) => {
  const startTimeRounded = roundDownTo5Minutes(startTime);
  const endTimeRounded = roundUpTo5Minutes(endTime);
  const durationMinutes = calculateDurationMinutes(startTimeRounded, endTimeRounded);

  if (durationMinutes <= 0) {
    return {
      startTimeRounded,
      endTimeRounded,
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
    startTimeRounded,
    endTimeRounded,
    durationMinutes,
    rawAmount,
    roundedAmount,
    finalAmount,
    discountAmount,
    hourlyRate
  };
};

/**
 * Generate a customer code from full name + date
 */
export const generateCustomerCode = (fullName) => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const datePart = `${day}${month}${year}`;

  const parts = fullName.trim().split(/\s+/);
  let initials = '';

  if (parts.length === 1) {
    initials = parts[0].slice(0, 3).toLowerCase();
  } else if (parts.length === 2) {
    initials = (parts[0][0] + parts[1][0]).toLowerCase();
  } else {
    initials = (parts[0][0] + parts[1][0] + parts[2][0]).toLowerCase();
  }

  return `${datePart}-${initials}`;
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
