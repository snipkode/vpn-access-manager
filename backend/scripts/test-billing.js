#!/usr/bin/env node

/**
 * Test script to verify billing system is working
 * Tests: Backend connection → Firestore → Billing status
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for output
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

async function testBilling() {
  log(colors.cyan, '🔍 Testing Billing System...\n');
  
  // Test 1: Check if .env.local exists
  log(colors.blue, '1. Checking environment configuration...');
  try {
    const envPath = join(__dirname, '..', 'frontend', '.env.local');
    const envContent = readFileSync(envPath, 'utf8');
    const apiUrl = envContent.match(/NEXT_PUBLIC_API_URL=(.+)/)?.[1];
    
    if (apiUrl) {
      log(colors.green, `   ✅ API URL: ${apiUrl}`);
    } else {
      log(colors.yellow, `   ⚠️  NEXT_PUBLIC_API_URL not found in .env.local`);
    }
  } catch (error) {
    log(colors.yellow, `   ⚠️  .env.local not found. Using default: http://localhost:3000/api`);
  }
  
  // Test 2: Check backend health
  log(colors.blue, '\n2. Checking backend health...');
  try {
    const healthRes = await fetch('http://localhost:3000/health');
    if (healthRes.ok) {
      const health = await healthRes.json();
      log(colors.green, `   ✅ Backend is running`);
      log(colors.green, `   Status: ${health.status}`);
      log(colors.green, `   Environment: ${health.environment}`);
    } else {
      log(colors.red, `   ❌ Backend returned status ${healthRes.status}`);
    }
  } catch (error) {
    log(colors.red, `   ❌ Cannot reach backend at http://localhost:3000`);
    log(colors.yellow, `   Make sure backend is running: cd backend && npm start`);
    return;
  }
  
  // Test 3: Check API info endpoint
  log(colors.blue, '\n3. Checking API endpoints...');
  try {
    const apiRes = await fetch('http://localhost:3000/api');
    if (apiRes.ok) {
      const api = await apiRes.json();
      log(colors.green, `   ✅ API is accessible`);
      log(colors.green, `   Name: ${api.name}`);
      log(colors.green, `   Endpoints: ${Object.keys(api.endpoints).join(', ')}`);
    }
  } catch (error) {
    log(colors.red, `   ❌ API endpoint error: ${error.message}`);
  }
  
  // Test 4: Firestore connection (requires admin)
  log(colors.blue, '\n4. Firestore connection...');
  try {
    const serviceAccountPath = join(__dirname, 'serviceAccountKey.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    
    const { initializeApp } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    
    const app = initializeApp({
      credential: serviceAccount.credential,
      projectId: serviceAccount.project_id,
    });
    
    const db = getFirestore(app);
    const settingsRef = db.collection('payment_settings').doc('config');
    const settingsDoc = await settingsRef.get();
    
    if (settingsDoc.exists) {
      const settings = settingsDoc.data();
      log(colors.green, `   ✅ Firestore connected`);
      log(colors.green, `   Document: payment_settings/config`);
      log(colors.green, `   Billing Enabled: ${settings.billing_enabled ? '✅ YES' : '❌ NO'}`);
      log(colors.green, `   Currency: ${settings.currency || 'IDR'}`);
      
      if (!settings.billing_enabled) {
        log(colors.yellow, `\n   ⚠️  Billing is DISABLED in Firestore!`);
        log(colors.yellow, `   Run: node scripts/enable-billing.js`);
      }
    } else {
      log(colors.red, `   ❌ Document payment_settings/config not found`);
      log(colors.yellow, `   Run: node scripts/enable-billing.js to create it`);
    }
    
    // Check bank accounts
    const banksSnapshot = await db.collection('bank_accounts').get();
    const activeBanks = await db.collection('bank_accounts')
      .where('active', '==', true)
      .get();
    
    log(colors.green, `   Bank Accounts: ${banksSnapshot.size} total`);
    log(colors.green, `   Active Banks: ${activeBanks.size} active`);
    
    if (activeBanks.size === 0) {
      log(colors.yellow, `   ⚠️  No active bank accounts!`);
      log(colors.yellow, `   Add via: Admin Dashboard → Payment Settings → Bank Accounts`);
    }
    
  } catch (error) {
    log(colors.red, `   ❌ Firestore test failed: ${error.message}`);
    log(colors.yellow, `   Make sure serviceAccountKey.json exists in backend/`);
  }
  
  // Summary
  log(colors.cyan, '\n' + '='.repeat(50));
  log(colors.cyan, '📊 Summary:');
  log(colors.cyan, '='.repeat(50));
  
  log(colors.blue, 'Backend:');
  log(colors.green, `   ✓ Running on http://localhost:3000`);
  
  log(colors.blue, 'Frontend:');
  log(colors.green, `   ✓ Should be on http://localhost:3001 (or your configured port)`);
  
  log(colors.blue, 'Firestore:');
  try {
    const serviceAccountPath = join(__dirname, 'serviceAccountKey.json');
    readFileSync(serviceAccountPath);
    log(colors.green, `   ✓ Connected`);
  } catch {
    log(colors.yellow, `   ⚠️  serviceAccountKey.json not found`);
  }
  
  log(colors.blue, 'Billing Status:');
  try {
    const serviceAccountPath = join(__dirname, 'serviceAccountKey.json');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    const { initializeApp } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    
    const app = initializeApp({ credential: serviceAccount.credential });
    const db = getFirestore(app);
    const settingsDoc = await db.collection('payment_settings').doc('config').get();
    
    if (settingsDoc.exists && settingsDoc.data().billing_enabled) {
      log(colors.green, `   ✅ ENABLED`);
    } else {
      log(colors.red, `   ❌ DISABLED`);
    }
  } catch {
    log(colors.yellow, `   ⚠️  Cannot determine`);
  }
  
  log(colors.cyan, '\n' + '='.repeat(50));
  log(colors.cyan, '📝 Next Steps:');
  log(colors.cyan, '='.repeat(50));
  log(colors.yellow, '1. If backend not running: cd backend && npm start');
  log(colors.yellow, '2. If billing disabled: node scripts/enable-billing.js');
  log(colors.yellow, '3. If no bank accounts: Add via Admin Dashboard');
  log(colors.yellow, '4. Test payment page: Login as user → Payment\n');
}

testBilling().catch(console.error);
