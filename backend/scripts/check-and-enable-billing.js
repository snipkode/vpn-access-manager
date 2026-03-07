/**
 * Script: Check and Enable Billing
 * 
 * Check current billing status in payment_settings/config
 * and enable billing if needed
 */

import { db } from '../config/firebase.js';

async function checkAndEnableBilling() {
  console.log('🔍 Checking billing status...\n');

  try {
    // Check payment_settings/config
    console.log('📄 Reading payment_settings/config...');
    const paymentRef = db.collection('payment_settings').doc('config');
    const paymentDoc = await paymentRef.get();
    const paymentData = paymentDoc.exists ? paymentDoc.data() : {};
    
    console.log('\n📊 Current Settings:');
    console.log('   billing_enabled:', paymentData.billing_enabled);
    console.log('   currency:', paymentData.currency || 'not set');
    console.log('   min_topup:', paymentData.min_topup || 'not set');
    console.log('   max_topup:', paymentData.max_topup || 'not set');
    console.log('   auto_renewal_enabled:', paymentData.auto_renewal_enabled);
    console.log('   low_balance_days:', paymentData.low_balance_days);
    
    // Check legacy settings/billing
    console.log('\n📄 Reading settings/billing (legacy)...');
    const legacyRef = db.collection('settings').doc('billing');
    const legacyDoc = await legacyRef.get();
    const legacyData = legacyDoc.exists ? legacyDoc.data() : {};
    
    console.log('\n📊 Legacy Settings:');
    console.log('   billing_enabled:', legacyData.billing_enabled);
    console.log('   currency:', legacyData.currency || 'not set');
    console.log('   min_topup:', legacyData.min_topup || 'not set');
    console.log('   max_topup:', legacyData.max_topup || 'not set');
    console.log('   auto_renewal_enabled:', legacyData.auto_renewal_enabled);
    console.log('   low_balance_days:', legacyData.low_balance_days);

    // Check bank_accounts
    console.log('\n🏦 Checking bank_accounts...');
    const banksSnapshot = await db.collection('bank_accounts')
      .where('active', '==', true)
      .get();
    console.log('   Active bank accounts:', banksSnapshot.size);
    
    if (banksSnapshot.size > 0) {
      console.log('\n   Banks:');
      banksSnapshot.forEach(doc => {
        const bank = doc.data();
        console.log(`      - ${bank.bank} (${bank.account_number})`);
      });
    }

    // Determine if billing should be enabled
    const shouldEnable = !paymentData.billing_enabled;
    
    if (shouldEnable) {
      console.log('\n⚠️  Billing is currently DISABLED');
      console.log('\n💡 To enable billing, run:');
      console.log('   node backend/scripts/enable-billing.js\n');
      
      // Offer to enable now
      console.log('🔄 Enabling billing now...\n');
      
      const updateData = {
        billing_enabled: true,
        currency: paymentData.currency || legacyData.currency || 'IDR',
        min_topup: paymentData.min_topup || legacyData.min_topup || 50000,
        max_topup: paymentData.max_topup || legacyData.max_topup || 1000000,
        auto_renewal_enabled: paymentData.auto_renewal_enabled !== undefined 
          ? paymentData.auto_renewal_enabled 
          : (legacyData.auto_renewal_enabled || true),
        low_balance_days: paymentData.low_balance_days || legacyData.low_balance_days || 5,
        updated_at: new Date().toISOString(),
        updated_by: 'enable-billing-script',
      };
      
      await paymentRef.set(updateData, { merge: true });
      console.log('✅ payment_settings/config updated');
      
      // Also update legacy
      const legacyUpdateData = {
        billing_enabled: true,
        currency: updateData.currency,
        min_topup: updateData.min_topup,
        max_topup: updateData.max_topup,
        auto_renewal_enabled: updateData.auto_renewal_enabled,
        low_balance_days: updateData.low_balance_days,
        updated_at: updateData.updated_at,
        updated_by: updateData.updated_by,
      };
      
      if (!legacyDoc.exists) {
        legacyUpdateData.created_at = updateData.updated_at;
      }
      
      await legacyRef.set(legacyUpdateData, { merge: true });
      console.log('✅ settings/billing updated (legacy)');
      
      // Verify
      console.log('\n🔍 Verifying update...');
      const verifyDoc = await paymentRef.get();
      const verifyData = verifyDoc.exists ? verifyDoc.data() : {};
      
      console.log('\n✅ New Status:');
      console.log('   billing_enabled:', verifyData.billing_enabled);
      console.log('   currency:', verifyData.currency);
      console.log('   min_topup:', verifyData.min_topup);
      console.log('   max_topup:', verifyData.max_topup);
      
      if (banksSnapshot.size === 0) {
        console.log('\n⚠️  WARNING: No active bank accounts configured!');
        console.log('   Users will see "No bank accounts" message.');
        console.log('   Add bank accounts via Admin Settings > Bank Accounts');
      } else {
        console.log('\n✅ Billing is now ENABLED!');
        console.log('   Users can now submit payments.');
      }
    } else {
      console.log('\n✅ Billing is already ENABLED');
      
      if (banksSnapshot.size === 0) {
        console.log('\n⚠️  WARNING: Billing enabled but no bank accounts configured!');
        console.log('   Add bank accounts via Admin Settings > Bank Accounts');
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

checkAndEnableBilling();
