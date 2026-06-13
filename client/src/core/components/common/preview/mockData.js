// ============================================================
// PRODUCT PREVIEW — Hardcoded Mock Data
// ============================================================
// All data is client-side only. Zero API calls.

export const BUSINESS_TYPES = [
  { key: 'pool_snooker', name: 'Pool & Snooker Parlour', icon: '🎱', description: 'Tables, sessions, timer-based billing' },
  { key: 'cricket_football', name: 'Cricket / Football Turf', icon: '🏏', description: 'Turf booking, duration-based sessions' },
  { key: 'pickleball', name: 'Pickleball Court', icon: '🏓', description: 'Court booking, duration-based sessions' },
  { key: 'gaming_zone', name: 'Gaming Zone', icon: '🎮', description: 'Console/PC/VR session billing' },
];

export const DASHBOARD_STATS = {
  todayRevenue: 12450,
  activeSessions: 3,
  availableResources: 4,
  totalResources: 5,
  pendingDues: 5,
  totalCustomers: 10,
  revenueChange: 12.5,
  sessionsChange: 8.3,
};

export const RESOURCES = [
  { id: 1, name: 'Pool Table 1', category: 'pool', dayPrice: 100, nightPrice: 150, status: 'available', capacity: 2 },
  { id: 2, name: 'Pool Table 2', category: 'pool', dayPrice: 100, nightPrice: 150, status: 'available', capacity: 2 },
  { id: 3, name: 'Snooker Table 1', category: 'snooker', dayPrice: 150, nightPrice: 200, status: 'occupied', capacity: 2 },
  { id: 4, name: 'Premium Pool', category: 'premium', dayPrice: 200, nightPrice: 300, status: 'available', capacity: 2 },
  { id: 5, name: 'VIP Table', category: 'vip', dayPrice: 300, nightPrice: 400, status: 'occupied', capacity: 2 },
];

export const CUSTOMERS = [
  { id: 1, name: 'Rahul Sharma', phone: '9876543210', bookings: 15, wins: 10, losses: 5, totalDue: 450 },
  { id: 2, name: 'Priya Patel', phone: '9876543211', bookings: 8, wins: 3, losses: 5, totalDue: 0 },
  { id: 3, name: 'Amit Singh', phone: '9876543212', bookings: 22, wins: 18, losses: 4, totalDue: 1200 },
  { id: 4, name: 'Sneha Gupta', phone: '9876543213', bookings: 5, wins: 2, losses: 3, totalDue: 0 },
  { id: 5, name: 'Vikram Reddy', phone: '9876543214', bookings: 12, wins: 7, losses: 5, totalDue: 300 },
  { id: 6, name: 'Ananya Verma', phone: '9876543215', bookings: 3, wins: 1, losses: 2, totalDue: 0 },
  { id: 7, name: 'Arjun Nair', phone: '9876543216', bookings: 18, wins: 12, losses: 6, totalDue: 600 },
  { id: 8, name: 'Divya Joshi', phone: '9876543217', bookings: 7, wins: 4, losses: 3, totalDue: 150 },
  { id: 9, name: 'Karan Mehta', phone: '9876543218', bookings: 10, wins: 6, losses: 4, totalDue: 0 },
  { id: 10, name: 'Neha Kapoor', phone: '9876543219', bookings: 6, wins: 3, losses: 3, totalDue: 0 },
];

