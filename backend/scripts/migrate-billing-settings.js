/**
 * Migration Script: Sync Billing Settings
 * 
 * One-time sync from legacy settings/billing to payment_settings/config
 * Run this to ensure existing billing settings are preserved
 */

import { db } from '../config/firebase.js';

async function migrateBillingSettings() {
  console.log('🔄 Starting billing settings migration...\n');

  try {
    // Get legacy settings/billing
    console.log('📄 Reading legacy settings/billing...');
    const legacyRef = db.collection('settings').doc('billing');
    const legacyDoc = await legacyRef.get();
    const legacyData = legacyDoc.exists ? legacyDoc.data() : {};
    
    console.log('   Legacy data found:', legacyDoc.exists);
    if (legacyDoc.exists) {
      console.log('   ', JSON.stringify(legacyData, null, 2));
    }

    // Get current payment_settings/config
    console.log('\n📄 Reading payment_settings/config...');
    const paymentRef = db.collection('payment_settings').doc('config');
    const paymentDoc = await paymentRef.get();
    const paymentData = paymentDoc.exists ? paymentDoc.data() : {};
    
    console.log('   Payment settings found:', paymentDoc.exists);
    if (paymentDoc.exists) {
      console.log('   ', JSON.stringify(paymentData, null, 2));
    }

    // Merge data (payment_settings takes precedence, fill gaps from legacy)
    console.log('\n🔀 Merging data...');
    const mergedData = {
      // Payment settings fields (take precedence)
      billing_enabled: paymentData.billing_enabled !== undefined 
        ? paymentData.billing_enabled 
        : (legacyData.billing_enabled || false),
      currency: paymentData.currency || legacyData.currency || 'IDR',
      
      // Topup settings
      min_topup: paymentData.min_topup !== undefined 
        ? paymentData.min_topup 
        : (legacyData.min_topup || 50000),
      max_topup: paymentData.max_topup !== undefined 
        ? paymentData.max_topup 
        : (legacyData.max_topup || 1000000),
      
      // Feature flags
      auto_renewal_enabled: paymentData.auto_renewal_enabled !== undefined 
        ? paymentData.auto_renewal_enabled 
        : (legacyData.auto_renewal_enabled || false),
      
      // Notification settings
      low_balance_days: paymentData.low_balance_days !== undefined 
        ? paymentData.low_balance_days 
        : (legacyData.low_balance_days || 5),
      reminder_days: paymentData.reminder_days || legacyData.reminder_days || [7, 3, 1],
      
      // Timestamps
      created_at: paymentData.created_at || legacyData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: 'migration-script-2026-03-07',
    };

    console.log('\n💾 Merged data to write:');
    console.log('   ', JSON.stringify(mergedData, null, 2));

    // Write to payment_settings/config
    console.log('\n✍️  Writing to payment_settings/config...');
    await paymentRef.set(mergedData, { merge: true });
    console.log('   ✅ Write successful');

    // Update legacy settings/billing with synced data
    console.log('\n✍️  Updating legacy settings/billing for consistency...');
    const legacyUpdateData = {
      billing_enabled: mergedData.billing_enabled,
      currency: mergedData.currency,
      min_topup: mergedData.min_topup,
      max_topup: mergedData.max_topup,
      auto_renewal_enabled: mergedData.auto_renewal_enabled,
      low_balance_days: mergedData.low_balance_days,
      reminder_days: mergedData.reminder_days,
      updated_at: mergedData.updated_at,
      updated_by: 'migration-script-2026-03-07',
    };
    
    if (!legacyDoc.exists) {
      legacyUpdateData.created_at = mergedData.created_at;
    }
    
    await legacyRef.set(legacyUpdateData, { merge: true });
    console.log('   ✅ Legacy sync successful');

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const verifyPaymentDoc = await paymentRef.get();
    const verifyLegacyDoc = await legacyRef.get();
    
    const verifyPayment = verifyPaymentDoc.exists ? verifyPaymentDoc.data() : {};
    const verifyLegacy = verifyLegacyDoc.exists ? verifyLegacyDoc.data() : {};
    
    console.log('\n✅ Migration complete!');
    console.log('\n📊 Final State:');
    console.log('\n   payment_settings/config:');
    console.log('      billing_enabled:', verifyPayment.billing_enabled);
    console.log('      min_topup:', verifyPayment.min_topup);
    console.log('      max_topup:', verifyPayment.max_topup);
    console.log('      auto_renewal_enabled:', verifyPayment.auto_renewal_enabled);
    console.log('      low_balance_days:', verifyPayment.low_balance_days);
    
    console.log('\n   settings/billing (legacy):');
    console.log('      billing_enabled:', verifyLegacy.billing_enabled);
    console.log('      min_topup:', verifyLegacy.min_topup);
    console.log('      max_topup:', verifyLegacy.max_topup);
    console.log('      auto_renewal_enabled:', verifyLegacy.auto_renewal_enabled);
    console.log('      low_balance_days:', verifyLegacy.low_balance_days);
    
    // Check if they match
    const fieldsMatch = 
      verifyPayment.billing_enabled === verifyLegacy.billing_enabled &&
      verifyPayment.min_topup === verifyLegacy.min_topup &&
      verifyPayment.max_topup === verifyLegacy.max_topup &&
      verifyPayment.auto_renewal_enabled === verifyLegacy.auto_renewal_enabled &&
      verifyPayment.low_balance_days === verifyLegacy.low_balance_days;
    
    console.log('\n✅ Collections synced:', fieldsMatch ? '✅ YES' : '❌ NO');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

migrateBillingSettings();
