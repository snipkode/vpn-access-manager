import { execSync } from 'child_process';
import { db } from '../config/firebase.js';

/**
 * Firewall Management Service
 * Manages iptables rules for port and IP range access control
 * Supports both IP ranges and individual IP selections
 */

const FIREWALL_COLLECTION = 'firewall_rules';

/**
 * Blocked ports that should not be used for firewall rules
 * These are critical system ports
 */
const BLOCKED_PORTS = [
  { port: 51820, reason: 'WireGuard VPN port' },
  { port: 443, reason: 'HTTPS server port' },
  { port: 80, reason: 'HTTP server port' },
  { port: 22, reason: 'SSH port (use with caution)' },
];

/**
 * Check if a port is blocked (dynamic from database)
 * @param {number} port - Port to check
 * @returns {Promise<{blocked: boolean, reason?: string}>}
 */
export async function isPortBlocked(port) {
  try {
    const { isPortBlockedDynamic } = await import('./blockedPortsSettings.js');
    return await isPortBlockedDynamic(port);
  } catch (error) {
    console.error('Error checking blocked port:', error.message);
    // Fallback to hardcoded check if service fails
    const BLOCKED_PORTS = [51820, 443, 80, 22];
    const blocked = BLOCKED_PORTS.includes(port);
    return { blocked };
  }
}

/**
 * Get list of blocked ports (dynamic from database)
 * @returns {Promise<Array>} Array of blocked port info
 */
export async function getBlockedPorts() {
  try {
    const { getBlockedPortsSettings } = await import('./blockedPortsSettings.js');
    return await getBlockedPortsSettings();
  } catch (error) {
    console.error('Error getting blocked ports:', error.message);
    // Fallback to defaults
    return [
      { port: 51820, reason: 'WireGuard VPN port', level: 'danger' },
      { port: 443, reason: 'HTTPS server port', level: 'danger' },
      { port: 80, reason: 'HTTP server port', level: 'danger' },
      { port: 22, reason: 'SSH port', level: 'warning' },
    ];
  }
}

/**
 * Execute shell command safely
 * @param {string} command - Command to execute
 * @returns {string} Command output
 */
function executeCommand(command) {
  try {
    console.log(`🔧 Executing: ${command}`);
    const output = execSync(command, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
      encoding: 'utf-8'
    });
    return output.trim();
  } catch (error) {
    // Some commands may return non-zero exit codes but still provide useful output
    console.warn(`⚠️ Command warning: ${error.message}`);
    return error.stdout?.trim() || '';
  }
}

/**
 * Parse IP range string to start and end IPs
 * @param {string} ipRange - IP range like "10.0.0.3-10.0.0.10"
 * @returns {{start: string, end: string}} Parsed IP range
 */
export function parseIPRange(ipRange) {
  const parts = ipRange.split('-');
  if (parts.length !== 2) {
    throw new Error('Invalid IP range format. Expected: start_ip-end_ip');
  }
  return {
    start: parts[0].trim(),
    end: parts[1].trim()
  };
}

/**
 * Convert IP to numeric value for comparison
 * @param {string} ip - IP address
 * @returns {number} Numeric representation
 */
function ipToNumber(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Generate list of IPs in range
 * @param {string} startIP - Start IP
 * @param {string} endIP - End IP
 * @returns {string[]} Array of IP addresses
 */
export function generateIPRange(startIP, endIP) {
  const start = ipToNumber(startIP);
  const end = ipToNumber(endIP);
  
  if (start > end) {
    throw new Error('Start IP must be less than or equal to end IP');
  }
  
  const ips = [];
  for (let i = start; i <= end; i++) {
    const ip = [
      (i >>> 24) & 0xFF,
      (i >>> 16) & 0xFF,
      (i >>> 8) & 0xFF,
      i & 0xFF
    ].join('.');
    ips.push(ip);
  }
  
  return ips;
}

/**
 * Validate single IP address format
 * @param {string} ip - IP address to validate
 * @returns {boolean} True if valid IP
 */
function isValidIP(ip) {
  const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  if (!ipPattern.test(ip)) return false;
  
  const parts = ip.split('.');
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (num < 0 || num > 255) return false;
  }
  return true;
}

/**
 * Get all IPs used in active rules
 * Returns map of IP -> rule info
 * @returns {Promise<Map<string, Object>>} Map of IP to rule info
 */