export const SESSIONS = [
  { id: 1, resourceName: 'Pool Table 1', customerName: 'Rahul Sharma', startTime: '09:15 AM', elapsed: '1h 25m', amount: 150, status: 'completed', paid: false },
  { id: 2, resourceName: 'Snooker Table 1', customerName: 'Amit Singh', startTime: '10:00 AM', elapsed: '2h 10m', amount: 320, status: 'completed', paid: true },
  { id: 3, resourceName: 'Premium Pool', customerName: 'Priya Patel', startTime: '11:30 AM', elapsed: '45m', amount: 100, status: 'completed', paid: true },
  { id: 4, resourceName: 'VIP Table', customerName: 'Arjun Nair', startTime: '12:00 PM', elapsed: '1h 30m', amount: 450, status: 'completed', paid: false },
  { id: 5, resourceName: 'Pool Table 2', customerName: 'Vikram Reddy', startTime: '02:00 PM', elapsed: '50m', amount: 100, status: 'completed', paid: true },
  { id: 6, resourceName: 'Snooker Table 1', customerName: 'Sneha Gupta', startTime: '03:15 PM', elapsed: '1h 10m', amount: 200, status: 'completed', paid: false },
  { id: 7, resourceName: 'Premium Pool', customerName: 'Karan Mehta', startTime: '04:30 PM', elapsed: '35m', amount: 100, status: 'in_progress', paid: false },
  { id: 8, resourceName: 'VIP Table', customerName: 'Divya Joshi', startTime: '05:00 PM', elapsed: '15m', amount: 100, status: 'in_progress', paid: false },
];

export const PAYMENTS = [
  { id: 1, customerName: 'Amit Singh', amount: 320, mode: 'cash', date: '2026-06-10', type: 'Session Payment' },
  { id: 2, customerName: 'Priya Patel', amount: 100, mode: 'online', date: '2026-06-10', type: 'Session Payment' },
  { id: 3, customerName: 'Vikram Reddy', amount: 100, mode: 'cash', date: '2026-06-09', type: 'Session Payment' },
  { id: 4, customerName: 'Rahul Sharma', amount: 500, mode: 'online', date: '2026-06-09', type: 'Due Payment' },
  { id: 5, customerName: 'Arjun Nair', amount: 300, mode: 'cash', date: '2026-06-08', type: 'Session Payment' },
];

export const DUES = [
  { id: 1, customerName: 'Rahul Sharma', amount: 450, paid: 200, status: 'partial', session: 'Pool Table 1' },
  { id: 2, customerName: 'Arjun Nair', amount: 600, paid: 0, status: 'pending', session: 'VIP Table' },
  { id: 3, customerName: 'Sneha Gupta', amount: 200, paid: 0, status: 'pending', session: 'Snooker Table 1' },
  { id: 4, customerName: 'Divya Joshi', amount: 150, paid: 0, status: 'pending', session: 'Premium Pool' },
  { id: 5, customerName: 'Amit Singh', amount: 1200, paid: 300, status: 'partial', session: 'Snooker Table 1' },
];

export const EXPENSES = [
  { id: 1, description: 'Monthly electricity bill', amount: 5000, category: 'electricity', date: '2026-06-05', paidBy: 'cash' },
  { id: 2, description: 'Cleaning supplies restock', amount: 1200, category: 'supplies', date: '2026-06-03', paidBy: 'cash' },
  { id: 3, description: 'Chalk & tip replacement', amount: 450, category: 'supplies', date: '2026-06-01', paidBy: 'cash' },
  { id: 4, description: 'AC maintenance', amount: 2000, category: 'maintenance', date: '2026-05-28', paidBy: 'online' },
];

export const STAFF = [
  { id: 1, name: 'Rajesh Kumar', role: 'manager', phone: '9876543100', salary: 15000, active: true, permissions: { manageResources: true, manageSessions: true, managePayments: true, manageCustomers: true, manageStaff: false, viewReports: true, manageExpenses: true, manageDues: true } },
  { id: 2, name: 'Sunil Verma', role: 'staff', phone: '9876543101', salary: 10000, active: true, permissions: { manageResources: false, manageSessions: true, managePayments: false, manageCustomers: true, manageStaff: false, viewReports: false, manageExpenses: false, manageDues: false } },
];

export const WEEKLY_REVENUE = [
  { day: 'Mon', amount: 8500 },
  { day: 'Tue', amount: 7200 },
  { day: 'Wed', amount: 9800 },
  { day: 'Thu', amount: 6100 },
  { day: 'Fri', amount: 12400 },
  { day: 'Sat', amount: 15600 },
  { day: 'Sun', amount: 11200 },
];

export const PAYMENT_MODE_SPLIT = [
  { mode: 'Cash', amount: 18500, percentage: 62 },
  { mode: 'Online', amount: 11500, percentage: 38 },
];

