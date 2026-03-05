#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import os from 'os';
import net from 'net';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const logFile = path.join(rootDir, 'logs', 'setup-wireguard.log');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// State for rollback
const state = {
  backedUp: false,
  backupPath: null,
  changes: [],
};

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  // Ensure logs directory exists
  const logsDir = path.dirname(logFile);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  fs.appendFileSync(logFile, logMessage + '\n');
  
  // Console output with colors
  const colorMap = {
    'INFO': colors.blue,
    'SUCCESS': colors.green,
    'WARNING': colors.yellow,
    'ERROR': colors.red,
  };
  
  console.log(`${colorMap[level] || colors.reset}[${level}]${colors.reset} ${message}`);
}

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => resolve(answer));
  });
}

function runCommand(cmd, options = {}) {
  const { silent = false, ignoreError = false } = options;
  
  if (!silent) {
    log(`Executing: ${cmd}`, 'INFO');
  }
  
  try {
    const output = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (!silent) {
      log(`Command succeeded`, 'SUCCESS');
    }
    return output;
  } catch (error) {
    log(`Command failed: ${cmd}`, 'ERROR');
    log(error.stderr || error.message, 'ERROR');
    
    if (ignoreError) {
      return null;
    }
    throw new Error(`Command failed: ${cmd}\n${error.stderr || error.message}`);
  }
}

function checkRoot() {
  log('Checking root privileges...', 'INFO');
  
  const isRoot = process.geteuid && process.geteuid() === 0;
  if (!isRoot) {
    log('This script must be run as root (sudo)', 'ERROR');
    log('Usage: sudo npm run setup:vpn', 'WARNING');
    process.exit(1);
  }
  
  log('Running as root', 'SUCCESS');
}

