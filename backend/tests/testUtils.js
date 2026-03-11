/**
 * Test Utilities for Monitoring Tests
 * Helper functions for simulating access logs and suspicious activity
 */

import { db } from '../config/firebase.js';

const ACCESS_LOGS_COLLECTION = 'access_logs';
const FIREWALL_RULES_COLLECTION = 'firewall_rules';

/**
 * Create test access log entries
 * @param {Array} logs - Array of log objects
 * @returns {Promise<boolean>}
 */
export async function createAccessLogs(logs) {
  try {
    const batch = db.batch();
    logs.forEach(log => {
      const docRef = db.collection(ACCESS_LOGS_COLLECTION).doc();
      batch.set(docRef, {
        timestamp: log.timestamp || new Date().toISOString(),
        action: log.action || 'login_attempt',
        source_ip: log.source_ip || '127.0.0.1',
        user_id: log.user_id || null,
        status: log.status || 'success',
        user_agent: log.user_agent || 'TestAgent/1.0',
        endpoint: log.endpoint || '/api/test',
        reason: log.reason || null,
        port: log.port || null,
        metadata: log.metadata || {}
      });
    });
    
    await batch.commit();
    console.log(`✅ Created ${logs.length} access logs`);
    return true;
  } catch (error) {
    console.error('❌ Error creating access logs:', error.message);
    return false;
  }
}

/**
 * Create simulated normal traffic
 * @returns {Promise<boolean>}
 */
export async function createNormalTraffic() {
  const normalLogs = [
    {
      action: 'login_attempt',
      source_ip: '192.168.1.100',
      user_id: 'user1@example.com',
      status: 'success',
      endpoint: '/api/auth/login'
    },
    {
      action: 'login_attempt',
      source_ip: '192.168.1.101',
      user_id: 'user2@example.com',
      status: 'success',
      endpoint: '/api/auth/login'
    },
    {
      action: 'vpn_connect',
      source_ip: '192.168.1.100',
      user_id: 'user1@example.com',
      status: 'success',
      endpoint: '/api/vpn/connect',
      device_id: 'device_001'
    },
    {
      action: 'api_access',
      source_ip: '192.168.1.102',
      user_id: 'user3@example.com',
      status: 'success',
      endpoint: '/api/billing/status'
    },
    {
      action: 'login_attempt',
      source_ip: '192.168.1.103',
      user_id: 'user4@example.com',
      status: 'failed',
      endpoint: '/api/auth/login',
      reason: 'Invalid credentials'
    }
  ];

  return createAccessLogs(normalLogs);
}

/**
 * Create simulated brute force attack
 * @param {string} attackerIP - IP address of attacker
 * @param {number} attempts - Number of attempts (default: 10)
 * @returns {Promise<boolean>}
 */
export async function createBruteForceAttack(attackerIP = '198.51.100.99', attempts = 10) {
  const attackLogs = [];
  
  for (let i = 0; i < attempts; i++) {
    attackLogs.push({
      action: 'blocked',
      source_ip: attackerIP,
      status: 'blocked',
      user_agent: 'python-requests/2.28.0',
      endpoint: '/api/auth/login',
      reason: 'Rate limit exceeded',
      port: 443,
      metadata: {
        attempt_number: i + 1,
        attack_type: 'brute_force'
      }
    });
  }

  return createAccessLogs(attackLogs);
}

/**
 * Create simulated port scan activity
 * @param {string} scannerIP - IP address of scanner
 * @param {Array} ports - Ports to simulate scanning
 * @returns {Promise<boolean>}
 */
export async function createPortScanActivity(scannerIP = '203.0.113.50', ports = [22, 80, 443, 8080, 3306]) {
  const scanLogs = ports.map(port => ({
    action: 'blocked',
    source_ip: scannerIP,
    status: 'blocked',
    user_agent: 'nmap/7.92',
    endpoint: '/api/vpn/connect',
    reason: 'Port access denied',
    port: port,
    metadata: {
      scan_type: 'port_scan'
    }
  }));

  return createAccessLogs(scanLogs);
}

/**
 * Create simulated DDoS pattern
 * @param {string} attackerIP - IP address of attacker
 * @param {number} requests - Number of requests (default: 50)
 * @returns {Promise<boolean>}
 */
export async function createDDoSPattern(attackerIP = '198.51.100.100', requests = 50) {
  const ddosLogs = [];
  
  for (let i = 0; i < requests; i++) {
    ddosLogs.push({
      action: 'api_access',
      source_ip: attackerIP,
      status: 'success',
      user_agent: 'DDoS-Bot/1.0',
      endpoint: '/api/vpn/status',
      metadata: {
        request_type: 'flood'
      }
    });
  }

  return createAccessLogs(ddosLogs);
}

/**
 * Create test firewall rules
 * @param {Array} rules - Array of rule objects
 * @returns {Promise<boolean>}
 */
export async function createFirewallRules(rules) {
  try {
    const batch = db.batch();
    rules.forEach(rule => {
      const docRef = db.collection(FIREWALL_RULES_COLLECTION).doc();
      batch.set(docRef, {
        name: rule.name || 'Test Rule',
        description: rule.description || 'Test firewall rule',
        enabled: rule.enabled !== undefined ? rule.enabled : true,
        action: rule.action || 'allow',
        protocol: rule.protocol || 'tcp',
        port: rule.port || 443,
        ip_range: rule.ip_range || '0.0.0.0/0',
        ip_type: rule.ip_type || 'ipv4',
        priority: rule.priority || 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    });
    
    await batch.commit();
    console.log(`✅ Created ${rules.length} firewall rules`);
    return true;
  } catch (error) {
    console.error('❌ Error creating firewall rules:', error.message);
    return false;
  }
}

/**
 * Clean up test data
 * @param {string} collection - Collection to clean
 * @param {Function} filterFn - Optional filter function
 * @returns {Promise<number>} Number of documents deleted
 */
export async function cleanupTestData(collection, filterFn = null) {
  try {
    const snapshot = await db.collection(collection).get();
    const batch = db.batch();
    let deletedCount = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!filterFn || filterFn(data)) {
        batch.delete(doc.ref);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      await batch.commit();
      console.log(`🗑️ Deleted ${deletedCount} documents from ${collection}`);
    }
    
    return deletedCount;
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error.message);
    return 0;
  }
}

/**
 * Generate random IP address
 * @returns {string}
 */
export function generateRandomIP() {
  return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

/**
 * Generate test traffic with random IPs
 * @param {number} count - Number of log entries
 * @returns {Promise<boolean>}
 */
export async function generateRandomTraffic(count = 20) {
  const actions = ['login_attempt', 'api_access', 'vpn_connect', 'blocked'];
  const statuses = ['success', 'failed', 'blocked'];
  const endpoints = ['/api/auth/login', '/api/vpn/connect', '/api/billing/status', '/api/user/profile'];
  
  const randomLogs = [];
  for (let i = 0; i < count; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    randomLogs.push({
      action: action,
      source_ip: generateRandomIP(),
      user_id: `user${i}@example.com`,
      status: action === 'blocked' ? 'blocked' : statuses[Math.floor(Math.random() * 2)],
      user_agent: 'TestAgent/1.0',
      endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
      reason: action === 'blocked' ? 'Test block' : null
    });
  }

  return createAccessLogs(randomLogs);
}
