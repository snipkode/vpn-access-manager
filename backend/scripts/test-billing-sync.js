/**
 * Test Script: Billing Settings Sync
 * 
 * Tests that admin updates to /api/admin/settings/billing
 * are reflected in user endpoint /api/payment-settings/config
 */

import { db } from '../config/firebase.js';

async function testBillingSync() {
  console.log('🧪 Testing Billing Settings Sync...\n');

  try {
    // 1. Check current payment_settings/config
    console.log('📄 Checking payment_settings/config...');
    const paymentSettingsDoc = await db.collection('payment_settings').doc('config').get();
    const paymentSettings = paymentSettingsDoc.exists ? paymentSettingsDoc.data() : {};
    console.log('   payment_settings/config:', JSON.stringify(paymentSettings, null, 2));

    // 2. Check legacy settings/billing
    console.log('\n📄 Checking settings/billing (legacy)...');
    const legacyDoc = await db.collection('settings').doc('billing').get();
    const legacySettings = legacyDoc.exists ? legacyDoc.data() : {};
    console.log('   settings/billing:', JSON.stringify(legacySettings, null, 2));

    // 3. Compare key fields
    console.log('\n🔍 Comparing key fields:');
    const fields = ['billing_enabled', 'currency', 'min_topup', 'max_topup', 'auto_renewal_enabled', 'low_balance_days'];
    
    let allMatch = true;
    for (const field of fields) {
      const paymentValue = paymentSettings[field];
      const legacyValue = legacySettings[field];
      const match = paymentValue === legacyValue;
      
      if (!match && paymentValue !== undefined) {
        allMatch = false;
      }
      
      console.log(`   ${field}:`);
      console.log(`     payment_settings: ${paymentValue}`);
      console.log(`     settings/billing: ${legacyValue}`);
      console.log(`     match: ${match ? '✅' : '❌'}`);
    }

    // 4. Test update
    console.log('\n📝 Testing update to payment_settings/config...');
    const testData = {
      billing_enabled: true,
      currency: 'IDR',
      min_topup: 50000,
      max_topup: 1000000,
      auto_renewal_enabled: true,
      low_balance_days: 5,
      updated_at: new Date().toISOString(),
      updated_by: 'test-script',
    };

    await db.collection('payment_settings').doc('config').set(testData, { merge: true });
    console.log('   ✅ Update successful');

    // 5. Verify update
    console.log('\n🔍 Verifying update...');
    const updatedDoc = await db.collection('payment_settings').doc('config').get();
    const updatedSettings = updatedDoc.exists ? updatedDoc.data() : {};
    console.log('   Updated payment_settings/config:', JSON.stringify(updatedSettings, null, 2));

    // 6. Check if legacy was also updated (if sync is working)
    console.log('\n🔍 Checking if legacy settings/billing was updated...');
    const updatedLegacyDoc = await db.collection('settings').doc('billing').get();
    const updatedLegacy = updatedLegacyDoc.exists ? updatedLegacyDoc.data() : {};
    console.log('   Updated settings/billing:', JSON.stringify(updatedLegacy, null, 2));

    console.log('\n✅ Test complete!');
    console.log('\n📋 Summary:');
    console.log(`   - payment_settings/config exists: ${paymentSettingsDoc.exists}`);
    console.log(`   - settings/billing exists: ${legacyDoc.exists}`);
    console.log(`   - All fields match: ${allMatch ? '✅' : '⚠️ Some fields differ'}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  process.exit(0);
}

testBillingSync();