function getOSInfo() {
  const platform = os.platform();
  
  if (platform !== 'linux') {
    return { supported: false, message: `Unsupported platform: ${platform}` };
  }
  
  try {
    // Try to read /etc/os-release
    const osRelease = fs.readFileSync('/etc/os-release', 'utf-8');
    const idMatch = osRelease.match(/^ID=(.+)/m);
    const id = idMatch ? idMatch[1].replace(/"/g, '') : null;
    
    const supportedDistros = ['ubuntu', 'debian', 'centos', 'rhel', 'fedora', 'almalinux', 'rocky'];
    
    if (id && supportedDistros.includes(id.toLowerCase())) {
      return {
        supported: true,
        platform: 'linux',
        distro: id.toLowerCase(),
        packageManager: ['centos', 'rhel', 'fedora', 'almalinux', 'rocky'].includes(id.toLowerCase()) ? 'yum' : 'apt',
      };
    }
    
    return {
      supported: true,
      platform: 'linux',
      distro: 'unknown',
      packageManager: 'apt', // Default to apt
    };
  } catch {
    return {
      supported: true,
      platform: 'linux',
      distro: 'unknown',
      packageManager: 'apt',
    };
  }
}

function preFlightChecks() {
  log('Running pre-flight checks...', 'INFO');
  
  const issues = [];
  
  // Check if port 51820 is already in use
  try {
    const result = runCommand('ss -tuln | grep :51820 || netstat -tuln | grep :51820', { silent: true, ignoreError: true });
    if (result) {
      issues.push('Port 51820 is already in use');
    }
  } catch {
    // Ignore, port check not critical
  }
  
  // Check if wg0 interface already exists
  try {
    runCommand('ip link show wg0', { silent: true });
    log('WireGuard interface wg0 already exists', 'WARNING');
  } catch {
    log('WireGuard interface wg0 does not exist (OK)', 'SUCCESS');
  }
  
  // Check disk space
  const freeSpace = fs.statfsSync('/').bavail * fs.statfsSync('/').bsize;
  if (freeSpace < 100 * 1024 * 1024) { // Less than 100MB
    issues.push('Low disk space (< 100MB free)');
  }
  
  if (issues.length > 0) {
    log('Pre-flight checks found issues:', 'WARNING');
    issues.forEach(issue => log(`  - ${issue}`, 'WARNING'));
  } else {
    log('Pre-flight checks passed', 'SUCCESS');
  }
  
  return issues;
}

function checkWireGuard(osInfo) {
  log('Checking WireGuard installation...', 'INFO');
  
  try {
    runCommand('wg --version', { silent: true });
    log('WireGuard is already installed', 'SUCCESS');
    return true;
  } catch {
    log('WireGuard not found', 'WARNING');
  }
  
  log('Installing WireGuard...', 'INFO');
  
  try {
    if (osInfo.packageManager === 'apt') {
      runCommand('apt update', { silent: false });
      runCommand('DEBIAN_FRONTEND=noninteractive apt install -y wireguard qrencode', { silent: false });
    } else if (osInfo.packageManager === 'yum') {
      runCommand('yum install -y epel-release', { silent: false });
      runCommand('yum install -y wireguard-tools qrencode', { silent: false });
    }
    
    log('WireGuard installed successfully', 'SUCCESS');
    return true;
  } catch (error) {
    log(`Failed to install WireGuard: ${error.message}`, 'ERROR');
    log('Please install WireGuard manually:', 'WARNING');
    log('  Ubuntu/Debian: sudo apt update && sudo apt install -y wireguard', 'WARNING');
    log('  CentOS/RHEL: sudo yum install -y epel-release && sudo yum install -y wireguard-tools', 'WARNING');
    return false;
  }
}

function backupExistingConfig() {
  const wgConfigPath = '/etc/wireguard/wg0.conf';
  
  if (fs.existsSync(wgConfigPath)) {
    log('Existing WireGuard config found, creating backup...', 'WARNING');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    state.backupPath = `/etc/wireguard/wg0.conf.backup.${timestamp}`;
    
    try {
      fs.copyFileSync(wgConfigPath, state.backupPath);
      state.backedUp = true;
      log(`Backup created: ${state.backupPath}`, 'SUCCESS');
    } catch (error) {
      log(`Failed to create backup: ${error.message}`, 'ERROR');
    }
  }
  
  // Backup existing .env
  if (fs.existsSync(envPath)) {
    const envBackupPath = `${envPath}.backup.${new Date().toISOString().replace(/[:.]/g, '-')}`;
    try {
      fs.copyFileSync(envPath, envBackupPath);
      log(`.env backup created: ${envBackupPath}`, 'SUCCESS');
    } catch (error) {
      log(`Failed to backup .env: ${error.message}`, 'ERROR');
    }
  }
}

function rollback() {
  log('Rolling back changes...', 'WARNING');
  
  if (state.backedUp && state.backupPath) {
    try {
      fs.copyFileSync(state.backupPath, '/etc/wireguard/wg0.conf');
      log('WireGuard config restored from backup', 'SUCCESS');
    } catch (error) {
      log(`Failed to restore WireGuard config: ${error.message}`, 'ERROR');
    }
  }
  
  // Stop WireGuard if it was started
  runCommand('wg-quick down wg0 2>/dev/null || true', { silent: true, ignoreError: true });
  
  log('Rollback completed', 'INFO');
}

function generateKeys() {
  log('Generating WireGuard keypair...', 'INFO');
  
  try {
    const privateKey = runCommand('wg genkey', { silent: true });
    const publicKey = runCommand(`echo "${privateKey}" | wg pubkey`, { silent: true });
    
    log('Keypair generated successfully', 'SUCCESS');
    return { privateKey, publicKey };
  } catch (error) {
    log(`Failed to generate keypair: ${error.message}`, 'ERROR');
    throw error;
  }
}

function isValidIP(ip) {
  return net.isIP(ip) === 4 || net.isIP(ip) === 6 || /^[a-zA-Z0-9.-]+$/.test(ip);
}

function getServerIP() {
  log('Detecting server public IP...', 'INFO');
  
  const methods = [
    'curl -s --max-time 5 ifconfig.me',
    'curl -s --max-time 5 ipinfo.io/ip',
    'curl -s --max-time 5 icanhazip.com',
    'curl -s --max-time 5 api.ipify.org',
  ];
  
  for (const method of methods) {
    try {
      const ip = runCommand(method, { silent: true, ignoreError: true });
      if (ip && isValidIP(ip)) {
        log(`Public IP detected: ${ip}`, 'SUCCESS');
        return ip;
      }
    } catch {
      continue;
    }
  }
  
  log('Could not auto-detect public IP', 'WARNING');
  return null;
}

function getNetworkInterface() {
  try {
    const iface = runCommand("ip route | grep default | awk '{print $5}' | head -1", { silent: true });
    if (iface) {
      log(`Default network interface: ${iface}`, 'SUCCESS');
      return iface;
    }
  } catch {
    // Ignore
  }
  
  const ifaces = os.networkInterfaces();
  for (const [name, details] of Object.entries(ifaces)) {
    if (name !== 'lo' && details.some(d => d.family === 'IPv4' && !d.internal)) {
      log(`Using network interface: ${name}`, 'INFO');
      return name;
    }
  }
  
  return 'eth0';
}

function configureFirewall() {
  log('Configuring firewall...', 'INFO');
  
  // Try UFW first
  try {
    runCommand('ufw status', { silent: true });
    log('UFW detected, adding WireGuard rule...', 'INFO');
    runCommand('ufw allow 51820/udp', { silent: false });
    log('Firewall rule added (UFW)', 'SUCCESS');
    return;
  } catch {
    // UFW not available, try firewalld
  }
  
  try {
    runCommand('systemctl is-active firewalld', { silent: true });
    log('firewalld detected, adding WireGuard rule...', 'INFO');
    runCommand('firewall-cmd --permanent --add-port=51820/udp', { silent: false });
    runCommand('firewall-cmd --reload', { silent: false });
    log('Firewall rule added (firewalld)', 'SUCCESS');
    return;
  } catch {
    // firewalld not available
  }
  
  log('No firewall management tool detected, skipping firewall configuration', 'WARNING');
  log('Make sure port 51820/UDP is open in your firewall', 'WARNING');
}

async function promptForIP(autoDetectedIP) {
  console.log(`\n${colors.cyan}Server IP Configuration${colors.reset}`);
  console.log(`Auto-detected IP: ${autoDetectedIP || colors.yellow + 'not found' + colors.reset}`);
  
  let serverIP = null;
  
  while (!serverIP) {
    const input = await question('\nEnter server IP/hostname (or press Enter for auto-detected): ');
    
    if (input.trim() === '') {
      if (autoDetectedIP) {
        serverIP = autoDetectedIP;
      } else {
        log('No IP auto-detected, please enter manually', 'WARNING');
        continue;
      }
    } else {
      const trimmedInput = input.trim();
      if (isValidIP(trimmedInput)) {
        serverIP = trimmedInput;
      } else {
        log('Invalid IP/hostname format', 'ERROR');
      }
    }
  }
  
  return serverIP;
}

function updateEnvFile(publicKey, serverIP) {
  log('Updating .env file...', 'INFO');
  
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  } else {
    // Create minimal .env if it doesn't exist
    envContent = `PORT=3000

# Firebase Admin SDK
FIREBASE_PROJECT_ID=e-landing
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@e-landing.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYOUR_PRIVATE_KEY\\n-----END PRIVATE KEY-----\\n"

# WireGuard Config
WG_INTERFACE=wg0
WG_DNS=1.1.1.1
WG_SUBNET=10.0.0.0/24
`;
  }

  const envVars = {
    WG_SERVER_PUBLIC_KEY: publicKey,
    WG_SERVER_ENDPOINT: `${serverIP}:51820`,
  };

  for (const [key, value] of Object.entries(envVars)) {
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, envContent, { mode: 0o600 });
  log('.env file updated', 'SUCCESS');
}