export async function getUsedIPsMap() {
  try {
    const activeRules = await getActiveRules();
    const ipMap = new Map();
    
    for (const rule of activeRules) {
      let ruleIPs = [];
      
      if (rule.ip_type === 'individual' && rule.ips) {
        ruleIPs = rule.ips;
      } else if (rule.ip_type === 'range' && rule.ip_range) {
        const { start, end } = parseIPRange(rule.ip_range);
        ruleIPs = generateIPRange(start, end);
      }
      
      for (const ip of ruleIPs) {
        if (!ipMap.has(ip)) {
          ipMap.set(ip, {
            rule_id: rule.id,
            rule_name: rule.name,
            port: rule.port,
            action: rule.action
          });
        }
      }
    }
    
    return ipMap;
  } catch (error) {
    console.error('Error getting used IPs map:', error.message);
    return new Map();
  }
}

/**
 * Check if IPs overlap with existing rules (cross-category validation)
 * Validates against ALL rule types: range, individual, and department
 * @param {string[]} ipsToCheck - Array of IPs to validate
 * @param {string} excludeRuleId - Rule ID to exclude (for editing)
 * @returns {Promise<Object>} Overlap validation result
 */
export async function checkIPOverlap(ipsToCheck, excludeRuleId = null) {
  const usedIPsMap = await getUsedIPsMap();
  const overlaps = [];
  
  for (const ip of ipsToCheck) {
    const existingRule = usedIPsMap.get(ip);
    if (existingRule && existingRule.rule_id !== excludeRuleId) {
      overlaps.push({
        ip,
        existing_rule: existingRule
      });
    }
  }
  
  return {
    has_overlap: overlaps.length > 0,
    overlaps,
    clean_ips: ipsToCheck.filter(ip => !overlaps.find(o => o.ip === ip)),
    total_checked: ipsToCheck.length,
    blocked_count: overlaps.length,
    available_count: ipsToCheck.length - overlaps.length
  };
}

/**
 * Get detailed IP conflict report across all categories
 * @param {Object} inputData - Input data with ip_type and corresponding data
 * @returns {Promise<Object>} Detailed conflict report
 */
export async function getIPConflictReport(inputData) {
  const { ip_type, ip_range, ips, department_id, excludeRuleId = null } = inputData;
  
  let ipsToCheck = [];
  let sourceInfo = {};
  
  // Collect IPs based on type
  if (ip_type === 'range' && ip_range) {
    const { start, end } = parseIPRange(ip_range);
    ipsToCheck = generateIPRange(start, end);
    sourceInfo = { type: 'range', range: ip_range };
  } else if (ip_type === 'individual' && ips) {
    ipsToCheck = [...new Set(ips)];
    sourceInfo = { type: 'individual', count: ips.length };
  } else if (ip_type === 'department' && department_id) {
    const { getDepartmentIPs } = await import('./department.js');
    ipsToCheck = await getDepartmentIPs(department_id);
    sourceInfo = { type: 'department', department_id };
  }
  
  // Check for overlaps
  const overlapCheck = await checkIPOverlap(ipsToCheck, excludeRuleId);
  
  // Categorize conflicts by rule type
  const conflictsByType = {
    range: [],
    individual: [],
    department: []
  };
  
  overlapCheck.overlaps.forEach(overlap => {
    const ruleType = overlap.existing_rule.ip_type || 'range';
    conflictsByType[ruleType]?.push(overlap);
  });
  
  return {
    source: sourceInfo,
    total_ips: ipsToCheck.length,
    available_ips: overlapCheck.available_count,
    blocked_ips: overlapCheck.blocked_count,
    has_conflicts: overlapCheck.has_overlap,
    conflicts_by_type: conflictsByType,
    conflicts: overlapCheck.overlaps,
    clean_ips: overlapCheck.clean_ips,
    risk_level: overlapCheck.blocked_count > 0 ? 'high' : 'low'
  };
}

/**
 * Get all firewall rules from database
 * @returns {Promise<Array>} Array of firewall rules
 */
