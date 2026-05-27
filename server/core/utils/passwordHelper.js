import bcrypt from 'bcryptjs';
import { SYSTEM_CONFIG } from '../config/constants.js';

const SALT_ROUNDS = SYSTEM_CONFIG.BCRYPT_SALT_ROUNDS || 12;

// ============================================================
// PASSWORD HASHING
// ============================================================

export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

// ============================================================
// PASSWORD VALIDATION
// ============================================================

export const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (!password || password.length < SYSTEM_CONFIG.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${SYSTEM_CONFIG.PASSWORD_MIN_LENGTH} characters`);
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// ============================================================
// TEMPORARY PASSWORD GENERATION
// ============================================================

export const generateTemporaryPassword = () => {
  const length = 12;
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%^&*()';
  
  const getRandom = (chars) => chars[Math.floor(Math.random() * chars.length)];
  
  // Ensure at least one of each type
  let password = '';
  password += getRandom(upper);
  password += getRandom(lower);
  password += getRandom(digits);
  password += getRandom(special);
  
  // Fill remaining
  const all = upper + lower + digits + special;
  for (let i = password.length; i < length; i++) {
    password += getRandom(all);
  }
  
  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

