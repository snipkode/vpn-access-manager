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

// Generate WireGuard keypair
export function generateKeypair() {
  const privateKey = execSync('wg genkey').toString().trim();
  const publicKey = execSync(`echo "${privateKey}" | wg pubkey`).toString().trim();
  return { privateKey, publicKey };
}

// Add peer to WireGuard
export function addPeer(publicKey, ipAddress) {
  try {
    execSync(`wg set ${WG_INTERFACE} peer ${publicKey} allowed-ips ${ipAddress}/32`);
    execSync(`wg syncconf ${WG_INTERFACE} <(wg-quick strip ${WG_INTERFACE})`);
    return true;
  } catch (error) {
    console.error('Failed to add peer:', error.message);
    throw error;
  }
}

// Remove peer from WireGuard
export function removePeer(publicKey) {
  try {
    execSync(`wg set ${WG_INTERFACE} peer ${publicKey} remove`);
    execSync(`wg syncconf ${WG_INTERFACE} <(wg-quick strip ${WG_INTERFACE})`);
    return true;
  } catch (error) {
    console.error('Failed to remove peer:', error.message);
    throw error;
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
