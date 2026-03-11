#!/usr/bin/env node
/**
 * Monitoring Test Runner
 * Simulates various scenarios for testing the monitoring WebSocket system
 * 
 * Usage: node tests/test-runner.js [scenario]
 * 
 * Scenarios:
 *   all          - Run all scenarios (default)
 *   normal       - Normal traffic only
 *   brute-force  - Brute force attack simulation
 *   port-scan    - Port scan simulation
 *   ddos         - DDoS pattern simulation
 *   mixed        - Mixed traffic (normal + attacks)
 *   cleanup      - Clean up all test data
 */

import {
  createNormalTraffic,
  createBruteForceAttack,
  createPortScanActivity,
  createDDoSPattern,
  createFirewallRules,
  cleanupTestData,
  generateRandomTraffic
} from './testUtils.js';
import { getRecentAccessAttempts, getSuspiciousActivity } from '../services/accessMonitor.js';
import { getActiveRules } from '../services/firewall.js';

const SCENARIOS = ['all', 'normal', 'brute-force', 'port-scan', 'ddos', 'mixed', 'cleanup'];

/**
 * Print test results
 */
async function printTestResults() {
  console.log('\n📊 Test Results Summary\n');
  console.log('='.repeat(60));
  
  try {
    const attempts = await getRecentAccessAttempts(50);
    const suspicious = await getSuspiciousActivity();
    const rules = await getActiveRules();
    
    console.log(`📋 Total Access Logs: ${attempts.length}`);
    console.log(`🚨 Suspicious Activities: ${suspicious.length}`);
    console.log(`🔥 Active Firewall Rules: ${rules.length}`);
    
    if (suspicious.length > 0) {
      console.log('\n⚠️  Suspicious IPs Detected:');
      suspicious.forEach((activity, i) => {
        console.log(`   ${i + 1}. ${activity.ip} - Blocked: ${activity.blocked} - Risk: ${activity.risk_level}`);
      });
    }
  } catch (error) {
    console.error('❌ Error getting test results:', error.message);
  }
  
  console.log('='.repeat(60));
}

/**
 * Run scenario: Normal Traffic
 */
async function runNormalTraffic() {
  console.log('\n🟢 Scenario: Normal Traffic\n');
  await createNormalTraffic();
  await generateRandomTraffic(10);
}

/**
 * Run scenario: Brute Force Attack
 */
async function runBruteForce() {
  console.log('\n🔴 Scenario: Brute Force Attack\n');
  await createBruteForceAttack('198.51.100.99', 15);
  await createBruteForceAttack('198.51.100.100', 8);
}

/**
 * Run scenario: Port Scan
 */
async function runPortScan() {
  console.log('\n🟡 Scenario: Port Scan Activity\n');
  await createPortScanActivity('203.0.113.50', [22, 80, 443, 8080, 3306, 5432]);
  await createPortScanActivity('203.0.113.51', [21, 23, 25, 110, 143]);
}

/**
 * Run scenario: DDoS Pattern
 */
async function runDDoS() {
  console.log('\n🟣 Scenario: DDoS Pattern\n');
  await createDDoSPattern('198.51.100.200', 50);
}

/**
 * Run scenario: Mixed Traffic
 */
async function runMixed() {
  console.log('\n🔵 Scenario: Mixed Traffic (All scenarios)\n');
  await runNormalTraffic();
  await new Promise(resolve => setTimeout(resolve, 500));
  await runBruteForce();
  await new Promise(resolve => setTimeout(resolve, 500));
  await runPortScan();
  await new Promise(resolve => setTimeout(resolve, 500));
  await runDDoS();
}

/**
 * Clean up test data
 */
async function runCleanup() {
  console.log('\n🗑️  Cleaning up test data...\n');
  
  const accessDeleted = await cleanupTestData('access_logs', (data) => {
    return data.metadata?.attack_type || 
           data.metadata?.scan_type || 
           data.metadata?.request_type ||
           data.user_agent?.includes('TestAgent') ||
           data.user_agent?.includes('python-requests') ||
           data.user_agent?.includes('nmap') ||
           data.user_agent?.includes('DDoS');
  });
  
  const rulesDeleted = await cleanupTestData('firewall_rules', (data) => {
    return data.name?.includes('Test Rule');
  });
  
  console.log(`\n✅ Cleanup complete: ${accessDeleted} logs, ${rulesDeleted} rules deleted`);
}

/**
 * Create test firewall rules
 */
async function createTestRules() {
  console.log('\n📜 Creating test firewall rules...\n');
  await createFirewallRules([
    {
      name: 'Allow HTTPS',
      description: 'Allow HTTPS traffic',
      enabled: true,
      action: 'allow',
      protocol: 'tcp',
      port: 443,
      ip_range: '0.0.0.0/0'
    },
    {
      name: 'Block SSH External',
      description: 'Block external SSH access',
      enabled: true,
      action: 'deny',
      protocol: 'tcp',
      port: 22,
      ip_range: '0.0.0.0/0'
    },
    {
      name: 'Allow Internal API',
      description: 'Allow internal API access',
      enabled: true,
      action: 'allow',
      protocol: 'tcp',
      port: 5000,
      ip_range: '192.168.1.0/24'
    }
  ]);
}

/**
 * Main test runner
 */
async function runTests(scenario = 'all') {
  if (!SCENARIOS.includes(scenario)) {
    console.error(`❌ Unknown scenario: ${scenario}`);
    console.error(`Available scenarios: ${SCENARIOS.join(', ')}`);
    process.exit(1);
  }
  
  console.log('\n🧪 ' + '='.repeat(56));
  console.log('🧪  VPN Monitoring Test Suite');
  console.log('🧪 ' + '='.repeat(56));
  console.log(`\n📌 Running scenario: ${scenario}\n`);
  
  const startTime = Date.now();
  
  try {
    switch (scenario) {
      case 'all':
        await runMixed();
        break;
      case 'normal':
        await runNormalTraffic();
        break;
      case 'brute-force':
        await runBruteForce();
        break;
      case 'port-scan':
        await runPortScan();
        break;
      case 'ddos':
        await runDDoS();
        break;
      case 'mixed':
        await runMixed();
        break;
      case 'cleanup':
        await runCleanup();
        return;
    }
    
    // Create test firewall rules if not cleanup
    if (scenario !== 'cleanup') {
      await createTestRules();
    }
    
    // Wait for Firestore indexing
    console.log('\n⏳ Waiting for Firestore to index (2 seconds)...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Print results
    await printTestResults();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Test completed in ${duration}s\n`);
    
  } catch (error) {
    console.error('\n❌ Test runner error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Parse command line arguments
const scenario = process.argv[2] || 'all';
runTests(scenario).then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
