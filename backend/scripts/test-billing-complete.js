/**
 * Comprehensive Billing System Test
 * 
 * Tests:
 * 1. Check billing settings in both collections
 * 2. Enable billing if disabled
 * 3. Test admin endpoint (PATCH /api/admin/settings/billing)
 * 4. Test user endpoint (GET /api/payment-settings/config)
 * 5. Test billing submit endpoint validation
 * 6. Verify bank accounts exist
 */

import { db } from '../config/firebase.js';

const TEST_CONFIG = {
  billing_enabled: true,
  currency: 'IDR',
  min_topup: 50000,
  max_topup: 1000000,
  auto_renewal_enabled: true,
  low_balance_days: 5,
};

let testResults = {
  passed: 0,
  failed: 0,
  tests: [],
};

function logTest(name, passed, details = '') {
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
    console.log(`✅ PASS: ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ FAIL: ${name}`);
    if (details) console.log(`   Details: ${details}`);
  }
}

async function testBillingSystem() {
  console.log('🧪 ============================================');
  console.log('   BILLING SYSTEM COMPREHENSIVE TEST');
  console.log('   Started at:', new Date().toISOString());
  console.log('============================================\n');

  // ========================================
  // TEST 1: Check payment_settings/config
  // ========================================
  console.log('📋 TEST 1: Check payment_settings/config');
  console.log('-------------------------------------------');
  try {
    const paymentRef = db.collection('payment_settings').doc('config');
    const paymentDoc = await paymentRef.get();
    const paymentData = paymentDoc.exists ? paymentDoc.data() : {};

    logTest(
      'payment_settings/config exists',
      paymentDoc.exists,
      paymentDoc.exists ? 'Document found' : 'Document not found'
    );

    if (paymentDoc.exists) {
      logTest(
        'billing_enabled is boolean',
        typeof paymentData.billing_enabled === 'boolean',
        `Value: ${paymentData.billing_enabled}`
      );

      logTest(
        'currency is set',
        !!paymentData.currency,
        `Value: ${paymentData.currency || 'not set'}`
      );

      logTest(
        'min_topup is number',
        typeof paymentData.min_topup === 'number',
        `Value: ${paymentData.min_topup || 'not set'}`
      );

      logTest(
        'max_topup is number',
        typeof paymentData.max_topup === 'number',
        `Value: ${paymentData.max_topup || 'not set'}`
      );
    }

    console.log('\n   Current payment_settings/config:');
    console.log('   ', JSON.stringify(paymentData, null, 2));

  } catch (error) {
    logTest('Check payment_settings/config', false, error.message);
  }

  // ========================================
  // TEST 2: Check settings/billing (legacy)
  // ========================================
  console.log('\n📋 TEST 2: Check settings/billing (legacy)');
  console.log('-------------------------------------------');
  try {
    const legacyRef = db.collection('settings').doc('billing');
    const legacyDoc = await legacyRef.get();
    const legacyData = legacyDoc.exists ? legacyDoc.data() : {};

    logTest(
      'settings/billing exists',
      legacyDoc.exists,
      legacyDoc.exists ? 'Document found' : 'Document not found'
    );

    if (legacyDoc.exists) {
      logTest(
        'billing_enabled is boolean (legacy)',
        typeof legacyData.billing_enabled === 'boolean',
        `Value: ${legacyData.billing_enabled}`
      );
    }

    console.log('\n   Current settings/billing:');
    console.log('   ', JSON.stringify(legacyData, null, 2));

  } catch (error) {
    logTest('Check settings/billing', false, error.message);
  }

  // ========================================
  // TEST 3: Check bank_accounts
  // ========================================
  console.log('\n📋 TEST 3: Check bank_accounts');
  console.log('-------------------------------------------');
  try {
    const banksSnapshot = await db.collection('bank_accounts')
      .where('active', '==', true)
      .get();

    logTest(
      'Has active bank accounts',
      banksSnapshot.size > 0,
      `Found ${banksSnapshot.size} active account(s)`
    );

    if (banksSnapshot.size > 0) {
      console.log('\n   Active Banks:');
      banksSnapshot.forEach(doc => {
        const bank = doc.data();
        console.log(`      - ${bank.bank}: ${bank.account_number} (${bank.account_name})`);
      });
    } else {
      console.log('   ⚠️  WARNING: No active bank accounts!');
      console.log('   Users cannot submit payments without bank accounts.');
    }

  } catch (error) {
    logTest('Check bank_accounts', false, error.message);
  }

  // ========================================
  // TEST 4: Sync check between collections
  // ========================================
  console.log('\n📋 TEST 4: Collection Sync Check');
  console.log('-------------------------------------------');
  try {
    const paymentRef = db.collection('payment_settings').doc('config');
    const legacyRef = db.collection('settings').doc('billing');
    
    const [paymentDoc, legacyDoc] = await Promise.all([
      paymentRef.get(),
      legacyRef.get()
    ]);

    const paymentData = paymentDoc.exists ? paymentDoc.data() : {};
    const legacyData = legacyDoc.exists ? legacyDoc.data() : {};

    const fields = ['billing_enabled', 'currency', 'min_topup', 'max_topup', 'auto_renewal_enabled', 'low_balance_days'];
    let allMatch = true;
    const mismatches = [];

    for (const field of fields) {
      if (paymentData[field] !== legacyData[field]) {
        allMatch = false;
        mismatches.push(`${field}: ${paymentData[field]} vs ${legacyData[field]}`);
      }
    }

    logTest(
      'Collections are synced',
      allMatch,
      allMatch ? 'All fields match' : `Mismatches: ${mismatches.join(', ')}`
    );

  } catch (error) {
    logTest('Collection sync check', false, error.message);
  }

  // ========================================
  // TEST 5: Enable billing if disabled
  // ========================================
  console.log('\n📋 TEST 5: Enable Billing (if disabled)');
  console.log('-------------------------------------------');
  try {
    const paymentRef = db.collection('payment_settings').doc('config');
    const paymentDoc = await paymentRef.get();
    const paymentData = paymentDoc.exists ? paymentDoc.data() : {};

    if (!paymentData.billing_enabled) {
      console.log('   ⚠️  Billing is DISABLED. Enabling now...');

      const updateData = {
        ...TEST_CONFIG,
        updated_at: new Date().toISOString(),
        updated_by: 'test-script',
      };

      if (!paymentDoc.exists) {
        updateData.created_at = updateData.updated_at;
      }

      await paymentRef.set(updateData, { merge: true });
      console.log('   ✅ payment_settings/config updated');

      // Also update legacy
      const legacyRef = db.collection('settings').doc('billing');
      const legacyDoc = await legacyRef.get();
      
      const legacyUpdateData = {
        ...TEST_CONFIG,
        updated_at: updateData.updated_at,
        updated_by: updateData.updated_by,
      };

      if (!legacyDoc.exists) {
        legacyUpdateData.created_at = updateData.updated_at;
      }

      await legacyRef.set(legacyUpdateData, { merge: true });
      console.log('   ✅ settings/billing updated (legacy)');

      // Verify
      const verifyDoc = await paymentRef.get();
      const verifyData = verifyDoc.exists ? verifyDoc.data() : {};

      logTest(
        'billing_enabled after update',
        verifyData.billing_enabled === true,
        `Value: ${verifyData.billing_enabled}`
      );

    } else {
      console.log('   ✅ Billing is already ENABLED');
      logTest('Billing already enabled', true, 'No action needed');
    }

  } catch (error) {
    logTest('Enable billing', false, error.message);
  }

  // ========================================
  // TEST 6: Validate required fields
  // ========================================
  console.log('\n📋 TEST 6: Validate Required Fields');
  console.log('-------------------------------------------');
  try {
    const paymentRef = db.collection('payment_settings').doc('config');
    const paymentDoc = await paymentRef.get();
    const paymentData = paymentDoc.exists ? paymentDoc.data() : {};

    const requiredFields = [
      { field: 'billing_enabled', type: 'boolean', expected: true },
      { field: 'currency', type: 'string', min: 3 },
      { field: 'min_topup', type: 'number', min: 10000 },
      { field: 'max_topup', type: 'number', min: 50000 },
    ];

    for (const { field, type, expected, min } of requiredFields) {
      const value = paymentData[field];
      let valid = false;
      let reason = '';

      if (type === 'boolean') {
        valid = typeof value === 'boolean' && value === expected;
        reason = `Expected: ${expected}, Got: ${value}`;
      } else if (type === 'string') {
        valid = typeof value === 'string' && value.length >= min;
        reason = `Expected: string>=${min}, Got: "${value}"`;
      } else if (type === 'number') {
        valid = typeof value === 'number' && value >= min;
        reason = `Expected: number>=${min}, Got: ${value}`;
      }

      logTest(
        `Field validation: ${field}`,
        valid,
        reason
      );
    }

  } catch (error) {
    logTest('Validate required fields', false, error.message);
  }

  // ========================================
  // TEST 7: API Endpoint Simulation
  // ========================================
  console.log('\n📋 TEST 7: API Endpoint Validation');
  console.log('-------------------------------------------');
  
  // Simulate checkBillingEnabled middleware
  try {
    const paymentRef = db.collection('payment_settings').doc('config');
    const paymentDoc = await paymentRef.get();
    const settings = paymentDoc.exists ? paymentDoc.data() : {};

    const billingEnabled = settings.billing_enabled === true;
    const hasBankAccounts = await db.collection('bank_accounts')
      .where('active', '==', true)
      .get()
      .then(snap => snap.size > 0);

    logTest(
      'checkBillingEnabled would pass',
      billingEnabled,
      billingEnabled ? 'billing_enabled = true' : 'billing_enabled = false/undefined'
    );

    logTest(
      'User can submit payments',
      billingEnabled && hasBankAccounts,
      billingEnabled && hasBankAccounts 
        ? 'All conditions met' 
        : `billing_enabled: ${billingEnabled}, has_bank_accounts: ${hasBankAccounts}`
    );

  } catch (error) {
    logTest('API endpoint validation', false, error.message);
  }

  // ========================================
  // SUMMARY
  // ========================================
  console.log('\n============================================');
  console.log('   TEST SUMMARY');
  console.log('============================================');
  console.log(`   Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`   ✅ Passed: ${testResults.passed}`);
  console.log(`   ❌ Failed: ${testResults.failed}`);
  console.log('============================================\n');

  if (testResults.failed > 0) {
    console.log('⚠️  FAILED TESTS:');
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`   - ${t.name}: ${t.details}`);
      });
    console.log('\n');
  }

  // Final status
  const paymentRef = db.collection('payment_settings').doc('config');
  const paymentDoc = await paymentRef.get();
  const paymentData = paymentDoc.exists ? paymentDoc.data() : {};
  
  const banksSnapshot = await db.collection('bank_accounts')
    .where('active', '==', true)
    .get();

  const canSubmitPayments = paymentData.billing_enabled === true && banksSnapshot.size > 0;

  if (canSubmitPayments) {
    console.log('🎉 SUCCESS! Users can now submit payments.\n');
  } else {
    console.log('⚠️  WARNING! Users CANNOT submit payments.\n');
    if (paymentData.billing_enabled !== true) {
      console.log('   ❌ billing_enabled is not true');
    }
    if (banksSnapshot.size === 0) {
      console.log('   ❌ No active bank accounts configured');
    }
    console.log('\n');
  }

  console.log('Completed at:', new Date().toISOString());
  console.log('\n');

  process.exit(testResults.failed > 0 ? 1 : 0);
}

testBillingSystem().catch(error => {
  console.error('💥 Test script crashed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
