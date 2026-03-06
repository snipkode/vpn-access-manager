#!/usr/bin/env node

/**
 * Quick diagnostic for billing/payment issues
 * Run: node scripts/check-billing-status.js
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

const __dirname = process.cwd();

// Colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function checkBillingStatus() {
  log(colors.cyan, '\n🔍 Checking Billing System Status...\n');
  log(colors.cyan, '='.repeat(60));
  
  try {
    // Load service account
    const serviceAccountPath = join(__dirname, 'serviceAccountKey.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    
    // Initialize Firebase Admin
    const app = initializeApp({
      credential: serviceAccount.credential,
      projectId: serviceAccount.project_id,
    });
    
    const db = getFirestore(app);
    
    // Check 1: payment_settings document
    log(colors.blue, '\n1. Checking payment_settings/config...\n');
    const settingsRef = db.collection('payment_settings').doc('config');
    const settingsDoc = await settingsRef.get();
    
    if (settingsDoc.exists) {
      const settings = settingsDoc.data();
      log(colors.green, '   ✅ Document exists');
      log(colors.green, `   • billing_enabled: ${settings.billing_enabled ? '✅ TRUE' : '❌ FALSE'}`);
      log(colors.green, `   • currency: ${settings.currency || 'Not set'}`);
      log(colors.green, `   • min_amount: ${settings.min_amount || 'Not set'}`);
      log(colors.green, `   • max_amount: ${settings.max_amount || 'Not set'}`);
      
      if (!settings.billing_enabled) {
        log(colors.red, '\   ⚠️  BILLING IS DISABLED!');
        log(colors.yellow, '\   Run: node scripts/enable-billing.js\n');
      }
    } else {
      log(colors.red, '   ❌ Document NOT FOUND!');
      log(colors.yellow, '   Run: node scripts/enable-billing.js\n');
    }
    
    // Check 2: Bank accounts
    log(colors.blue, '\n2. Checking bank accounts...\n');
    const banksRef = db.collection('bank_accounts');
    const banksSnapshot = await banksRef.get();
    
    if (banksSnapshot.empty) {
      log(colors.red, '   ❌ NO BANK ACCOUNTS FOUND!');
      log(colors.yellow, '   Add via: Admin Dashboard → Payment Settings → Bank Accounts\n');
    } else {
      log(colors.green, `   ✅ Found ${banksSnapshot.size} bank account(s)`);
      
      const activeBanks = await banksRef.where('active', '==', true).get();
      log(colors.green, `   ✅ ${activeBanks.size} active bank account(s)`);
      
      if (activeBanks.size === 0) {
        log(colors.red, '\n   ⚠️  NO ACTIVE BANK ACCOUNTS!');
        log(colors.yellow, '   Enable at least one bank account\n');
      } else {
        log(colors.green, '\n   Active banks:');
        activeBanks.forEach(doc => {
          const bank = doc.data();
          log(colors.green, `     • ${bank.bank} - ${bank.account_number} (${bank.account_name})`);
        });
      }
    }
    
    // Check 3: Test API endpoint
    log(colors.blue, '\n3. Testing /billing/plans endpoint...\n');
    try {
      const API_URL = process.env.API_URL || 'http://localhost:3000/api';
      const plansRes = await fetch(`${API_URL}/billing/plans`);
      
      if (plansRes.ok) {
        const data = await plansRes.json();
        log(colors.green, '   ✅ API endpoint accessible');
        log(colors.green, `   • billing_enabled: ${data.billing_enabled ? '✅ TRUE' : '❌ FALSE'}`);
        log(colors.green, `   • plans: ${data.plans?.length || 0} plan(s)`);
        log(colors.green, `   • bank_accounts: ${data.bank_accounts?.length || 0} bank(s)`);
        
        if (!data.billing_enabled) {
          log(colors.red, '\n   ⚠️  API reports billing as DISABLED');
          log(colors.yellow, '   Check payment_settings document\n');
        }
        
        if (data.bank_accounts?.length === 0) {
          log(colors.yellow, '\n   ⚠️  No bank accounts in API response');
          log(colors.yellow, '   Add bank accounts via admin panel\n');
        }
      } else {
        const error = await plansRes.json();
        log(colors.red, `   ❌ API Error: ${error.error || plansRes.status}`);
        log(colors.red, `   ${error.message || ''}`);
      }
    } catch (error) {
      log(colors.red, `   ❌ Cannot reach API: ${error.message}`);
      log(colors.yellow, '   Make sure backend is running: npm start\n');
    }
    
    // Summary
    log(colors.cyan, '\n' + '='.repeat(60));
    log(colors.cyan, '📊 Summary:\n');
    
    const issues = [];
    
    if (!settingsDoc.exists || !settingsDoc.data().billing_enabled) {
      issues.push('❌ Billing not enabled in Firestore');
    }
    
    if (banksSnapshot.empty || (await banksRef.where('active', '==', true).get()).size === 0) {
      issues.push('❌ No active bank accounts');
    }
    
    if (issues.length === 0) {
      log(colors.green, '✅ All checks passed!');
      log(colors.green, '   Billing system should be working\n');
    } else {
      log(colors.red, '❌ Issues found:\n');
      issues.forEach(issue => log(colors.red, `   ${issue}`));
      
      log(colors.yellow, '\n📝 Fix steps:\n');
      log(colors.yellow, '   1. Enable billing: node scripts/enable-billing.js');
      log(colors.yellow, '   2. Add bank accounts: Admin Dashboard → Payment Settings');
      log(colors.yellow, '   3. Restart backend: npm restart\n');
    }
    
    log(colors.cyan, '='.repeat(60) + '\n');
    
  } catch (error) {
    log(colors.red, `\n❌ Error: ${error.message}\n`);
    log(colors.yellow, 'Make sure:\n');
    log(colors.yellow, '   1. serviceAccountKey.json exists in backend/');
    log(colors.yellow, '   2. Firebase Admin SDK is configured');
    log(colors.yellow, '   3. You have admin access to Firestore\n');
  }
}

checkBillingStatus().catch(console.error);
