// ============================================================
// VENUEPRO SAAS — Database Seed Script
// ============================================================
// Run: node seed.js
// Drops existing seed data and re-creates it fresh.

import mongoose from 'mongoose';
import { config } from 'dotenv';
import SuperAdmin from './core/models/SuperAdmin.js';
import BusinessType from './core/models/BusinessType.js';
import SubscriptionPlan from './core/models/SubscriptionPlan.js';
import { BUSINESS_TYPES } from './core/config/constants.js';

// Load env
config({ path: './.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sports_facility_saas';

// ============================================================
// SEED DATA
// ============================================================

// ── Custom Super Admin credentials ────────────────────────
// Set these env vars before running seed to create a custom superadmin.
// If not set, defaults are used (with a warning).
const SUPER_ADMIN = {
  name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
  email: process.env.SUPER_ADMIN_EMAIL || 'admin@venuepro.com',
  passwordHash: process.env.SUPER_ADMIN_PASSWORD || 'Admin@123',
  role: 'super_admin',
  isActive: true
};

// Warn if defaults are being used
if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
  console.log('   ⚠️  No SUPER_ADMIN_EMAIL/PASSWORD env vars set. Using default credentials.');
  console.log('   ⚠️  Set these in your .env file for a custom superadmin.\n');
}

const SUBSCRIPTION_PLANS = [
  {
    name: 'Free',
    key: 'free',
    description: 'For trial users and micro-venues. Watermarked receipts.',
    prices: { monthly: 0, quarterly: 0, yearly: 0 },
    features: [
      { key: 'resources', name: 'Resources', description: 'Up to 2 resources', included: true },
      { key: 'staff', name: 'Staff accounts', description: 'Up to 2 staff', included: true },
      { key: 'reports', name: 'Basic reports', description: 'Daily & monthly reports', included: true },
      { key: 'receipts', name: 'Receipts', description: 'Watermarked receipts', included: true },
      { key: 'branding', name: 'White-labeling', description: 'Remove VenuePro branding', included: false },
      { key: 'api', name: 'API access', description: 'REST API & webhooks', included: false }
    ],
    limits: { branches: 1, resources: 2, staff: 2, storage: 50, apiRequests: 0 },
    trialDays: 14,
    sortOrder: 0,
    isActive: true,
    isVisible: true,
    badge: null
  },
  {
    name: 'Starter',
    key: 'starter',
    description: 'For small parlours and independent venues.',
    prices: { monthly: 39, quarterly: 111, yearly: 399 },
    features: [
      { key: 'resources', name: 'Resources', description: 'Up to 15 resources', included: true },
      { key: 'staff', name: 'Staff accounts', description: 'Up to 5 staff', included: true },
      { key: 'reports', name: 'Reports', description: 'Basic & detailed reports', included: true },
      { key: 'receipts', name: 'Receipts', description: 'Professional receipts', included: true },
      { key: 'branding', name: 'White-labeling', description: 'Remove VenuePro branding', included: false },
      { key: 'api', name: 'API access', description: 'REST API & webhooks', included: false }
    ],
    limits: { branches: 1, resources: 15, staff: 5, storage: 200, apiRequests: 0 },
    trialDays: 14,
    sortOrder: 1,
    isActive: true,
    isVisible: true,
    badge: null
  },
  {
    name: 'Professional',
    key: 'professional',
    description: 'For growing venues and multi-branch operations.',
    prices: { monthly: 79, quarterly: 225, yearly: 799 },
    features: [
      { key: 'resources', name: 'Resources', description: 'Up to 50 resources', included: true },
      { key: 'staff', name: 'Staff accounts', description: 'Up to 15 staff', included: true },
      { key: 'reports', name: 'Reports', description: 'All reports + export', included: true },
      { key: 'receipts', name: 'Receipts', description: 'Professional receipts', included: true },
      { key: 'branding', name: 'White-labeling', description: 'Remove VenuePro branding', included: true },
      { key: 'api', name: 'API access', description: 'REST API & webhooks', included: false }
    ],
    limits: { branches: 3, resources: 50, staff: 15, storage: 500, apiRequests: 0 },
    trialDays: 14,
    sortOrder: 2,
    isActive: true,
    isVisible: true,
    badge: 'Most Popular'
  },
  {
    name: 'Enterprise',
    key: 'enterprise',
    description: 'For large chains with unlimited everything.',
    prices: { monthly: 199, quarterly: 567, yearly: 1999 },
    features: [
      { key: 'resources', name: 'Resources', description: 'Unlimited', included: true },
      { key: 'staff', name: 'Staff accounts', description: 'Unlimited', included: true },
      { key: 'reports', name: 'Reports', description: 'All reports + custom', included: true },
      { key: 'receipts', name: 'Receipts', description: 'Custom branded receipts', included: true },
      { key: 'branding', name: 'White-labeling', description: 'Full white-labeling', included: true },
      { key: 'api', name: 'API access', description: 'Full API + webhooks', included: true }
    ],
    limits: { branches: 100, resources: 9999, staff: 9999, storage: 5000, apiRequests: 100000 },
    trialDays: 30,
    sortOrder: 3,
    isActive: true,
    isVisible: true,
    badge: 'Best Value'
  }
];

// ============================================================
// SEED FUNCTION
// ============================================================

async function seed() {
  console.log('\n========================================');
  console.log('  VENUEPRO SAAS — Database Seeder');
  console.log('========================================\n');

  let connection;
  try {
    // Connect to MongoDB
    console.log(`📡 Connecting to MongoDB at ${MONGODB_URI}...`);
    connection = await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected\n');

    // Clear existing seed data
    console.log('🧹 Clearing existing seed data...');
    await Promise.all([
      SuperAdmin.deleteOne({ email: SUPER_ADMIN.email }),
      BusinessType.deleteMany({}),
      SubscriptionPlan.deleteMany({})
    ]);
    console.log('✅ Existing seed data cleared\n');

    // --- SUPER ADMIN ---
    console.log('👤 Creating Super Admin...');
    const admin = await SuperAdmin.create(SUPER_ADMIN);
    console.log(`   ✓ Name:  ${admin.name}`);
    console.log(`   ✓ Email: ${admin.email}`);
    console.log(`   ✓ Pass:  ${SUPER_ADMIN.passwordHash}`);
    console.log(`   ✓ ID:    ${admin._id}\n`);

    // --- BUSINESS TYPES ---
    console.log('🏢 Creating Business Types...');
    const businessTypes = [];

    for (const [key, bt] of Object.entries(BUSINESS_TYPES)) {
      const created = await BusinessType.create({
        key: bt.key,
        name: bt.name,
        description: `${bt.name} — timer-based session billing with ${bt.customerLabelPlural.toLowerCase()} and ${bt.resourceLabelPlural.toLowerCase()}.`,
        labels: {
          resourceSingular: bt.resourceLabelSingular,
          resourcePlural: bt.resourceLabelPlural,
          bookingSingular: bt.bookingLabelSingular,
          bookingPlural: bt.bookingLabelPlural,
          customerSingular: bt.customerLabelSingular,
          customerPlural: bt.customerLabelPlural
        },
        pricingStrategy: bt.pricingStrategy,
        bookingMode: bt.bookingMode,
        enabledModules: bt.enabledModules,
        defaultSettings: bt.defaultSettings,
        status: 'active',
        sortOrder: Object.keys(BUSINESS_TYPES).indexOf(key) + 1
      });
      businessTypes.push(created);
      console.log(`   ✓ ${created.name} (${created.key})`);
    }
    console.log(`   → ${businessTypes.length} business types created\n`);

    // --- SUBSCRIPTION PLANS ---
    console.log('📋 Creating Subscription Plans...');
    const plans = [];

    for (const planData of SUBSCRIPTION_PLANS) {
      const plan = await SubscriptionPlan.create(planData);
      plans.push(plan);
      const badge = plan.badge ? ` [${plan.badge}]` : '';
      console.log(`   ✓ ${plan.name} — $${plan.prices.monthly}/mo${badge}`);
    }
    console.log(`   → ${plans.length} plans created\n`);

    // --- SUMMARY ---
    console.log('========================================');
    console.log('  SEED COMPLETE ✅');
    console.log('========================================\n');
    console.log('📋 Summary:');
    console.log(`   • Super Admin:     1 (${SUPER_ADMIN.email} / ${SUPER_ADMIN.passwordHash})`);
    console.log(`   • Business Types:  ${businessTypes.length}`);
    console.log(`   • Subscription Plans: ${plans.length}`);
    console.log(`\n🎯 Login at http://localhost:5173`);
    console.log(`   Email: ${SUPER_ADMIN.email}`);
    console.log(`   Password: ${SUPER_ADMIN.passwordHash}\n`);

  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error('   ⚠️  Make sure MongoDB is running on localhost:27017');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB\n');
    }
  }
}

seed();
