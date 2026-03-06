#!/usr/bin/env node

/**
 * Quick fix: Enable billing directly in Firestore
 * Run: node scripts/fix-billing.js
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

console.log(`${colors.cyan}\n🔧 Quick Fix: Enabling Billing System...${colors.reset}\n`);

try {
  // Load service account
  const serviceAccountPath = join(process.cwd(), 'serviceAccountKey.json');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  
  // Initialize Firebase
  const app = initializeApp({
    credential: serviceAccount.credential,
    projectId: serviceAccount.project_id,
  });
  
  const db = getFirestore(app);
  
  // Check current status
  console.log('Checking current status...');
  const settingsRef = db.collection('payment_settings').doc('config');
  const settingsDoc = await settingsRef.get();
  
  if (settingsDoc.exists) {
    const current = settingsDoc.data();
    console.log(`${colors.yellow}   Current billing_enabled: ${current.billing_enabled}${colors.reset}`);
  } else {
    console.log(`${colors.yellow}   Document doesn't exist, will create...${colors.reset}`);
  }
  
  // Enable billing
  console.log('\nEnabling billing system...');
  const updateData = {
    billing_enabled: true,
    currency: 'IDR',
    min_amount: 10000,
    max_amount: 1000000,
    auto_approve: false,
    updated_at: new Date().toISOString(),
    updated_by: 'fix_billing_script',
  };
  
  if (!settingsDoc.exists) {
    updateData.created_at = new Date().toISOString();
    await settingsRef.set(updateData);
    console.log(`${colors.green}   ✅ Created document with billing_enabled: true${colors.reset}`);
  } else {
    await settingsRef.update(updateData);
    console.log(`${colors.green}   ✅ Updated billing_enabled to: true${colors.reset}`);
  }
  
  // Verify
  const verifyDoc = await settingsRef.get();
  const verifyData = verifyDoc.data();
  
  console.log(`\n${colors.green}✅ Billing System Enabled!${colors.reset}`);
  console.log(`\n${colors.cyan}Verified:${colors.reset}`);
  console.log(`   billing_enabled: ${verifyData.billing_enabled ? '✅ TRUE' : '❌ FALSE'}`);
  console.log(`   currency: ${verifyData.currency}`);
  console.log(`   updated_at: ${verifyData.updated_at}`);
  
  // Check bank accounts
  console.log(`\n${colors.cyan}Bank Accounts:${colors.reset}`);
  const banksRef = db.collection('bank_accounts');
  const banksSnapshot = await banksRef.get();
  const activeBanks = await banksRef.where('active', '==', true).get();
  
  if (activeBanks.size === 0) {
    console.log(`${colors.yellow}   ⚠️  No active bank accounts!${colors.reset}`);
    console.log(`${colors.yellow}   Add via: Admin Dashboard → Payment Settings → Bank Accounts${colors.reset}`);
  } else {
    console.log(`${colors.green}   ✅ ${activeBanks.size} active bank account(s)${colors.reset}`);
  }
  
  console.log(`\n${colors.cyan}Next Steps:${colors.reset}`);
  console.log(`   1. Restart backend: npm restart`);
  console.log(`   2. Clear frontend cache: cd ../frontend && rm -rf .next && npm run dev`);
  console.log(`   3. Test payment page (login as user)\n`);
  
} catch (error) {
  console.error(`${colors.red}\n❌ Error: ${error.message}${colors.reset}\n`);
  console.error(`${colors.yellow}Make sure:${colors.reset}`);
  console.error(`   1. serviceAccountKey.json exists in backend/`);
  console.error(`   2. You have Firebase Admin access\n`);
  process.exit(1);
}
