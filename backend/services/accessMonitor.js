import { execSync } from 'child_process';
import { db } from '../config/firebase.js';

/**
 * Access Attempt Monitoring Service
 * Monitors and logs connection attempts to firewall-protected ports
 */

const ACCESS_LOGS_COLLECTION = 'access_logs';
const MAX_LOGS = 10000; // Keep last 10000 logs

/**
 * Execute shell command safely
 * @param {string} command - Command to execute
 * @returns {string} Command output
 */
function executeCommand(command) {
  try {
    const output = execSync(command, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
      encoding: 'utf-8'
    });
    return output.trim();
  } catch (error) {
    return error.stdout?.trim() || '';
  }
}

/**
 * Parse iptables log for access attempts
 * Requires iptables LOG rules to be configured
 * @returns {Array} Array of access attempts
 */
export function parseAccessLogs() {
  try {
    // Try to read from syslog or kern.log
    let logOutput = '';
    
    try {
      logOutput = executeCommand('grep "FIREWALL" /var/log/syslog 2>/dev/null | tail -100');
    } catch (e) {
      try {
        logOutput = executeCommand('dmesg | grep "FIREWALL" 2>/dev/null | tail -100');
      } catch (e2) {
        console.log('No firewall logs found');
        return [];
      }
    }
    
    if (!logOutput) return [];
    
    const attempts = [];
    const lines = logOutput.split('\n');
    
    for (const line of lines) {
      // Parse log line
      // Example: Jan 15 10:30:45 server kernel: [FIREWALL] IN=eth0 OUT= MAC=... SRC=192.168.1.100 DST=10.0.0.1 ... DPT=3000
      const srcMatch = line.match(/SRC=(\d+\.\d+\.\d+\.\d+)/);
      const dstMatch = line.match(/DST=(\d+\.\d+\.\d+\.\d+)/);
      const dptMatch = line.match(/DPT=(\d+)/);
      const protoMatch = line.match(/PROTO=(\w+)/);
      const timestampMatch = line.match(/^(\w+\s+\d+\s+[\d:]+)/);
      
      if (srcMatch && dptMatch) {
        attempts.push({
          source_ip: srcMatch[1],
          destination_ip: dstMatch ? dstMatch[1] : null,
          port: parseInt(dptMatch[1], 10),
          protocol: protoMatch ? protoMatch[1] : 'unknown',
          timestamp: timestampMatch ? timestampMatch[1] : new Date().toISOString(),
          action: line.includes('DROP') ? 'blocked' : line.includes('ACCEPT') ? 'allowed' : 'unknown',
          raw_log: line
        });
      }
    }
    
    return attempts.reverse(); // Most recent last
  } catch (error) {
    console.error('Error parsing access logs:', error.message);
    return [];
  }
}

/**
 * Get recent access attempts from database
 * @param {number} limit - Number of records to return
 * @param {string} filter - Filter by action (blocked/allowed)
 * @returns {Promise<Array>} Access attempts
 */
export async function getRecentAccessAttempts(limit = 100, filter = null) {
  try {
    let query = db.collection(ACCESS_LOGS_COLLECTION)
      .orderBy('timestamp', 'desc')
      .limit(limit);
    
    const snapshot = await query.get();
    
    let attempts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    if (filter) {
      attempts = attempts.filter(a => a.action === filter);
    }
    
    return attempts;
  } catch (error) {
    console.error('Error getting access attempts:', error.message);
    return [];
  }
}

/**
 * Log access attempt to database
 * @param {Object} attempt - Access attempt data
 */
export async function logAccessAttempt(attempt) {
  try {
    const { source_ip, destination_ip, port, protocol, action, rule_id } = attempt;
    
    await db.collection(ACCESS_LOGS_COLLECTION).add({
      source_ip,
      destination_ip: destination_ip || null,
      port,
      protocol: protocol || 'tcp',
      action, // 'blocked' | 'allowed'
      rule_id: rule_id || null,
      timestamp: new Date().toISOString(),
      country: null, // Can be populated with geo-ip lookup
      user_agent: null
    });
    
    // Cleanup old logs
    cleanupOldLogs();
  } catch (error) {
    console.error('Error logging access attempt:', error.message);
  }
}

/**
 * Get access statistics
 * @returns {Promise<Object>} Access statistics
 */
export async function getAccessStats() {
  try {
    const recentAttempts = await getRecentAccessAttempts(1000);
    
    const stats = {
      total: recentAttempts.length,
      blocked: 0,
      allowed: 0,
      by_port: {},
      by_source_ip: {},
      top_blocked_ips: [],
      top_targeted_ports: []
    };
    
    // Calculate statistics
    recentAttempts.forEach(attempt => {
      if (attempt.action === 'blocked') {
        stats.blocked++;
      } else if (attempt.action === 'allowed') {
        stats.allowed++;
      }
      
      // Count by port
      if (!stats.by_port[attempt.port]) {
        stats.by_port[attempt.port] = { total: 0, blocked: 0, allowed: 0 };
      }
      stats.by_port[attempt.port].total++;
      stats.by_port[attempt.port][attempt.action]++;
      
      // Count by source IP
      if (!stats.by_source_ip[attempt.source_ip]) {
        stats.by_source_ip[attempt.source_ip] = { total: 0, blocked: 0, allowed: 0 };
      }
      stats.by_source_ip[attempt.source_ip].total++;
      stats.by_source_ip[attempt.source_ip][attempt.action]++;
    });
    
    // Get top blocked IPs
    stats.top_blocked_ips = Object.entries(stats.by_source_ip)
      .filter(([_, data]) => data.blocked > 0)
      .sort((a, b) => b[1].blocked - a[1].blocked)
      .slice(0, 10)
      .map(([ip, data]) => ({ ip, ...data }));
    
    // Get top targeted ports
    stats.top_targeted_ports = Object.entries(stats.by_port)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([port, data]) => ({ port: parseInt(port), ...data }));
    
    return stats;
  } catch (error) {
    console.error('Error getting access stats:', error.message);
    return {
      total: 0,
      blocked: 0,
      allowed: 0,
      by_port: {},
      by_source_ip: {},
      top_blocked_ips: [],
      top_targeted_ports: []
    };
  }
}

