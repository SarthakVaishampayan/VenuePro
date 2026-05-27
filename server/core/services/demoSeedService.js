// ============================================================
// DEMO SEED SERVICE — Pre-populate demo tenants with sample data
// ============================================================

import mongoose from 'mongoose';
import Tenant from '../models/Tenant.js';
import Player from '../models/Player.js';
import { hashPassword } from '../utils/passwordHelper.js';
import { logger } from '../config/logger.js';

// ---------------------------------------------------------------------------
// REALISTIC DEMO DATA
// ---------------------------------------------------------------------------

const DEMO_RESOURCES = {
  pool_snooker: [
    { name: 'Pool Table 1', category: 'pool', dayPrice: 100, nightPrice: 150, capacity: 2, status: 'available' },
    { name: 'Pool Table 2', category: 'pool', dayPrice: 100, nightPrice: 150, capacity: 2, status: 'available' },
    { name: 'Snooker Table 1', category: 'snooker', dayPrice: 150, nightPrice: 200, capacity: 2, status: 'available' },
    { name: 'Premium Pool', category: 'premium', dayPrice: 200, nightPrice: 300, capacity: 2, status: 'available' },
    { name: 'VIP Table', category: 'vip', dayPrice: 300, nightPrice: 400, capacity: 2, status: 'available' },
  ],
  pickleball: [
    { name: 'Court A1', category: 'standard', dayPrice: 200, nightPrice: 300, capacity: 4, status: 'available' },
    { name: 'Court A2', category: 'standard', dayPrice: 200, nightPrice: 300, capacity: 4, status: 'available' },
    { name: 'Court B1', category: 'premium', dayPrice: 350, nightPrice: 500, capacity: 4, status: 'available' },
    { name: 'Court B2', category: 'premium', dayPrice: 350, nightPrice: 500, capacity: 4, status: 'available' },
    { name: 'Practice Court', category: 'practice', dayPrice: 100, nightPrice: 150, capacity: 2, status: 'available' },
  ],
  cricket_football: [
    { name: 'Main Turf', sportType: 'cricket', dayPrice: 800, nightPrice: 1200, capacity: 22, status: 'available' },
    { name: 'Practice Turf', sportType: 'cricket', dayPrice: 400, nightPrice: 600, capacity: 14, status: 'available' },
    { name: 'Football Field', sportType: 'football', dayPrice: 600, nightPrice: 1000, capacity: 22, status: 'available' },
    { name: 'Multi-Sport Turf', sportType: 'multipurpose', dayPrice: 500, nightPrice: 800, capacity: 22, status: 'available' },
    { name: 'Junior Turf', sportType: 'football', dayPrice: 300, nightPrice: 500, capacity: 10, status: 'available' },
  ],
  gaming_zone: [
    { name: 'PS5 Station 1', resourceType: 'console', platform: 'PS5', dayPrice: 80, nightPrice: 120, status: 'available' },
    { name: 'Xbox Station 1', resourceType: 'console', platform: 'Xbox', dayPrice: 80, nightPrice: 120, status: 'available' },
    { name: 'Gaming PC 1', resourceType: 'console', platform: 'PC', dayPrice: 100, nightPrice: 150, status: 'available' },
    { name: 'VR Arena', resourceType: 'console', platform: 'VR', dayPrice: 150, nightPrice: 200, status: 'available' },
    { name: 'Pool Table Zone', resourceType: 'table', tableType: 'pool', dayPrice: 100, nightPrice: 150, status: 'available' },
  ],
};

const DEMO_CUSTOMERS = [
  { fullName: 'Rahul Sharma', phone: '9876543210', totalBookings: 15, wins: 10, losses: 5 },
  { fullName: 'Priya Patel', phone: '9876543211', totalBookings: 8, wins: 3, losses: 5 },
  { fullName: 'Amit Singh', phone: '9876543212', totalBookings: 22, wins: 18, losses: 4 },
  { fullName: 'Sneha Gupta', phone: '9876543213', totalBookings: 5, wins: 2, losses: 3 },
  { fullName: 'Vikram Reddy', phone: '9876543214', totalBookings: 12, wins: 7, losses: 5 },
  { fullName: 'Ananya Verma', phone: '9876543215', totalBookings: 3, wins: 1, losses: 2 },
  { fullName: 'Arjun Nair', phone: '9876543216', totalBookings: 18, wins: 12, losses: 6 },
  { fullName: 'Divya Joshi', phone: '9876543217', totalBookings: 7, wins: 4, losses: 3 },
  { fullName: 'Karan Mehta', phone: '9876543218', totalBookings: 10, wins: 6, losses: 4 },
  { fullName: 'Neha Kapoor', phone: '9876543219', totalBookings: 6, wins: 3, losses: 3 },
];