export async function getAllRules() {
  try {
    const snapshot = await db.collection(FIREWALL_COLLECTION)
      .orderBy('created_at', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting firewall rules:', error.message);
    throw new Error('Failed to get firewall rules');
  }
}

/**
 * Get active rules only
 * @returns {Promise<Array>} Array of active firewall rules
 */
export async function getActiveRules() {
  try {
    const snapshot = await db.collection(FIREWALL_COLLECTION)
      .where('enabled', '==', true)
      .orderBy('created_at', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting active firewall rules:', error.message);
    // Fallback to all rules if index missing
    const allRules = await getAllRules();
    return allRules.filter(rule => rule.enabled === true);
  }
}

/**
 * Get rule by ID
 * @param {string} ruleId - Rule ID
 * @returns {Promise<Object>} Firewall rule
 */
export async function getRuleById(ruleId) {
  try {
    const doc = await db.collection(FIREWALL_COLLECTION).doc(ruleId).get();
    
    if (!doc.exists) {
      throw new Error('Rule not found');
    }
    
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error getting firewall rule:', error.message);
    throw error;
  }
}

/**
 * Create firewall rule
 * @param {Object} ruleData - Rule data
 * @param {string} ruleData.name - Rule name
 * @param {string} ruleData.port - Port number
 * @param {string} ruleData.protocol - Protocol (tcp/udp)
 * @param {string[]} ruleData.ips - Array of individual IPs
 * @param {string} ruleData.ip_range - IP range (e.g., "10.0.0.3-10.0.0.10")
 * @param {string} ruleData.department_id - Department ID for group-based rules
 * @param {string} ruleData.action - Action (allow/deny)
 * @param {string} ruleData.description - Rule description
 * @param {'range'|'individual'|'department'} ruleData.ip_type - Type of IP selection
 * @param {boolean} ruleData.allow_overlap - Allow creating rule with overlapping IPs
 * @returns {Promise<Object>} Created rule
 */
export async function createRule(ruleData) {
  try {
    const { name, port, protocol, ips, ip_range, department_id, ip_type = 'range', action = 'allow', description = '', allow_overlap = false } = ruleData;
    
    // Validate required fields
    if (!name || !port) {
      throw new Error('Name and port are required');
    }
    
    // Validate port
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      throw new Error('Port must be between 1 and 65535');
    }
    
    // Check if port is blocked
    const portCheck = isPortBlocked(portNum);
    if (portCheck.blocked && !allow_overlap) {
      throw new Error(`Port ${portNum} is blocked: ${portCheck.reason}. This port is reserved for system use.`);
    }
    
    // Validate protocol
    const validProtocols = ['tcp', 'udp', 'both'];
    if (!validProtocols.includes(protocol?.toLowerCase())) {
      throw new Error('Protocol must be tcp, udp, or both');
    }
    
    // Process IPs based on type
    let processedIPs = [];
    let displayIPRange = ip_range || '';
    
    if (ip_type === 'department' && department_id) {
      // Get IPs from department
      const { getDepartmentIPs } = await import('./department.js');
      processedIPs = await getDepartmentIPs(department_id);
      displayIPRange = `Department: ${department_id}`;
      
      if (processedIPs.length === 0) {
        throw new Error('Department has no active devices');
      }
    } else if (ip_type === 'individual' && ips && Array.isArray(ips)) {
      // Validate individual IPs
      for (const ip of ips) {
        if (!isValidIP(ip)) {
          throw new Error(`Invalid IP address: ${ip}`);
        }
      }
      processedIPs = [...new Set(ips)]; // Remove duplicates
      displayIPRange = ips.join(',');
    } else if (ip_type === 'range' && ip_range) {
      // Validate and parse IP range
      const { start, end } = parseIPRange(ip_range);
      processedIPs = generateIPRange(start, end);
    } else {
      throw new Error('Either IP range, individual IPs, or department must be provided');
    }
    
    if (processedIPs.length === 0) {
      throw new Error('No valid IP addresses provided');
    }
    
    // Check for IP overlap
    const overlapCheck = await checkIPOverlap(processedIPs);
    if (overlapCheck.has_overlap && !allow_overlap) {
      const overlapDetails = overlapCheck.overlaps.map(o => 
        `${o.ip} (used by rule: ${o.existing_rule.rule_name})`
      ).join(', ');
      
      throw new Error(`IP overlap detected: ${overlapDetails}. Set allow_overlap=true to force.`);
    }
    
    // Use clean IPs (exclude overlaps if allow_overlap is true)
    const finalIPs = allow_overlap ? overlapCheck.clean_ips : processedIPs;
    
    if (finalIPs.length === 0) {
      throw new Error('No valid IP addresses after overlap removal');
    }
    
    // Apply rule to iptables
    const iptablesResults = await applyRuleToIptables(portNum, protocol, finalIPs, action);
    
    // Save to database
    const ruleRef = await db.collection(FIREWALL_COLLECTION).add({
      name,
      port: portNum,
      protocol: protocol.toLowerCase(),
      ip_range: displayIPRange,
      ip_type,
      ips: ip_type === 'individual' ? finalIPs : [],
      department_id: ip_type === 'department' ? department_id : null,
      action,
      description,
      enabled: true,
      ip_count: finalIPs.length,
      iptables_chain: iptablesResults.chain,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'admin',
      has_overlap: overlapCheck.has_overlap && allow_overlap
    });
    
    return {
      id: ruleRef.id,
      name,
      port: portNum,
      protocol: protocol.toLowerCase(),
      ip_range: displayIPRange,
      ip_type,
      ips: ip_type === 'individual' ? finalIPs : [],
      department_id: ip_type === 'department' ? department_id : null,
      action,
      description,
      enabled: true,
      ip_count: finalIPs.length,
      overlap_warning: overlapCheck.has_overlap && allow_overlap
    };
  } catch (error) {
    console.error('Error creating firewall rule:', error.message);
    throw error;
  }
}

/**
 * Apply rule to iptables
 * @param {number} port - Port number
 * @param {string} protocol - Protocol
 * @param {string[]} ips - Array of IP addresses
 * @param {string} action - Action (allow/deny)
 * @returns {Object} Result of iptables operations
 */
async function applyRuleToIptables(port, protocol, ips, action) {
  const chain = 'INPUT';
  const iptablesAction = action === 'allow' ? 'ACCEPT' : 'DROP';
  const results = [];
  
  try {
    // Create custom chain for VPN firewall rules if not exists
    const customChain = 'VPN_FIREWALL';
    try {
      executeCommand(`iptables -N ${customChain} 2>/dev/null || true`);
    } catch (e) {
      // Chain may already exist
    }
    
    // Ensure custom chain is referenced from INPUT
    try {
      executeCommand(`iptables -C INPUT -j ${customChain} 2>/dev/null || iptables -A INPUT -j ${customChain}`);
    } catch (e) {
      // Rule may already exist
    }
    
    // Determine protocols to apply
    const protocols = protocol === 'both' ? ['tcp', 'udp'] : [protocol];
    
    // Add rules for each IP
    for (const ip of ips) {
      for (const proto of protocols) {
        try {
          // Check if rule already exists
          const checkCmd = `iptables -C ${customChain} -s ${ip} -p ${proto} --dport ${port} -j ${iptablesAction} 2>/dev/null`;
          try {
            executeCommand(checkCmd);
            console.log(`ℹ️ Rule already exists: ${ip} -> port ${port}/${proto}`);
            continue;
          } catch (e) {
            // Rule doesn't exist, add it
          }
          
          // Add rule
          const addCmd = `iptables -A ${customChain} -s ${ip} -p ${proto} --dport ${port} -j ${iptablesAction}`;
          executeCommand(addCmd);
          results.push({ ip, protocol: proto, port, action: iptablesAction, status: 'added' });
          console.log(`✅ Added: ${ip} -> port ${port}/${proto} -> ${iptablesAction}`);
        } catch (error) {
          console.error(`❌ Failed to add rule for ${ip}/${proto}:`, error.message);
          results.push({ ip, protocol: proto, port, action: iptablesAction, status: 'failed', error: error.message });
        }
      }
    }
    
    return {
      chain: customChain,
      rules: results,
      success: results.filter(r => r.status === 'added').length > 0
    };
  } catch (error) {
    console.error('Error applying rule to iptables:', error.message);
    throw new Error(`Failed to apply firewall rule: ${error.message}`);
  }
}

/**
 * Remove rule from iptables
 * @param {number} port - Port number
 * @param {string} protocol - Protocol
 * @param {string[]} ips - Array of IP addresses
 * @param {string} action - Action (allow/deny)
 * @returns {Object} Result of iptables operations
 */
async function removeRuleFromIptables(port, protocol, ips, action) {
  const customChain = 'VPN_FIREWALL';
  const iptablesAction = action === 'allow' ? 'ACCEPT' : 'DROP';
  const results = [];
  
  try {
    const protocols = protocol === 'both' ? ['tcp', 'udp'] : [protocol];
    
    for (const ip of ips) {
      for (const proto of protocols) {
        try {
          // Delete rule
          const deleteCmd = `iptables -D ${customChain} -s ${ip} -p ${proto} --dport ${port} -j ${iptablesAction} 2>/dev/null`;
          executeCommand(deleteCmd);
          results.push({ ip, protocol: proto, port, action: iptablesAction, status: 'removed' });
          console.log(`✅ Removed: ${ip} -> port ${port}/${proto}`);
        } catch (error) {
          console.warn(`⚠️ Rule not found for ${ip}/${proto}:`, error.message);
          results.push({ ip, protocol: proto, port, action: iptablesAction, status: 'not_found' });
        }
      }
    }
    
    return {
      chain: customChain,
      rules: results,
      success: true
    };
  } catch (error) {
    console.error('Error removing rule from iptables:', error.message);
    throw new Error(`Failed to remove firewall rule: ${error.message}`);
  }
}

/**
 * Update firewall rule
 * @param {string} ruleId - Rule ID
 * @param {Object} ruleData - Updated rule data
 * @returns {Promise<Object>} Updated rule
 */
export async function updateRule(ruleId, ruleData) {
  try {
    const existingRule = await getRuleById(ruleId);

    // Get IPs to remove based on existing rule type
    let existingIPs = [];
    if (existingRule.ip_type === 'individual' && existingRule.ips) {
      existingIPs = existingRule.ips;
    } else if (existingRule.ip_type === 'department' && existingRule.department_id) {
      const { getDepartmentIPs } = await import('./department.js');
      existingIPs = await getDepartmentIPs(existingRule.department_id);
    } else if (existingRule.ip_range && existingRule.ip_type === 'range') {
      const { start, end } = parseIPRange(existingRule.ip_range);
      existingIPs = generateIPRange(start, end);
    }

    // Remove old rules from iptables
    await removeRuleFromIptables(
      existingRule.port,
      existingRule.protocol,
      existingIPs,
      existingRule.action
    );

    // Update data
    const { name, port, protocol, ip_range, ips, department_id, ip_type = existingRule.ip_type || 'range', action, description, enabled } = {
      ...existingRule,
      ...ruleData
    };

    // Validate port
    const portNum = parseInt(port, 10);
    if (!isNaN(portNum) && portNum >= 1 && portNum <= 65535) {
      const portCheck = isPortBlocked(portNum);
      if (portCheck.blocked && !ruleData.allow_overlap) {
        throw new Error(`Port ${portNum} is blocked: ${portCheck.reason}. This port is reserved for system use.`);
      }
    }

    // Process IPs based on type
    let processedIPs = [];
    let displayIPRange = ip_range || '';

    if (ip_type === 'department' && department_id) {
      const { getDepartmentIPs } = await import('./department.js');
      processedIPs = await getDepartmentIPs(department_id);
      displayIPRange = `Department: ${department_id}`;
      
      if (processedIPs.length === 0) {
        throw new Error('Department has no active devices');
      }
    } else if (ip_type === 'individual' && ips && Array.isArray(ips)) {
      // Validate individual IPs
      for (const ip of ips) {
        if (!isValidIP(ip)) {
          throw new Error(`Invalid IP address: ${ip}`);
        }
      }
      processedIPs = [...new Set(ips)];
      displayIPRange = ips.join(',');
    } else if (ip_type === 'range' && ip_range) {
      const { start, end } = parseIPRange(ip_range);
      processedIPs = generateIPRange(start, end);
    } else {
      throw new Error('Either IP range, individual IPs, or department must be provided');
    }

    // Apply new rules to iptables if enabled
    if (enabled) {
      await applyRuleToIptables(parseInt(port, 10), protocol, processedIPs, action);
    }

    // Update database
    await db.collection(FIREWALL_COLLECTION).doc(ruleId).update({
      name,
      port: parseInt(port, 10),
      protocol,
      ip_range: displayIPRange,
      ip_type,
      ips: ip_type === 'individual' ? processedIPs : [],
      department_id: ip_type === 'department' ? department_id : null,
      action,
      description,
      enabled,
      ip_count: processedIPs.length,
      updated_at: new Date().toISOString()
    });

    return {
      id: ruleId,
      name,
      port: parseInt(port, 10),
      protocol,
      ip_range: displayIPRange,
      ip_type,
      ips: ip_type === 'individual' ? processedIPs : [],
      department_id: ip_type === 'department' ? department_id : null,
      action,
      description,
      enabled,
      ip_count: processedIPs.length
    };
  } catch (error) {
    console.error('Error updating firewall rule:', error.message);
    throw error;
  }
}

/**
 * Delete firewall rule
 * @param {string} ruleId - Rule ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteRule(ruleId) {
  try {
    const rule = await getRuleById(ruleId);
    
    // Parse IP range
    const { start, end } = parseIPRange(rule.ip_range);
    const ips = generateIPRange(start, end);
    
    // Remove from iptables
    await removeRuleFromIptables(rule.port, rule.protocol, ips, rule.action);
    
    // Delete from database
    await db.collection(FIREWALL_COLLECTION).doc(ruleId).delete();
    
    return {
      message: 'Firewall rule deleted successfully',
      rule_id: ruleId,
      removed_ips: ips.length
    };
  } catch (error) {
    console.error('Error deleting firewall rule:', error.message);
    throw error;
  }
}

/**
 * Toggle rule enabled/disabled
 * @param {string} ruleId - Rule ID
 * @returns {Promise<Object>} Updated rule
 */
export async function toggleRule(ruleId) {
  try {
    const rule = await getRuleById(ruleId);
    const newEnabledState = !rule.enabled;
    
    // Parse IP range
    const { start, end } = parseIPRange(rule.ip_range);
    const ips = generateIPRange(start, end);
    
    if (newEnabledState) {
      // Enable: add to iptables
      await applyRuleToIptables(rule.port, rule.protocol, ips, rule.action);
    } else {
      // Disable: remove from iptables
      await removeRuleFromIptables(rule.port, rule.protocol, ips, rule.action);
    }
    
    // Update database
    await db.collection(FIREWALL_COLLECTION).doc(ruleId).update({
      enabled: newEnabledState,
      updated_at: new Date().toISOString()
    });
    
    return {
      id: ruleId,
      ...rule,
      enabled: newEnabledState
    };
  } catch (error) {
    console.error('Error toggling firewall rule:', error.message);
    throw error;
  }
}

/**
 * Get iptables status
 * @returns {Promise<Object>} iptables status and rules
 */
export async function getIptablesStatus() {
  try {
    const customChain = 'VPN_FIREWALL';
    
    // Get rules from custom chain
    let chainRules = '';
    try {
      chainRules = executeCommand(`iptables -L ${customChain} -n -v 2>/dev/null || echo "Chain not found"`);
    } catch (e) {
      chainRules = 'Chain not found or empty';
    }
    
    // Count rules
    const ruleCount = (chainRules.match(/\n/g) || []).length - 1;
    
    return {
      chain: customChain,
      rule_count: Math.max(0, ruleCount),
      status: chainRules.includes('Chain') ? 'active' : 'inactive',
      rules_preview: chainRules.split('\n').slice(0, 10).join('\n')
    };
  } catch (error) {
    console.error('Error getting iptables status:', error.message);
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Sync database rules with iptables
 * Re-applies all enabled rules from database
 * @returns {Promise<Object>} Sync result
 */
export async function syncRules() {
  try {
    const activeRules = await getActiveRules();
    const results = [];
    
    for (const rule of activeRules) {
      try {
        const { start, end } = parseIPRange(rule.ip_range);
        const ips = generateIPRange(start, end);
        
        await applyRuleToIptables(rule.port, rule.protocol, ips, rule.action);
        
        results.push({
          rule_id: rule.id,
          rule_name: rule.name,
          status: 'synced'
        });
      } catch (error) {
        results.push({
          rule_id: rule.id,
          rule_name: rule.name,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    return {
      message: 'Firewall rules synced',
      total_rules: activeRules.length,
      synced: results.filter(r => r.status === 'synced').length,
      failed: results.filter(r => r.status === 'failed').length,
      details: results
    };
  } catch (error) {
    console.error('Error syncing firewall rules:', error.message);
    throw new Error(`Failed to sync firewall rules: ${error.message}`);
  }
}