/**
 * Get suspicious activity report
 * @returns {Promise<Array>} Suspicious IPs
 */
export async function getSuspiciousActivity() {
  try {
    const recentAttempts = await getRecentAccessAttempts(1000);
    
    const ipAttempts = {};
    
    recentAttempts.forEach(attempt => {
      if (!ipAttempts[attempt.source_ip]) {
        ipAttempts[attempt.source_ip] = {
          ip: attempt.source_ip,
          total: 0,
          blocked: 0,
          ports_targeted: new Set(),
          first_seen: attempt.timestamp,
          last_seen: attempt.timestamp
        };
      }
      
      ipAttempts[attempt.source_ip].total++;
      if (attempt.action === 'blocked') {
        ipAttempts[attempt.source_ip].blocked++;
      }
      ipAttempts[attempt.source_ip].ports_targeted.add(attempt.port);
      ipAttempts[attempt.source_ip].last_seen = attempt.timestamp;
    });
    
    // Filter suspicious IPs (more than 5 blocked attempts or targeting multiple ports)
    const suspicious = Object.values(ipAttempts)
      .filter(data => data.blocked >= 5 || data.ports_targeted.size >= 3)
      .map(data => ({
        ...data,
        ports_targeted: Array.from(data.ports_targeted),
        risk_level: data.blocked >= 20 ? 'critical' : data.blocked >= 10 ? 'high' : 'medium'
      }))
      .sort((a, b) => b.blocked - a.blocked);
    
    return suspicious;
  } catch (error) {
    console.error('Error getting suspicious activity:', error.message);
    return [];
  }
}

/**
 * Block IP address using iptables
 * @param {string} ipAddress - IP to block
 * @param {string} reason - Reason for blocking
 * @returns {boolean} Success status
 */
export async function blockIPAddress(ipAddress, reason = 'Suspicious activity') {
  try {
    const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';
    const customChain = 'VPN_FIREWALL';
    
    // Add DROP rule at the beginning of the chain
    executeCommand(`iptables -I ${customChain} 1 -s ${ipAddress} -j DROP`);
    
    // Log to database
    await db.collection('blocked_ips').add({
      ip_address: ipAddress,
      reason,
      blocked_at: new Date().toISOString(),
      blocked_by: 'admin',
      auto_blocked: false
    });
    
    console.log(`Blocked IP: ${ipAddress} - ${reason}`);
    return true;
  } catch (error) {
    console.error('Error blocking IP:', error.message);
    return false;
  }
}

/**
 * Unblock IP address
 * @param {string} ipAddress - IP to unblock
 * @returns {boolean} Success status
 */
export async function unblockIPAddress(ipAddress) {
  try {
    const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';
    const customChain = 'VPN_FIREWALL';
    
    // Remove DROP rule
    executeCommand(`iptables -D ${customChain} -s ${ipAddress} -j DROP 2>/dev/null || true`);
    
    // Update database
    const snapshot = await db.collection('blocked_ips')
      .where('ip_address', '==', ipAddress)
      .where('auto_blocked', '==', false)
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        unblocked_at: new Date().toISOString(),
        status: 'unblocked'
      });
    });
    await batch.commit();
    
    console.log(`Unblocked IP: ${ipAddress}`);
    return true;
  } catch (error) {
    console.error('Error unblocking IP:', error.message);
    return false;
  }
}

/**
 * Get blocked IPs list
 * @returns {Promise<Array>} Blocked IPs
 */
export async function getBlockedIPs() {
  try {
    const snapshot = await db.collection('blocked_ips')
      .orderBy('blocked_at', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting blocked IPs:', error.message);
    return [];
  }
}

/**
 * Cleanup old logs (keep only last MAX_LOGS)
 */
async function cleanupOldLogs() {
  try {
    const snapshot = await db.collection(ACCESS_LOGS_COLLECTION)
      .orderBy('timestamp', 'desc')
      .offset(MAX_LOGS)
      .get();
    
    if (snapshot.empty) return;
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error('Error cleaning up old logs:', error.message);
  }
}

/**
 * Enable iptables logging for firewall rules
 * This should be called once during setup
 */
export function enableFirewallLogging() {
  try {
    const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';
    const customChain = 'VPN_FIREWALL';
    
    // Add logging rule before ACCEPT/DROP rules
    executeCommand(`iptables -I ${customChain} -j LOG --log-prefix "[FIREWALL] " --log-level 4 2>/dev/null || true`);
    
    console.log('Firewall logging enabled');
  } catch (error) {
    console.error('Error enabling firewall logging:', error.message);
  }
}