const DEMO_EXPENSES = [
  { description: 'Monthly electricity bill', amount: 5000, category: 'electricity', paymentMode: 'online', dateOffsetDays: 5 },
  { description: 'Cleaning supplies restock', amount: 1200, category: 'supplies', paymentMode: 'cash', dateOffsetDays: 3 },
];

const DEMO_STAFF = [
  {
    name: 'Rajesh Kumar', phone: '9876543100', role: 'manager', hasPortalAccess: true, monthlySalary: 15000,
    password: 'staff123',
    permissions: {
      canManageResources: true, canManageSessions: true, canManagePayments: true,
      canManageCustomers: true, canManageStaff: false, canViewReports: true,
      canManageExpenses: true, canManageDues: true,
    },
  },
  {
    name: 'Sunil Verma', phone: '9876543101', role: 'staff', hasPortalAccess: true, monthlySalary: 10000,
    password: 'staff123',
    permissions: {
      canManageResources: false, canManageSessions: true, canManagePayments: false,
      canManageCustomers: true, canManageStaff: false, canViewReports: false,
      canManageExpenses: false, canManageDues: false,
    },
  },
];

// ---------------------------------------------------------------------------
// HELPER — Get pricing mode for a given hour
// ---------------------------------------------------------------------------

function getPricingMode(hour) {
  return (hour >= 18 || hour < 6) ? 'night' : 'day';
}

// ---------------------------------------------------------------------------
// SEED DEMO DATA
// ---------------------------------------------------------------------------

