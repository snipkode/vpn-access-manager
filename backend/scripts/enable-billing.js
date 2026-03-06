#!/usr/bin/env node

/**
 * Script to enable Billing System
 * This will create/update payment_settings document in Firestore
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read service account key
const serviceAccountPath = join(__dirname, '..', 'serviceAccountKey.json');

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
} catch (error) {
  console.error('❌ Error: serviceAccountKey.json not found or invalid');
  console.error('Please download the service account key from Firebase Console');
  console.error('and save it as backend/serviceAccountKey.json\n');
  process.exit(1);
}

// Initialize Firebase Admin
const app = initializeApp({
  credential: serviceAccount.credential,
  projectId: serviceAccount.project_id,
});

const db = getFirestore(app);

async function enableBilling() {
  try {
    console.log('🔧 Enabling Billing System...\n');

    const settingsRef = db.collection('payment_settings').doc('config');
    const settingsDoc = await settingsRef.get();

    const currentSettings = settingsDoc.exists ? settingsDoc.data() : {};

    console.log('📋 Current Settings:');
    console.log(`   Billing Enabled: ${currentSettings.billing_enabled || false}`);
    console.log(`   Currency: ${currentSettings.currency || 'IDR'}`);
    console.log(`   Min Amount: ${currentSettings.min_amount || 10000}`);
    console.log(`   Max Amount: ${currentSettings.max_amount || 1000000}\n`);

    // Update settings
    const newSettings = {
      billing_enabled: true,
      currency: 'IDR',
      min_amount: 10000,
      max_amount: 1000000,
      auto_approve: false,
      notification_email: null,
      updated_at: new Date().toISOString(),
      updated_by: 'system_script',
    };

    if (!settingsDoc.exists) {
      newSettings.created_at = new Date().toISOString();
      await settingsRef.set(newSettings);
      console.log('✅ Created new payment_settings document\n');
    } else {
      await settingsRef.update(newSettings);
      console.log('✅ Updated existing payment_settings document\n');
    }

    // Verify update
    const updatedDoc = await settingsRef.get();
    const updatedSettings = updatedDoc.data();

    console.log('📋 Updated Settings:');
    console.log(`   Billing Enabled: ${updatedSettings.billing_enabled} ✅`);
    console.log(`   Currency: ${updatedSettings.currency}`);
    console.log(`   Min Amount: Rp ${updatedSettings.min_amount.toLocaleString('id-ID')}`);
    console.log(`   Max Amount: Rp ${updatedSettings.max_amount.toLocaleString('id-ID')}`);
    console.log(`   Auto Approve: ${updatedSettings.auto_approve}`);
    console.log(`   Updated At: ${updatedSettings.updated_at}\n`);

    // Check bank accounts
    console.log('🏦 Checking Bank Accounts...');
    const banksSnapshot = await db.collection('bank_accounts').get();
    
    if (banksSnapshot.empty) {
      console.log('   ⚠️  No bank accounts found. Please add at least one bank account.\n');
      console.log('   You can add bank accounts from Admin Dashboard → Payment Settings\n');
    } else {
      console.log(`   ✅ Found ${banksSnapshot.size} bank account(s)\n`);
      
      const activeBanks = await db.collection('bank_accounts')
        .where('active', '==', true)
        .get();
      
      console.log(`   ✅ ${activeBanks.size} active bank account(s) ready for payments\n`);
    }

    console.log('✅ Billing System Enabled Successfully!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Add at least one bank account (if not already done)');
    console.log('   2. Test payment submission from user dashboard');
    console.log('   3. Approve/reject payments from admin dashboard\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error enabling billing system:');
    console.error(error.message);
    console.error('\nPlease check:');
    console.error('   - Firebase Admin SDK is properly configured');
    console.error('   - Service account key is valid');
    console.error('   - You have admin privileges\n');
    process.exit(1);
  }
}

enableBilling();
