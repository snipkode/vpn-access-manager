import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';
const WG_SERVER_PUBLIC_KEY = process.env.WG_SERVER_PUBLIC_KEY;
const WG_SERVER_ENDPOINT = process.env.WG_SERVER_ENDPOINT;
const WG_DNS = process.env.WG_DNS || '1.1.1.1';
const WG_SUBNET = process.env.WG_SUBNET || '10.0.0.0/24';

// Get next available IP in subnet
export function getNextAvailableIP(usedIPs) {
  const baseIP = WG_SUBNET.split('.')[2];
  const subnetBase = WG_SUBNET.split('/')[0].split('.').slice(0, 2).join('.');
  
  for (let i = 2; i < 254; i++) {
    const ip = `${subnetBase}.${baseIP}.${i}`;
    if (!usedIPs.includes(ip)) {
      return ip;
    }
  }
  throw new Error('No available IP addresses');
}

// Generate WireGuard keypair with error handling
export function generateKeypair() {
  try {
    const privateKey = execSync('wg genkey', {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    }).toString().trim();
    
    const publicKey = execSync(`echo "${privateKey}" | wg pubkey`, {
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

// Add peer to WireGuard with error handling
export function addPeer(publicKey, ipAddress) {
  try {
    const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';

    console.log(`Adding WireGuard peer: ${publicKey} with IP: ${ipAddress}`);

    // Add peer to running interface
    execSync(`wg set ${WG_INTERFACE} peer ${publicKey} allowed-ips ${ipAddress}/32`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    });

    // Save current config (including new peer) to config file using wg showconf
    execSync(`wg showconf ${WG_INTERFACE} > /etc/wireguard/${WG_INTERFACE}.conf`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    });

    console.log('WireGuard peer added successfully');
    return true;
  } catch (error) {
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

    // Save current config (without removed peer) to config file
    execSync(`wg showconf ${WG_INTERFACE} > /etc/wireguard/${WG_INTERFACE}.conf`, {
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

    // Save current config (including reactivated peer) to config file
    execSync(`wg showconf ${WG_INTERFACE} > /etc/wireguard/${WG_INTERFACE}.conf`, {
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
