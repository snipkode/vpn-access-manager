#!/usr/bin/env node

/**
 * Test Billing API Endpoints
 * Run: node scripts/test-billing-api.js
 */

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function testBillingAPI() {
  log(colors.cyan, '\n🧪 Testing Billing API Endpoints...\n');
  log(colors.cyan, '='.repeat(60));
  log(colors.gray, `API URL: ${API_URL}\n`);
  
  // Test 1: Health check
  log(colors.blue, '1. Testing /health endpoint...\n');
  try {
    const healthRes = await fetch(`${API_URL}/../health`);
    if (healthRes.ok) {
      const health = await healthRes.json();
      log(colors.green, '   ✅ Backend is running');
      log(colors.green, `   Status: ${health.status}`);
      log(colors.green, `   Environment: ${health.environment || 'development'}`);
    } else {
      log(colors.red, `   ❌ Health check failed: ${healthRes.status}`);
    }
  } catch (error) {
    log(colors.red, `   ❌ Cannot reach backend: ${error.message}`);
    log(colors.yellow, '   Make sure backend is running: npm start\n');
    return;
  }
  
  // Test 2: Public /billing/plans endpoint (no auth)
  log(colors.blue, '\n2. Testing GET /api/billing/plans (no auth)...\n');
  try {
    const plansRes = await fetch(`${API_URL}/billing/plans`);
    log(colors.gray, `   Status: ${plansRes.status} ${plansRes.statusText}`);
    
    const data = await plansRes.json();
    
    if (plansRes.ok) {
      log(colors.green, '   ✅ Request successful');
      log(colors.green, `   billing_enabled: ${data.billing_enabled ? '✅ TRUE' : '❌ FALSE'}`);
      log(colors.green, `   currency: ${data.currency || 'Not set'}`);
      log(colors.green, `   plans: ${data.plans?.length || 0} plan(s)`);
      log(colors.green, `   bank_accounts: ${data.bank_accounts?.length || 0} bank(s)`);
      
      if (!data.billing_enabled) {
        log(colors.red, '\n   ⚠️  BILLING IS DISABLED IN API!');
        log(colors.yellow, '   Run: node scripts/fix-billing.js\n');
      }
      
      if (data.bank_accounts?.length === 0) {
        log(colors.yellow, '\n   ⚠️  NO BANK ACCOUNTS!');
        log(colors.yellow, '   Add via: Admin Dashboard → Payment Settings → Bank Accounts\n');
      }
    } else {
      log(colors.red, `   ❌ API Error: ${data.error || 'Unknown error'}`);
      log(colors.red, `   ${data.message || ''}`);
    }
  } catch (error) {
    log(colors.red, `   ❌ Request failed: ${error.message}`);
  }
  
  // Test 3: API info
  log(colors.blue, '\n3. Testing GET /api (info)...\n');
  try {
    const infoRes = await fetch(`${API_URL}/`);
    if (infoRes.ok) {
      const info = await infoRes.json();
      log(colors.green, '   ✅ API info accessible');
      log(colors.green, `   Name: ${info.name}`);
      log(colors.green, `   Endpoints: ${Object.keys(info.endpoints || {}).join(', ')}`);
    }
  } catch (error) {
    log(colors.red, `   ❌ Failed: ${error.message}`);
  }
  
  // Test 4: Payment settings status (public)
  log(colors.blue, '\n4. Testing GET /api/payment-settings/status...\n');
  try {
    const statusRes = await fetch(`${API_URL}/payment-settings/status`);
    log(colors.gray, `   Status: ${statusRes.status} ${statusRes.statusText}`);
    
    const statusData = await statusRes.json();
    
    if (statusRes.ok) {
      log(colors.green, '   ✅ Request successful');
      log(colors.green, `   billing_enabled: ${statusData.billing_enabled ? '✅ TRUE' : '❌ FALSE'}`);
      log(colors.green, `   currency: ${statusData.currency || 'Not set'}`);
      log(colors.green, `   maintenance_mode: ${statusData.maintenance_mode ? 'YES' : 'NO'}`);
      
      if (!statusData.billing_enabled) {
        log(colors.red, '\n   ⚠️  Payment settings shows billing as DISABLED!');
      }
    } else {
      log(colors.red, `   ❌ API Error: ${statusData.error || 'Unknown'}`);
    }
  } catch (error) {
    log(colors.red, `   ❌ Request failed: ${error.message}`);
  }
  
  // Summary
  log(colors.cyan, '\n' + '='.repeat(60));
  log(colors.cyan, '📊 Summary:\n');
  
  try {
    const plansRes = await fetch(`${API_URL}/billing/plans`);
    const plansData = await plansRes.json();
    
    const statusRes = await fetch(`${API_URL}/payment-settings/status`);
    const statusData = await statusRes.json();
    
    const allEnabled = plansData.billing_enabled && statusData.billing_enabled;
    
    if (allEnabled) {
      log(colors.green, '✅ Billing is ENABLED in API!');
      log(colors.green, '   Payment system should be working\n');
    } else {
      log(colors.red, '❌ Billing is DISABLED in API!');
      log(colors.red, `   /billing/plans: ${plansData.billing_enabled ? '✅' : '❌'}`);
      log(colors.red, `   /payment-settings/status: ${statusData.billing_enabled ? '✅' : '❌'}\n`);
      
      log(colors.yellow, '📝 Fix:\n');
      log(colors.yellow, '   1. Run: node scripts/fix-billing.js');
      log(colors.yellow, '   2. Restart backend: npm restart');
      log(colors.yellow, '   3. Test again\n');
    }
  } catch (error) {
    log(colors.red, `   Cannot get summary: ${error.message}`);
  }
  
  log(colors.cyan, '='.repeat(60) + '\n');
}

testBillingAPI().catch(console.error);
