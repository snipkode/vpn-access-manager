#!/usr/bin/env node
/**
 * WireGuard Peer Diagnostic Tool
 * 
 * Usage: node scripts/diagnose-wireguard.js
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { db } from '../config/firebase.js';

dotenv.config();

const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, level = 'INFO') {
  const colorMap = {
    'INFO': colors.blue,
    'SUCCESS': colors.green,
    'WARNING': colors.yellow,
    'ERROR': colors.red,
    'CHECK': colors.cyan,
  };
  console.log(`${colorMap[level] || colors.reset}[${level}]${colors.reset} ${message}`);
}

function runCommand(cmd) {
  try {
    const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    return { success: true, output };
  } catch (error) {
    return { success: false, error: error.message, output: error.stderr || error.message };
  }
}

async function checkInterface() {
  log(`Checking WireGuard interface: ${WG_INTERFACE}`, 'CHECK');
  
  const result = runCommand(`wg show ${WG_INTERFACE}`);
  if (result.success) {
    log(`Interface ${WG_INTERFACE} is active`, 'SUCCESS');
    console.log(result.output);
    return true;
  } else {
    log(`Interface ${WG_INTERFACE} is NOT active`, 'ERROR');
    log(result.output, 'ERROR');
    return false;
  }
}

async function checkPeers() {
  log('Checking WireGuard peers...', 'CHECK');
  
  const result = runCommand(`wg show ${WG_INTERFACE} allowed-ips`);
  if (result.success) {
    const lines = result.output.split('\n').filter(l => l.trim());
    log(`Found ${lines.length} peer(s)`, 'INFO');
    console.log(result.output);
    return lines;
  } else {
    log('Failed to get peers', 'ERROR');
    log(result.output, 'ERROR');
    return [];
  }
}

async function checkConfigFile() {
  const configPath = `/etc/wireguard/${WG_INTERFACE}.conf`;
  log(`Checking config file: ${configPath}`, 'CHECK');
  
  const result = runCommand(`cat ${configPath}`);
  if (result.success) {
    log('Config file exists', 'SUCCESS');
    console.log(result.output);
    return true;
  } else {
    log('Config file does NOT exist', 'ERROR');
    log(result.output, 'ERROR');
    return false;
  }
}

async function checkDatabaseDevices() {
  log('Checking devices in Firestore...', 'CHECK');
  
  try {
    const snapshot = await db.collection('devices').where('status', '==', 'active').get();
    log(`Found ${snapshot.size} active device(s) in database`, 'SUCCESS');
    
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.device_name} (${data.ip_address})`);
      console.log(`    Public Key: ${data.public_key.substring(0, 20)}...`);
    });
    
    return snapshot.size;
  } catch (error) {
    log('Failed to query database', 'ERROR');
    log(error.message, 'ERROR');
    return 0;
  }
}

async function checkServerProcess() {
  log('Checking if server process is running...', 'CHECK');
  
  const result = runCommand('pgrep -f "node.*server"');
  if (result.success) {
    log('Server process is running', 'SUCCESS');
    log(`PID: ${result.output}`, 'INFO');
    return true;
  } else {
    log('Server process is NOT running', 'ERROR');
    return false;
  }
}

async function testAddPeer() {
  log('Testing peer addition...', 'CHECK');
  
  const { generateKeypair, addPeer } = await import('../services/wireguard.js');
  
  try {
    const { publicKey, privateKey } = generateKeypair();
    log(`Generated test keypair`, 'SUCCESS');
    console.log(`Public Key: ${publicKey}`);
    
    addPeer(publicKey, '10.0.0.254');
    log('Test peer added successfully', 'SUCCESS');
    
    // Cleanup
    const { removePeer } = await import('../services/wireguard.js');
    removePeer(publicKey);
    log('Test peer removed', 'SUCCESS');
    
    return true;
  } catch (error) {
    log('Failed to add test peer', 'ERROR');
    log(error.message, 'ERROR');
    return false;
  }
}

async function diagnose() {
  console.log('\n' + '='.repeat(60));
  log('WireGuard Peer Diagnostic Tool', 'CHECK');
  console.log('='.repeat(60) + '\n');
  
  const checks = {
    server: await checkServerProcess(),
    interface: await checkInterface(),
    config: await checkConfigFile(),
    peers: await checkPeers(),
    database: await checkDatabaseDevices(),
  };
  
  console.log('\n' + '='.repeat(60));
  log('Summary', 'CHECK');
  console.log('='.repeat(60));
  
  const results = [
    ['Server Process', checks.server],
    ['WireGuard Interface', checks.interface],
    ['Config File', checks.config],
    ['Peers Visible', checks.peers.length > 0],
    ['Database Devices', checks.database >= 0],
  ];
  
  results.forEach(([name, passed]) => {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${name}: ${passed ? 'OK' : 'FAILED'}`);
  });
  
  console.log('\n' + '='.repeat(60));
  log('Recommendations', 'CHECK');
  console.log('='.repeat(60));
  
  if (!checks.interface) {
    console.log('1. Start WireGuard interface:');
    console.log('   sudo wg-quick up wg0');
    console.log('   OR');
    console.log('   sudo systemctl start wg-quick@wg0\n');
  }
  
  if (!checks.config) {
    console.log('2. Create WireGuard config:');
    console.log('   sudo npm run setup:vpn\n');
  }
  
  if (checks.interface && checks.peers.length === 0 && checks.database > 0) {
    console.log('3. Peers in database but not in WireGuard!');
    console.log('   This indicates addPeer() is failing silently.');
    console.log('   Check server logs for details.\n');
  }
  
  console.log('='.repeat(60) + '\n');
}

// Run diagnosis
diagnose().catch(console.error);
