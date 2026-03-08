import { execSync } from 'child_process';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';
const WG_SERVER_PUBLIC_KEY = process.env.WG_SERVER_PUBLIC_KEY;
const WG_SERVER_ENDPOINT = process.env.WG_SERVER_ENDPOINT;
const WG_DNS = process.env.WG_DNS || '1.1.1.1';
const WG_SUBNET = process.env.WG_SUBNET || '10.0.0.0/24';

/**
 * Get all IP addresses currently in use from WireGuard interface
 * This provides real-time data to prevent IP conflicts
 * @returns {string[]} Array of IP addresses (without /32 suffix)
 */
export function getUsedIPsFromWireGuard() {
  try {
    const output = execSync(`wg show ${WG_INTERFACE} allowed-ips`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 2000
    }).toString();
    
    // Parse output to extract IP addresses
    // Format: "peer_key\tallowed-ips: 10.0.0.2/32, 10.0.0.3/32"
    const ips = [];
    output.split('\n').forEach(line => {
      const matches = line.match(/(\d+\.\d+\.\d+\.\d+)\/32/g);
      if (matches) {
        matches.forEach(match => {
          ips.push(match.replace('/32', ''));
        });
      }
    });
    
    console.log(`🔍 WireGuard active IPs: ${ips.length} found`);
    return ips;
  } catch (error) {
    console.error('⚠️ Failed to get IPs from WireGuard:', error.message);
    return [];
  }
}

/**
 * Get all public keys currently in WireGuard interface
 * Used to prevent duplicate key conflicts
 * @returns {string[]} Array of public keys
 */
export function getPublicKeysFromWireGuard() {
  try {
    const output = execSync(`wg show ${WG_INTERFACE}`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 2000
    }).toString();
    
    // Parse output to extract public keys
    // Format: "peer_key\t..."
    const keys = [];
    output.split('\n').forEach(line => {
      // First column is the public key
      const parts = line.trim().split(/\s+/);
      if (parts.length > 0 && parts[0].length === 44) {
        keys.push(parts[0]);
      }
    });
    
    console.log(`🔑 WireGuard active keys: ${keys.length} found`);
    return keys;
  } catch (error) {
    console.error('⚠️ Failed to get public keys from WireGuard:', error.message);
    return [];
  }
}

/**
 * Check if an IP address is currently in use in WireGuard
 * @param {string} ipAddress - IP address to check
 * @returns {boolean} True if IP is in use
 */
export function isIPInUse(ipAddress) {
  const usedIPs = getUsedIPsFromWireGuard();
  return usedIPs.includes(ipAddress);
}

/**
 * Check if a public key already exists in WireGuard
 * @param {string} publicKey - Public key to check
 * @returns {boolean} True if key exists
 */
export function isKeyInUse(publicKey) {
  const usedKeys = getPublicKeysFromWireGuard();
  return usedKeys.includes(publicKey);
}

/**
 * Get next available IP in subnet
 * Checks both Firestore database AND active WireGuard interface
 * to prevent IP conflicts and race conditions
 * @param {string[]} usedIPs - IPs from Firestore database
 * @returns {string} Next available IP address
 * @throws {Error} When no IP addresses are available
 */
export function getNextAvailableIP(usedIPs) {
  const baseIP = WG_SUBNET.split('.')[2];
  const subnetBase = WG_SUBNET.split('/')[0].split('.').slice(0, 2).join('.');
  
  // Get real-time IPs from WireGuard interface
  const wgUsedIPs = getUsedIPsFromWireGuard();
  
  // Combine both sources and remove duplicates
  const allUsedIPs = [...new Set([...usedIPs, ...wgUsedIPs])];
  
  console.log(`📊 IP Allocation Check:`, {
    firestoreIPs: usedIPs.length,
    wireguardIPs: wgUsedIPs.length,
    totalUsed: allUsedIPs.length
  });

  for (let i = 2; i < 254; i++) {
    const ip = `${subnetBase}.${baseIP}.${i}`;
    if (!allUsedIPs.includes(ip)) {
      console.log(`✅ IP allocated: ${ip}`);
      return ip;
    }
  }
  throw new Error('No available IP addresses in subnet');
}