function createWireGuardConfig(privateKey, networkInterface) {
  log('Creating WireGuard configuration...', 'INFO');
  
  const wgConfig = `# WireGuard Server Configuration
# Generated by setup-wireguard.js
# Created: ${new Date().toISOString()}

[Interface]
PrivateKey = ${privateKey}
Address = 10.0.0.1/24
ListenPort = 51820
SaveConfig = true

# Enable IP forwarding and NAT
PostUp = iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -o ${networkInterface} -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -o ${networkInterface} -j MASQUERADE

# Client configurations will be added here by the application
# Example:
# [Peer]
# PublicKey = <client-public-key>
# AllowedIPs = 10.0.0.2/32
# PersistentKeepalive = 25
`;

  const wgConfigPath = '/etc/wireguard/wg0.conf';
  fs.writeFileSync(wgConfigPath, wgConfig, { mode: 0o600 });
  log(`WireGuard config created: ${wgConfigPath}`, 'SUCCESS');
}

function enableIPForwarding() {
  log('Enabling IP forwarding...', 'INFO');
  
  try {
    runCommand('sysctl -w net.ipv4.ip_forward=1', { silent: false });
    
    const sysctlConf = '/etc/sysctl.d/99-wireguard.conf';
    const sysctlContent = '# Enable IP forwarding for WireGuard\nnet.ipv4.ip_forward=1\n';
    
    if (!fs.existsSync(sysctlConf)) {
      fs.writeFileSync(sysctlConf, sysctlContent, { mode: 0o644 });
      log('IP forwarding enabled permanently', 'SUCCESS');
    } else {
      log('IP forwarding already configured', 'INFO');
    }
  } catch (error) {
    log(`Failed to enable IP forwarding: ${error.message}`, 'ERROR');
    throw error;
  }
}

