import mongoose from 'mongoose';
import { hashPassword, comparePassword } from '../utils/passwordHelper.js';

/**
 * Unified Player model.
 *
 * Replaces the old two-model system (Customer + PlayerUser).
 * - `tenantId` is null for self-signed portal players, set for owner-created players.
 * - `passwordHash` is null for owner-created players until they set a password.
 * - `linkedTenants` tracks cross-venue visits for self-signed players.
 * - All stats (totalBookings, wins, losses, totalDue) live directly on the player.
 */
const playerSchema = new mongoose.Schema({
  // Tenant association (null = self-signed portal player, set = owner-created)
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    default: null,
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    default: null
  },

  // Identity
  customerCode: {
    type: String,
    default: null
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  nickname: {
    type: String,
    trim: true,
    maxlength: [50, 'Nickname cannot exceed 50 characters']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone cannot exceed 20 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  dob: {
    type: Date,
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],

  // Authentication (null for owner-created players who haven't set a password)
  passwordHash: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  resetPasswordToken: {
    type: String
  },
  resetPasswordExpires: {
    type: Date
  },
  passwordChangeRequired: {
    type: Boolean,
    default: false
  },

  // Stats
  totalBookings: {
    type: Number,
    default: 0
  },
  wins: {
    type: Number,
    default: 0
  },
  losses: {
    type: Number,
    default: 0
  },
  totalDue: {
    type: Number,
    default: 0
  },

  // Cross-tenant linking (tracks which venues a self-signed player has visited)
  linkedTenants: [{
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant'
    },
    linkedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Preferences
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    timezone: { type: String, default: 'Asia/Kolkata' }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.passwordHash;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    transform: (doc, ret) => {
      delete ret.passwordHash;
      delete ret.__v;
      return ret;
    }
  }
});

// At least one of email or phone must be provided
playerSchema.pre('validate', function (next) {
  if (!this.email && !this.phone) {
    this.invalidate('email', 'Either email or phone is required');
    this.invalidate('phone', 'Either email or phone is required');
  }
  next();
});

// Indexes
playerSchema.index({ email: 1 }, { unique: true, sparse: true, name: 'player_email_unique' });
playerSchema.index({ phone: 1 }, { unique: true, sparse: true, name: 'player_phone_unique' });
playerSchema.index({ tenantId: 1, phone: 1 });
playerSchema.index({ tenantId: 1, fullName: 'text', nickname: 'text' });
playerSchema.index({ tenantId: 1, totalDue: -1 });
playerSchema.index({ 'linkedTenants.tenantId': 1 });

// Methods
playerSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return comparePassword(candidatePassword, this.passwordHash);
};

const Player = mongoose.model('Player', playerSchema);
export default Player;
