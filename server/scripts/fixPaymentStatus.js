// ============================================================
// FIX PAYMENT STATUS — One-time migration
// ============================================================
// Run: node server/scripts/fixPaymentStatus.js
//
// Finds all sessions with paymentStatus='pending' that have
// at least one linked payment record, and sets them to 'paid'.
// Also marks the payment's corresponding bookingSession's
// paymentStatus on the session record itself.
//
// This fixes existing data that was created before the
// cross-module payment status fix was implemented.

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load env from project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sports_facility_saas';

async function fixPaymentStatus() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  // Get the db instance
  const db = mongoose.connection.db;

  // Payment collection
  const paymentsCollection = db.collection('payments');

  // All session collection names to check
  const sessionCollections = [
    'bookingsessions',
    'pickleballbookingsessions',
    'cricketfootballbookingsessions',
    'gamingzonebookingsessions',
  ];

  let totalFixed = 0;

  for (const collName of sessionCollections) {
    const sessionCollection = db.collection(collName);
    console.log(`\n--- Checking ${collName} ---`);

    // Find all completed sessions with pending payment status
    const pendingSessions = await sessionCollection.find({
      bookingStatus: 'completed',
      paymentStatus: 'pending',
    }).toArray();

    console.log(`Found ${pendingSessions.length} completed+pending sessions`);

    for (const session of pendingSessions) {
      // Check if there's at least one payment linked to this session
      const linkedPaymentCount = await paymentsCollection.countDocuments({
        bookingSessionId: session._id,
      });

      if (linkedPaymentCount > 0) {
        // Found payment(s) — update the session
        await sessionCollection.updateOne(
          { _id: session._id },
          { $set: { paymentStatus: 'paid' } }
        );
        totalFixed++;
        console.log(`  ✅ Fixed session ${session._id} (${session.resourceNameSnapshot || 'N/A'}) - ${linkedPaymentCount} payment(s) found`);
      } else if (session.payments && session.payments.length > 0) {
        // Some old sessions might have embedded payment refs
        await sessionCollection.updateOne(
          { _id: session._id },
          { $set: { paymentStatus: 'paid' } }
        );
        totalFixed++;
        console.log(`  ✅ Fixed session ${session._id} (embedded payment refs)`);
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`Total sessions fixed: ${totalFixed}`);
  console.log(`========================================`);

  await mongoose.disconnect();
  console.log('Done.');
}

fixPaymentStatus().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