function startWireGuard() {
  log('Starting WireGuard service...', 'INFO');
  
  try {
    // Check if wg-quick is available
    runCommand('which wg-quick', { silent: true });
    
    // Stop if already running
    runCommand('wg-quick down wg0 2>/dev/null || true', { silent: true, ignoreError: true });
    
    // Start WireGuard
    runCommand('wg-quick up wg0', { silent: false });
    log('WireGuard started', 'SUCCESS');
    
    // Enable on boot
    try {
      runCommand('systemctl enable wg-quick@wg0', { silent: false });
      log('WireGuard enabled on boot', 'SUCCESS');
    } catch {
      log('Could not enable WireGuard on boot (systemctl not available)', 'WARNING');
    }
    
    // Show status
    try {
      const status = runCommand('wg show wg0', { silent: true });
      console.log(`\n${colors.cyan}WireGuard Status:${colors.reset}`);
      console.log(status);
    } catch {
      // Ignore status check errors
    }
    
    return true;
  } catch (error) {
    log(`Failed to start WireGuard: ${error.message}`, 'ERROR');
    log('You can start it manually: sudo wg-quick up wg0', 'WARNING');
    return false;
  }
}

function testConnectivity(serverIP) {
  log('Testing server connectivity...', 'INFO');
  
  try {
    // Test if the server IP is reachable
    runCommand(`ping -c 1 -W 2 ${serverIP}`, { silent: true, ignoreError: true });
    log('Server IP is reachable', 'SUCCESS');
  } catch {
    log('Could not verify server IP connectivity', 'WARNING');
  }
}