// ============================================================
// TOUR STEPS
// ============================================================

export const TOUR_STEPS = [
  {
    page: 'welcome',
    title: 'Welcome to VenuePro!',
    description: 'Take this quick guided tour to see how VenuePro helps you manage your sports facility — from booking sessions to tracking payments and staff.',
    icon: '🎯',
  },
  {
    page: 'dashboard',
    title: 'Dashboard Overview',
    description: 'Your command center. See today\'s revenue, active sessions, resource availability, and pending dues at a glance — all updated in real-time.',
    icon: '📊',
  },
  {
    page: 'resources',
    title: 'Manage Resources',
    description: 'Add and manage tables, courts, or turfs. Each resource has customizable day/night pricing and availability status. Click any resource to see details.',
    icon: '🎱',
  },
  {
    page: 'sessions',
    title: 'Start & Track Sessions',
    description: 'Start a session with one click. The live timer tracks elapsed time and calculates costs automatically with 5-minute rounding.',
    icon: '⏱️',
  },
  {
    page: 'customers',
    title: 'Customer Management',
    description: 'Track your regulars — booking history, win/loss records, and contact info all in one place. Know your best customers at a glance.',
    icon: '👥',
  },
  {
    page: 'payments',
    title: 'Record Payments',
    description: 'Accept cash or online payments. Receipts are auto-generated, and payments can be linked to sessions or dues.',
    icon: '💳',
  },
  {
    page: 'dues',
    title: 'Track & Collect Dues',
    description: 'Never miss a payment. Track outstanding amounts, accept partial payments, and waive off dues for regular customers.',
    icon: '📋',
  },
  {
    page: 'reports',
    title: 'Analytics & Reports',
    description: 'See revenue trends, payment method splits, and daily summaries. Make data-driven decisions for your venue.',
    icon: '📈',
  },
  {
    page: 'staff',
    title: 'Staff Management',
    description: 'Add staff with role-based permissions. Managers have full access, while staff can handle sessions and customers.',
    icon: '👨‍💼',
  },
  {
    page: 'expenses',
    title: 'Expense Tracking',
    description: 'Track operational costs like electricity, supplies, and maintenance. Keep your profit and loss clear.',
    icon: '💰',
  },
  {
    page: null,
    title: 'Ready to Get Started?',
    description: 'You\'ve seen the key features! Our team will set up a personalized free trial for your venue — tailored to your specific business needs.',
    icon: '✨',
    isFinal: true,
  },
];

// ============================================================
// FEATURE TOOLTIPS (for hotspot layer)
// ============================================================

export const FEATURE_TOOLTIPS = {
  'stat-revenue': {
    title: 'Today\'s Revenue',
    description: 'Total earnings from all sessions and payments today. Updated in real-time as sessions end.',
  },
  'stat-sessions': {
    title: 'Active Sessions',
    description: 'Currently running sessions. Click to view session details and end sessions.',
  },
  'stat-resources': {
    title: 'Resource Status',
    description: 'Shows how many resources are available vs total. Green = available, Red = occupied.',
  },
  'stat-dues': {
    title: 'Pending Dues',
    description: 'Outstanding payments from customers. Track and collect them from the Dues page.',
  },
  'resource-tile': {
    title: 'Resource Tiles',
    description: 'Each tile shows a resource (table/court) with its pricing. Click to start a session or view details.',
  },
  'session-timer': {
    title: 'Live Session Timer',
    description: 'Tracks elapsed time with 1-second accuracy. Cost updates automatically based on day/night rates.',
  },
  'customer-row': {
    title: 'Customer History',
    description: 'Each customer shows their total bookings and win/loss record. Click for full history.',
  },
  'payment-mode': {
    title: 'Payment Modes',
    description: 'Accept cash or online payments (UPI, cards). All transactions are recorded with receipts.',
  },
  'due-actions': {
    title: 'Due Actions',
    description: 'Collect full payment, accept partial payments, or waive off dues. Flexible collection options.',
  },
  'staff-permissions': {
    title: 'Staff Permissions',
    description: 'Control what each staff member can access. Managers get full access, staff get limited permissions.',
  },
};
