/**
 * Fix: Sync billing field names
 * 
 * payment_settings uses: min_amount, max_amount
 * But billing routes expect: min_topup, max_topup
 * 
 * This script adds the missing fields
 */

import { db } from '../config/firebase.js';

async function fixBillingFields() {
  console.log('🔧 Fixing billing field names...\n');

  try {
    const paymentRef = db.collection('payment_settings').doc('config');
    const paymentDoc = await paymentRef.get();
    const paymentData = paymentDoc.exists ? paymentDoc.data() : {};

    console.log('Current data:');
    console.log(JSON.stringify(paymentData, null, 2));

    // Map old field names to new ones
    const updateData = {
      // Add min_topup/max_topup if missing
      min_topup: paymentData.min_topup || paymentData.min_amount || 50000,
      max_topup: paymentData.max_topup || paymentData.max_amount || 1000000,
      
      // Also ensure legacy fields exist
      min_amount: paymentData.min_amount || paymentData.min_topup || 10000,
      max_amount: paymentData.max_amount || paymentData.max_topup || 1000000,
      
      // Add missing billing fields from legacy
      auto_renewal_enabled: paymentData.auto_renewal_enabled !== undefined 
        ? paymentData.auto_renewal_enabled 
        : true,
      low_balance_days: paymentData.low_balance_days || 5,
      reminder_days: paymentData.reminder_days || [7, 3, 1],
      
      updated_at: new Date().toISOString(),
      updated_by: 'field-fix-script',
    };

    console.log('\nUpdating with:');
    console.log(JSON.stringify(updateData, null, 2));

    await paymentRef.set(updateData, { merge: true });
    console.log('\n✅ payment_settings/config updated');

    // Verify
    const verifyDoc = await paymentRef.get();
    const verifyData = verifyDoc.exists ? verifyDoc.data() : {};
    
    console.log('\n✅ Updated payment_settings/config:');
    console.log(JSON.stringify(verifyData, null, 2));

    // Also fix legacy settings/billing
    const legacyRef = db.collection('settings').doc('billing');
    const legacyDoc = await legacyRef.get();
    const legacyData = legacyDoc.exists ? legacyDoc.data() : {};

    const legacyUpdateData = {
      min_topup: legacyData.min_topup || legacyData.min_amount || 50000,
      max_topup: legacyData.max_topup || legacyData.max_amount || 1000000,
      min_amount: legacyData.min_amount || legacyData.min_topup || 10000,
      max_amount: legacyData.max_amount || legacyData.max_topup || 1000000,
      updated_at: new Date().toISOString(),
      updated_by: 'field-fix-script',
    };

    await legacyRef.set(legacyUpdateData, { merge: true });
    console.log('\n✅ settings/billing updated (legacy)');

    console.log('\n🎉 Field sync complete!');
    console.log('\nField mapping:');
    console.log('  min_topup:', verifyData.min_topup);
    console.log('  max_topup:', verifyData.max_topup);
    console.log('  min_amount:', verifyData.min_amount);
    console.log('  max_amount:', verifyData.max_amount);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

fixBillingFields();