async function main() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════╗`);
  console.log(`║   WireGuard VPN Server Setup Script    ║`);
  console.log(`╚════════════════════════════════════════╝${colors.reset}\n`);
  
  log('This script will configure a WireGuard VPN server\n', 'INFO');
  
  // Pre-flight
  checkRoot();
  const osInfo = getOSInfo();
  log(`Detected OS: ${osInfo.distro || 'Linux'} (${osInfo.packageManager})`, 'INFO');
  
  const issues = preFlightChecks();
  if (issues.some(i => i.includes('port'))) {
    const confirm = await question('\n⚠️  Port 51820 is already in use. Continue anyway? [y/N]: ');
    if (confirm.toLowerCase() !== 'y') {
      log('Setup cancelled by user', 'WARNING');
      process.exit(0);
    }
  }
  
  // Backup
  backupExistingConfig();
  
  // Install WireGuard
  if (!checkWireGuard(osInfo)) {
    process.exit(1);
  }
  
  // Generate keys
  const { privateKey, publicKey } = generateKeys();
  console.log(`\n${colors.cyan}Server Public Key:${colors.reset} ${publicKey}`);
  
  // Get server IP
  const autoDetectedIP = getServerIP();
  const serverIP = await promptForIP(autoDetectedIP);
  
  // Confirm configuration
  console.log(`\n${colors.yellow}Configuration Summary:${colors.reset}`);
  console.log(`  Server IP: ${serverIP}`);
  console.log(`  Port: 51820/UDP`);
  console.log(`  Subnet: 10.0.0.0/24`);
  console.log(`  DNS: 1.1.1.1`);
  
  const confirm = await question('\nProceed with this configuration? [Y/n]: ');
  if (confirm.toLowerCase() === 'n') {
    log('Setup cancelled by user', 'WARNING');
    process.exit(0);
  }
  
  // Apply configuration
  try {
    const networkInterface = getNetworkInterface();
    
    updateEnvFile(publicKey, serverIP);
    createWireGuardConfig(privateKey, networkInterface);
    enableIPForwarding();
    configureFirewall();
    
    const started = startWireGuard();
    
    if (started) {
      testConnectivity(serverIP);
    }
    
    // Success summary
    console.log(`\n${colors.green}╔════════════════════════════════════════╗`);
    console.log(`║     WireGuard Setup Complete! ✓        ║`);
    console.log(`╚════════════════════════════════════════╝${colors.reset}\n`);
    
    console.log(`${colors.cyan}Summary:${colors.reset}`);
    console.log(`  Server Public Key: ${publicKey}`);
    console.log(`  Server Endpoint: ${serverIP}:51820`);
    console.log(`  Config File: /etc/wireguard/wg0.conf`);
    console.log(`  Environment: ${envPath}`);
    console.log(`  Log File: ${logFile}`);
    
    if (state.backedUp) {
      console.log(`  Backup: ${state.backupPath}`);
    }
    
    console.log(`\n${colors.cyan}Next Steps:${colors.reset}`);
    console.log(`  1. Start the backend: ${colors.gray}npm start${colors.reset}`);
    console.log(`  2. Access admin panel to create VPN users`);
    console.log(`  3. Verify firewall: ${colors.gray}sudo ufw status${colors.reset}`);
    console.log(`  4. Test connection from client device\n`);
    
  } catch (error) {
    log(`Setup failed: ${error.message}`, 'ERROR');
    console.log(`\n${colors.red}Setup failed!${colors.reset} See log: ${logFile}`);
    
    const rollbackConfirm = await question('\nAttempt to rollback changes? [Y/n]: ');
    if (rollbackConfirm.toLowerCase() !== 'n') {
      rollback();
    }
    
    process.exit(1);
  }
  
  rl.close();
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log(`\n\n${colors.yellow}Setup interrupted by user${colors.reset}`);
  
  if (state.backedUp) {
    rl.question('Rollback changes? [Y/n]: ', (answer) => {
      if (answer.toLowerCase() !== 'n') {
        rollback();
      }
      rl.close();
      process.exit(130);
    });
  } else {
    rl.close();
    process.exit(130);
  }
});

main().catch((error) => {
  console.error(`\n${colors.red}Fatal error:${colors.reset}`, error.message);
  log(`Fatal error: ${error.message}`, 'ERROR');
  log(error.stack, 'ERROR');
  rl.close();
  process.exit(1);
});