// Generate WireGuard keypair with error handling
export function generateKeypair() {
  try {
    const privateKey = execSync('wg genkey', {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    }).toString().trim();

    // Use bash for pipe command
    const publicKey = execSync(`bash -c "echo '${privateKey}' | wg pubkey"`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    }).toString().trim();

    return { privateKey, publicKey };
  } catch (error) {
    const errorMsg = `Failed to generate WireGuard keypair: ${error.message}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * Add peer to WireGuard with comprehensive conflict detection and rollback
 * @param {string} publicKey - WireGuard public key
 * @param {string} ipAddress - IP address to assign
 * @returns {boolean} True if peer added successfully
 * @throws {Error} When IP conflict, duplicate key, or other errors occur
 */
export function addPeer(publicKey, ipAddress) {
  const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';
  const CONFIG_PATH = `/etc/wireguard/${WG_INTERFACE}.conf`;
  
  let peerAddedToInterface = false;

  try {
    console.log(`🔐 Adding WireGuard peer: ${publicKey.substring(0, 20)}... with IP: ${ipAddress}`);

    // ===== VALIDATION STEP: Check for IP conflicts =====
    if (isIPInUse(ipAddress)) {
      const errorMsg = `IP address ${ipAddress} is already in use by another peer`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    console.log(`✅ IP conflict check passed: ${ipAddress} is available`);

    // ===== VALIDATION STEP: Check for duplicate public key =====
    if (isKeyInUse(publicKey)) {
      const errorMsg = `Public key already exists in WireGuard interface`;
      console.error(`❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    console.log(`✅ Duplicate key check passed: public key is unique`);

    // ===== STEP 1: Add peer to running interface =====
    execSync(`wg set ${WG_INTERFACE} peer '${publicKey}' allowed-ips ${ipAddress}/32`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    });
    peerAddedToInterface = true;
    console.log(`✅ Peer added to running interface`);

    // ===== STEP 2: Update config file =====
    let configContent = '';
    try {
      configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    } catch (readError) {
      // Config file doesn't exist, create basic structure
      configContent = `[Interface]\n`;
      configContent += `PrivateKey = ${process.env.WG_SERVER_PRIVATE_KEY || ''}\n`;
      configContent += `Address = ${process.env.WG_SERVER_IP || '10.0.0.1'}/24\n`;
      configContent += `ListenPort = ${process.env.WG_PORT || '51820'}\n\n`;
    }

    // Check if peer already exists in config
    if (!configContent.includes(`PublicKey = ${publicKey}`)) {
      // Append new peer
      configContent += `\n[Peer]\n`;
      configContent += `PublicKey = ${publicKey}\n`;
      configContent += `AllowedIPs = ${ipAddress}/32\n`;

      // Write updated config
      fs.writeFileSync(CONFIG_PATH, configContent);
      console.log(`✅ Peer appended to config file: ${CONFIG_PATH}`);
    } else {
      console.log(`ℹ️ Peer already exists in config: ${publicKey.substring(0, 20)}...`);
    }

    // ===== STEP 3: Verify peer was added =====
    const currentConfig = fs.readFileSync(CONFIG_PATH, 'utf8');
    if (!currentConfig.includes(`PublicKey = ${publicKey}`)) {
      throw new Error('Peer not found in config after adding');
    }

    // ===== STEP 4: Final verification in WireGuard interface =====
    const wgPeers = execSync(`wg show ${WG_INTERFACE} allowed-ips`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 2000
    }).toString();
    
    if (!wgPeers.includes(`${ipAddress}/32`)) {
      throw new Error('IP not found in WireGuard allowed-ips after adding');
    }

    console.log('✅ WireGuard peer added and verified successfully');
    return true;

  } catch (error) {
    // ===== ROLLBACK: Remove peer from interface if partially added =====
    if (peerAddedToInterface) {
      console.log(`🔄 Rolling back: removing peer from interface due to error`);
      try {
        execSync(`wg set ${WG_INTERFACE} peer '${publicKey}' remove`, {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 2000
        });
        console.log(`✅ Rollback successful: peer removed from interface`);
      } catch (rollbackError) {
        console.error(`❌ Rollback failed: ${rollbackError.message}`);
      }
    }

    const errorMsg = `Failed to add WireGuard peer: ${error.message}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

// Remove peer from WireGuard with error handling
export function removePeer(publicKey) {
  try {
    const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';

    console.log(`Removing WireGuard peer: ${publicKey}`);

    // Remove peer from running interface
    execSync(`wg set ${WG_INTERFACE} peer ${publicKey} remove`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    });

    // Save current config (without removed peer) to config file using bash
    execSync(`bash -c "wg showconf ${WG_INTERFACE} > /etc/wireguard/${WG_INTERFACE}.conf"`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    });

    console.log('WireGuard peer removed successfully');
    return true;
  } catch (error) {
    const errorMsg = `Failed to remove WireGuard peer: ${error.message}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

// Disable peer from WireGuard (remove from interface but keep in database)
export function disablePeer(publicKey) {
  try {
    const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';

    console.log(`Disabling WireGuard peer: ${publicKey}`);

    // Remove peer from running interface only (don't save config)
    execSync(`wg set ${WG_INTERFACE} peer ${publicKey} remove`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    });

    console.log('WireGuard peer disabled successfully (kept in config file)');
    return true;
  } catch (error) {
    const errorMsg = `Failed to disable WireGuard peer: ${error.message}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

// Reactivate peer in WireGuard (add back to interface from config)
export function reactivatePeer(publicKey, ipAddress) {
  try {
    const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';

    console.log(`Reactivating WireGuard peer: ${publicKey} with IP: ${ipAddress}`);

    // Add peer back to running interface
    execSync(`wg set ${WG_INTERFACE} peer ${publicKey} allowed-ips ${ipAddress}/32`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    });

    // Save current config (including reactivated peer) to config file using bash
    execSync(`bash -c "wg showconf ${WG_INTERFACE} > /etc/wireguard/${WG_INTERFACE}.conf"`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    });

    console.log('WireGuard peer reactivated successfully');
    return true;
  } catch (error) {
    const errorMsg = `Failed to reactivate WireGuard peer: ${error.message}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

// Generate WireGuard config file content
export function generateConfig(clientPrivateKey, clientIP, deviceName) {
  return `[Interface]
PrivateKey = ${clientPrivateKey}
Address = ${clientIP}/32
DNS = ${WG_DNS}

[Peer]
PublicKey = ${WG_SERVER_PUBLIC_KEY}
Endpoint = ${WG_SERVER_ENDPOINT}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25`;
}

// Get current WireGuard peers
export function getPeers() {
  try {
    const output = execSync(`wg show ${WG_INTERFACE}`).toString();
    return output;
  } catch (error) {
    console.error('Failed to get peers:', error.message);
    return '';
  }
}

// Check if WireGuard service is healthy
export function isWireGuardHealthy() {
  try {
    const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';
    
    execSync(`wg show ${WG_INTERFACE}`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 2000
    });
    
    return true;
  } catch (error) {
    console.error('WireGuard health check failed:', error.message);
    return false;
  }
}
