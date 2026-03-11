import { execSync } from 'child_process';

/**
 * System Port Scanner Service
 * Scans for open ports on the system using various methods
 */

/**
 * Execute shell command safely
 * @param {string} command - Command to execute
 * @returns {string} Command output
 */
function executeCommand(command) {
  try {
    const output = execSync(command, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
      encoding: 'utf-8'
    });
    return output.trim();
  } catch (error) {
    console.warn(`Command warning: ${error.message}`);
    return error.stdout?.trim() || '';
  }
}

/**
 * Get all listening ports from netstat
 * @returns {Array} Array of open port info
 */
export function scanListeningPorts() {
  try {
    // Try netstat first
    const output = executeCommand('netstat -tlnp 2>/dev/null || ss -tlnp 2>/dev/null');
    const lines = output.split('\n').slice(1); // Skip header
    
    const ports = [];
    const portSet = new Set();
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      
      // Parse local address (e.g., 0.0.0.0:22 or :::80)
      let localAddress = '';
      let port = '';
      
      for (const part of parts) {
        if (part.includes(':')) {
          const addrParts = part.split(':');
          if (addrParts.length >= 2) {
            localAddress = addrParts.slice(0, -1).join(':');
            port = addrParts[addrParts.length - 1];
            break;
          }
        }
      }
      
      if (port && !portSet.has(port)) {
        portSet.add(port);
        
        // Determine if open to public
        const isPublic = localAddress === '0.0.0.0' || localAddress === '*' || localAddress === ':::' || localAddress === '';
        
        ports.push({
          port: parseInt(port, 10),
          protocol: 'tcp',
          bind_address: localAddress,
          is_public: isPublic,
          state: 'LISTEN'
        });
      }
    }
    
    return ports;
  } catch (error) {
    console.error('Error scanning listening ports:', error.message);
    return [];
  }
}

/**
 * Get iptables rules with port information
 * @returns {Array} Array of iptables port rules
 */
export function scanIptablesPorts() {
  try {
    // Get all INPUT chain rules
    const output = executeCommand('iptables -L INPUT -n -v --line-numbers 2>/dev/null');
    const lines = output.split('\n');
    
    const rules = [];
    
    for (const line of lines) {
      // Match lines with ACCEPT/DROP and dpt: (destination port)
      const portMatch = line.match(/dpt:(\d+)/);
      const sourceMatch = line.match(/^(\d+)\s+\d+\s+\d+\s+(ACCEPT|DROP|REJECT)/);
      
      if (portMatch) {
        const port = parseInt(portMatch[1], 10);
        const source = sourceMatch ? sourceMatch[2] : 'UNKNOWN';
        
        // Check if source is 0.0.0.0/0 (anywhere)
        const isFromAnywhere = line.includes('0.0.0.0/0') || !line.match(/\d+\.\d+\.\d+\.\d+\/\d+/);
        
        rules.push({
          port,
          action: source,
          from_anywhere: isFromAnywhere,
          raw_line: line.trim()
        });
      }
    }
    
    return rules;
  } catch (error) {
    console.error('Error scanning iptables:', error.message);
    return [];
  }
}

/**
 * Analyze system for dangerously open ports
 * @returns {Object} Analysis result
 */
export function analyzeOpenPorts() {
  const listeningPorts = scanListeningPorts();
  const iptablesRules = scanIptablesPorts();
  
  // Get ports from our firewall rules
  const firewallPorts = new Set();
  iptablesRules.forEach(rule => {
    if (rule.action === 'ACCEPT') {
      firewallPorts.add(rule.port);
    }
  });
  
  // Categorize ports
  const publicPorts = [];
  const restrictedPorts = [];
  const unprotectedPorts = [];
  
  for (const port of listeningPorts) {
    const portInfo = {
      port: port.port,
      protocol: port.protocol,
      bind_address: port.bind_address,
      in_firewall: firewallPorts.has(port.port)
    };
    
    if (port.is_public) {
      // Port is listening on all interfaces
      if (!portInfo.in_firewall) {
        // Not protected by firewall rule - DANGEROUS
        unprotectedPorts.push({
          ...portInfo,
          risk: 'high',
          reason: 'Port is open to public without firewall protection'
        });
      } else {
        // Protected by firewall but still public
        publicPorts.push({
          ...portInfo,
          risk: 'medium',
          reason: 'Port is open to public but protected by firewall'
        });
      }
    } else {
      // Restricted to specific IP/interface
      restrictedPorts.push({
        ...portInfo,
        risk: 'low',
        reason: 'Port is restricted to specific IP/interface'
      });
    }
  }
  
  return {
    listening_ports: listeningPorts,
    iptables_rules: iptablesRules,
    public_ports: publicPorts,
    restricted_ports: restrictedPorts,
    unprotected_ports: unprotectedPorts,
    summary: {
      total_listening: listeningPorts.length,
      public_count: publicPorts.length,
      restricted_count: restrictedPorts.length,
      unprotected_count: unprotectedPorts.length,
      risk_level: unprotectedPorts.length > 0 ? 'high' : publicPorts.length > 0 ? 'medium' : 'low'
    }
  };
}

/**
 * Get ports that are open to anywhere (0.0.0.0/0)
 * These are potentially dangerous and should be reviewed
 * @returns {Array} Array of ports open to public
 */
export function getPublicPorts() {
  const analysis = analyzeOpenPorts();
  return [...analysis.public_ports, ...analysis.unprotected_ports];
}

/**
 * Check if a specific port is open to public
 * @param {number} port - Port to check
 * @returns {Object} Port status
 */
export function isPortPublic(port) {
  const listeningPorts = scanListeningPorts();
  const portInfo = listeningPorts.find(p => p.port === port);
  
  if (!portInfo) {
    return {
      port,
      is_listening: false,
      is_public: false
    };
  }
  
  return {
    port,
    is_listening: true,
    is_public: portInfo.is_public,
    bind_address: portInfo.bind_address,
    protocol: portInfo.protocol
  };
}