export async function seedDemoData(tenantId, businessTypeKey) {
  logger.info(`Seeding demo data for tenant ${tenantId}, type: ${businessTypeKey}`);

  // 1. Import models (registered by modules during server startup)
  const PlayerModel = Player;
  const PaymentModel = mongoose.model('Payment');
  const DueModel = mongoose.model('Due');
  const ExpenseModel = mongoose.model('Expense');
  const StaffUserModel = mongoose.model('StaffUser');

  // Resolve the resource model based on business type
  let ResourceModel;
  let resourceData;
  switch (businessTypeKey) {
    case 'pool_snooker':
      ResourceModel = mongoose.model('VenueResource');
      resourceData = DEMO_RESOURCES.pool_snooker;
      break;
    case 'pickleball':
      ResourceModel = mongoose.model('Court');
      resourceData = DEMO_RESOURCES.pickleball;
      break;
    case 'cricket_football':
      ResourceModel = mongoose.model('Turf');
      resourceData = DEMO_RESOURCES.cricket_football;
      break;
    case 'gaming_zone':
      ResourceModel = mongoose.model('GamingResource');
      resourceData = DEMO_RESOURCES.gaming_zone;
      break;
    default:
      throw new Error(`Unknown business type: ${businessTypeKey}`);
  }

  // 2. Create resources
  const resources = await ResourceModel.insertMany(
    resourceData.map(r => ({ ...r, tenantId }))
  );
  logger.info(`Created ${resources.length} resources`);

  // 3. Create customers
  const customers = await PlayerModel.insertMany(
    DEMO_CUSTOMERS.map(c => ({ ...c, tenantId }))
  );
  logger.info(`Created ${customers.length} customers`);

  // 4. Create staff (with hashed passwords)
  for (const staff of DEMO_STAFF) {
    const passwordHash = await hashPassword(staff.password);
    await StaffUserModel.create({
      tenantId,
      name: staff.name,
      phone: staff.phone,
      role: staff.role,
      hasPortalAccess: staff.hasPortalAccess,
      monthlySalary: staff.monthlySalary,
      password: staff.password,
      permissions: staff.permissions,
      isActive: true,
    });
  }
  logger.info('Created 2 staff members');

  // 5. Create sessions (20: 10 completed, 8 completed+paid, 2 in_progress)
  // IMPORTANT: Use the correct discriminator model per business type so sessions
  // are found by module-specific queries (e.g., PickleballBookingSession.find()).
  const now = new Date();
  let BookingModel;
  switch (businessTypeKey) {
    case 'pool_snooker': BookingModel = mongoose.model('BookingSession'); break;
    case 'pickleball': BookingModel = mongoose.model('PickleballBookingSession'); break;
    case 'cricket_football': BookingModel = mongoose.model('CricketFootballBookingSession'); break;
    case 'gaming_zone': BookingModel = mongoose.model('GamingZoneBookingSession'); break;
    default: BookingModel = mongoose.model('BookingSession');
  }

  const sessionTemplates = [];

  // 10 completed sessions (unpaid) over the past 7 days
  for (let i = 0; i < 10; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const startHour = 10 + Math.floor(Math.random() * 10); // 10am - 8pm
    const startMin = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
    const duration = 15 + Math.floor(Math.random() * 90); // 15-105 min
    const startDate = new Date(now.getTime() - daysAgo * 86400000);
    startDate.setHours(startHour, startMin, 0, 0);
    const endDate = new Date(startDate.getTime() + duration * 60000);
    const resourceIdx = i % resources.length;
    const custIdx = i % customers.length;
    const pricingMode = getPricingMode(startHour);

    const dayPrice = resources[resourceIdx].dayPrice || 100;
    const nightPrice = resources[resourceIdx].nightPrice || 150;
    const rate = pricingMode === 'day' ? dayPrice : nightPrice;
    const hours = duration / 60;
    const roundedAmount = Math.round((rate * hours) / 5) * 5;
    const finalAmount = Math.max(roundedAmount, 20);

    sessionTemplates.push({
      tenantId,
      resourceId: resources[resourceIdx]._id,
      resourceNameSnapshot: resources[resourceIdx].name,
      customerId: customers[custIdx]._id,
      customerNameSnapshot: customers[custIdx].fullName,
      startTime: startDate,
      startTimeRounded: startDate,
      endTime: endDate,
      endTimeRounded: endDate,
      durationMinutes: duration,
      bookingStatus: 'completed',
      pricingModeAtStart: pricingMode,
      pricingModeAtEnd: pricingMode,
      rateSnapshot: { dayPrice, nightPrice },
      rawAmount: roundedAmount,
      roundedAmount,
      finalAmount,
      paymentStatus: 'pending',
      bookingType: 'walk_in',
    });
  }

  // 8 completed + paid sessions
  for (let i = 0; i < 8; i++) {
    const daysAgo = 1 + Math.floor(Math.random() * 14);
    const startHour = 11 + Math.floor(Math.random() * 9);
    const startMin = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
    const duration = 20 + Math.floor(Math.random() * 80);
    const startDate = new Date(now.getTime() - daysAgo * 86400000);
    startDate.setHours(startHour, startMin, 0, 0);
    const endDate = new Date(startDate.getTime() + duration * 60000);
    const resourceIdx = (i + 2) % resources.length;
    const custIdx = (i + 3) % customers.length;
    const pricingMode = getPricingMode(startHour);

    const dayPrice = resources[resourceIdx].dayPrice || 100;
    const nightPrice = resources[resourceIdx].nightPrice || 150;
    const rate = pricingMode === 'day' ? dayPrice : nightPrice;
    const hours = duration / 60;
    const roundedAmount = Math.round((rate * hours) / 5) * 5;
    const finalAmount = Math.max(roundedAmount, 20);

    sessionTemplates.push({
      tenantId,
      resourceId: resources[resourceIdx]._id,
      resourceNameSnapshot: resources[resourceIdx].name,
      customerId: customers[custIdx]._id,
      customerNameSnapshot: customers[custIdx].fullName,
      startTime: startDate,
      startTimeRounded: startDate,
      endTime: endDate,
      endTimeRounded: endDate,
      durationMinutes: duration,
      bookingStatus: 'completed',
      pricingModeAtStart: pricingMode,
      pricingModeAtEnd: pricingMode,
      rateSnapshot: { dayPrice, nightPrice },
      rawAmount: roundedAmount,
      roundedAmount,
      finalAmount,
      paymentStatus: 'paid',
      bookingType: 'walk_in',
    });
  }

  // 2 in_progress sessions
  for (let i = 0; i < 2; i++) {
    const startDate = new Date(now.getTime() - (15 + i * 20) * 60000);
    const resourceIdx = (i + 4) % resources.length;
    const custIdx = (i + 5) % customers.length;
    const pricingMode = getPricingMode(startDate.getHours());

    const dayPrice = resources[resourceIdx].dayPrice || 100;
    const nightPrice = resources[resourceIdx].nightPrice || 150;

    // Mark resource as occupied
    await ResourceModel.findByIdAndUpdate(resources[resourceIdx]._id, { status: 'occupied' });

    sessionTemplates.push({
      tenantId,
      resourceId: resources[resourceIdx]._id,
      resourceNameSnapshot: resources[resourceIdx].name,
      customerId: customers[custIdx]._id,
      customerNameSnapshot: customers[custIdx].fullName,
      startTime: startDate,
      startTimeRounded: startDate,
      endTime: null,
      endTimeRounded: null,
      durationMinutes: 0,
      bookingStatus: 'in_progress',
      pricingModeAtStart: pricingMode,
      pricingModeAtEnd: null,
      rateSnapshot: { dayPrice, nightPrice },
      rawAmount: 0,
      roundedAmount: 0,
      finalAmount: 0,
      paymentStatus: 'pending',
      bookingType: 'walk_in',
    });
  }

  const sessions = await BookingModel.insertMany(sessionTemplates);
  logger.info(`Created ${sessions.length} sessions`);

  // 6. Create payments (5 payments linking to first 5 completed+paid sessions)
  const paidSessions = sessions.filter(s => s.paymentStatus === 'paid').slice(0, 5);
  const payments = [];
  for (let i = 0; i < paidSessions.length; i++) {
    const session = paidSessions[i];
    payments.push({
      tenantId,
      customerId: session.customerId,
      bookingSessionId: session._id,
      amount: session.finalAmount,
      mode: i % 2 === 0 ? 'cash' : 'online',
      type: 'payment',
      notes: 'Demo payment',
      receivedByName: 'Demo Owner',
    });
  }
  // Add 2 extra standalone payments
  payments.push({
    tenantId,
    customerId: customers[0]._id,
    amount: 500,
    mode: 'cash',
    type: 'payment',
    notes: 'Walk-in payment (no session)',
    receivedByName: 'Demo Owner',
  });
  payments.push({
    tenantId,
    customerId: customers[3]._id,
    amount: 300,
    mode: 'online',
    type: 'payment',
    notes: 'Online payment',
    receivedByName: 'Demo Owner',
  });

  await PaymentModel.insertMany(payments);
  logger.info(`Created ${payments.length} payments`);

  // 7. Create dues (3 dues from unpaid completed sessions)
  const unpaidSessions = sessions.filter(s => s.paymentStatus === 'pending').slice(0, 3);
  for (let i = 0; i < unpaidSessions.length; i++) {
    const session = unpaidSessions[i];
    await DueModel.create({
      tenantId,
      customerId: session.customerId,
      bookingSessionId: session._id,
      amount: session.finalAmount,
      paidAmount: 0,
      status: 'pending',
      notes: 'Demo due — payment pending',
    });
    // Update customer totalDue
    await PlayerModel.findByIdAndUpdate(session.customerId, {
      $inc: { totalDue: session.finalAmount },
    });
  }
  logger.info('Created 3 dues');

  // 8. Create expenses
  await ExpenseModel.insertMany(
    DEMO_EXPENSES.map(e => ({
      tenantId,
      description: e.description,
      amount: e.amount,
      category: e.category,
      paymentMode: e.paymentMode,
      date: new Date(now.getTime() - e.dateOffsetDays * 86400000),
      createdBy: 'demo_seed',
    }))
  );
  logger.info('Created 2 expenses');

  return { resources, customers, sessions, payments };
}

