// ============================================================
// VENUEPRO SAAS — Date Utilities
// ============================================================

/**
 * Round a date DOWN to the nearest N minutes
 * @param {Date} date - Input date
 * @param {number} minutes - Rounding interval (default: 5)
 * @returns {Date} Rounded date
 */
export const roundDownToNearest = (date, minutes = 5) => {
  const ms = minutes * 60 * 1000;
  return new Date(Math.floor(date.getTime() / ms) * ms);
};

/**
 * Round a date UP to the nearest N minutes
 * @param {Date} date - Input date
 * @param {number} minutes - Rounding interval (default: 5)
 * @returns {Date} Rounded date
 */
export const roundUpToNearest = (date, minutes = 5) => {
  const ms = minutes * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
};

/**
 * Calculate duration in minutes between two dates
 */
export const durationInMinutes = (start, end) => {
  return Math.round((end - start) / (1000 * 60));
};

/**
 * Format duration as human-readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} e.g., "1hr 30min"
 */
export const formatDuration = (minutes) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hrs === 0) return `${mins}min`;
  if (mins === 0) return `${hrs}hr`;
  return `${hrs}hr ${mins}min`;
};

/**
 * Format date for display
 */
export const formatDate = (date, format = 'short') => {
  const d = new Date(date);
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    case 'long':
      return d.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    case 'time':
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    case 'datetime':
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    case 'iso':
      return d.toISOString();
    default:
      return d.toISOString();
  }
};

/**
 * Get start of day (00:00:00)
 */
export const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of day (23:59:59.999)
 */
export const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Check if a date is today
 */
export const isToday = (date) => {
  const d = new Date(date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
};

/**
 * Get the current date in YYYY-MM-DD format
 */
export const todayStr = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Generate time slots (for slot-based booking)
 * @param {string} openTime - e.g., "06:00"
 * @param {string} closeTime - e.g., "23:00"
 * @param {number} slotDuration - Minutes per slot (default: 60)
 * @returns {Array} Array of { start, end } slot objects
 */
export const generateTimeSlots = (openTime, closeTime, slotDuration = 60) => {
  const slots = [];
  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);
  
  let current = new Date();
  current.setHours(openH, openM, 0, 0);
  
  const end = new Date();
  end.setHours(closeH, closeM, 0, 0);
  
  while (current < end) {
    const slotEnd = new Date(current.getTime() + slotDuration * 60 * 1000);
    
    if (slotEnd <= end) {
      slots.push({
        start: current.toTimeString().slice(0, 5),
        end: slotEnd.toTimeString().slice(0, 5)
      });
    }
    
    current = slotEnd;
  }
  
  return slots;
};