// ---------------------------------------------------------------------------
// DELETE ALL DEMO DATA (for reset)
// ---------------------------------------------------------------------------

export async function clearDemoData(tenantId) {
  const models = [
    'VenueResource', 'Court', 'Turf', 'GamingResource',
    'BookingSession', 'PickleballBookingSession',
    'CricketFootballBookingSession', 'GamingZoneBookingSession',
    'Payment', 'Due', 'Expense', 'StaffUser',
  ];

  for (const modelName of models) {
    try {
      const Model = mongoose.model(modelName);
      await Model.deleteMany({ tenantId });
    } catch {
      // Model not registered — skip
    }
  }

  await Player.deleteMany({ tenantId });
  logger.info(`Cleared demo data for tenant ${tenantId}`);
}

// ---------------------------------------------------------------------------
// DELETE AN EXPIRED DEMO TENANT & ALL ITS DATA
// ---------------------------------------------------------------------------

export async function deleteDemoTenant(tenantId) {
  await clearDemoData(tenantId);

  // Delete OwnerUser
  try {
    const OwnerUser = mongoose.model('OwnerUser');
    await OwnerUser.deleteMany({ tenantId });
  } catch { /* ignore */ }

  // Delete settings
  try {
    const TenantSetting = mongoose.model('TenantSetting');
    await TenantSetting.deleteMany({ tenantId });
  } catch { /* ignore */ }

  // Delete subscription
  try {
    const TenantSubscription = mongoose.model('TenantSubscription');
    await TenantSubscription.deleteMany({ tenantId });
  } catch { /* ignore */ }

  // Delete tenant itself
  await Tenant.findByIdAndDelete(tenantId);
  logger.info(`Deleted demo tenant ${tenantId} and all associated data`);
}
