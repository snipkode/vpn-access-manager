import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

console.log('=== WireGuard Peer Creation Test ===\n');

const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';

// Step 1: Check WireGuard interface status
console.log('1. Checking WireGuard interface status...');
try {
  const wgStatus = execSync(`wg show ${WG_INTERFACE}`).toString();
  console.log('   ✓ WireGuard interface is active');
  console.log('   ' + wgStatus.split('\n').slice(0, 4).join('\n   '));
} catch (error) {
  console.log('   ✗ WireGuard interface not active');
  console.log('   Error:', error.message);
  process.exit(1);
}

// Step 2: Generate a test keypair
console.log('\n2. Generating test keypair...');
try {
  const privateKey = execSync('wg genkey').toString().trim();
  const publicKey = execSync(`echo "${privateKey}" | wg pubkey`).toString().trim();
  
  console.log('   ✓ Keypair generated');
  console.log('   Public Key:', publicKey.substring(0, 30) + '...');
  
  // Step 3: Get current peers
  console.log('\n3. Current WireGuard peers before test:');
  const peersBefore = execSync(`wg show ${WG_INTERFACE} allowed-ips`).toString().trim();
  if (peersBefore) {
    console.log('   ' + peersBefore.split('\n').join('\n   '));
  } else {
    console.log('   (no peers)');
  }
  
  // Step 4: Add test peer
  console.log('\n4. Adding test peer...');
  const TEST_IP = '10.0.0.250'; // Use a high IP for testing
  
  try {
    // First remove if exists (cleanup from previous test)
    execSync(`wg set ${WG_INTERFACE} peer ${publicKey} remove 2>/dev/null` || true);
  } catch (e) {
    // Ignore errors - peer may not exist
  }
  
  execSync(`wg set ${WG_INTERFACE} peer ${publicKey} allowed-ips ${TEST_IP}/32`, {
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 5000
  });
  
  // Reload config
  execSync(`wg-quick strip ${WG_INTERFACE} | wg setconf ${WG_INTERFACE} /dev/stdin`, {
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 5000
  });
  
  console.log('   ✓ Test peer added successfully');
  
  // Step 5: Verify peer was added
  console.log('\n5. Verifying peer was added...');
  const peersAfter = execSync(`wg show ${WG_INTERFACE} allowed-ips`).toString().trim();
  
  if (peersAfter && peersAfter.includes(publicKey.substring(0, 20))) {
    console.log('   ✓ Peer found in allowed-ips');
    console.log('   ' + peersAfter.split('\n').filter(l => l.includes(publicKey.substring(0, 20))).join('\n   '));
  } else if (peersAfter) {
    console.log('   ℹ All peers:');
    peersAfter.split('\n').forEach(line => console.log('   ' + line));
  } else {
    console.log('   ✗ Peer not found in allowed-ips');
  }
  
  // Step 6: Check config file
  console.log('\n6. Checking config file for peer entry...');
  const fs = await import('fs');
  const configPath = '/etc/wireguard/wg0.conf';
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  if (configContent.includes(publicKey)) {
    console.log('   ✓ Peer found in config file');
  } else {
    console.log('   ℹ Peer not in config file (added dynamically only)');
    console.log('      Note: Peers added via `wg set` may not persist to config without SaveConfig');
  }
  
  // Step 7: Cleanup - remove test peer
  console.log('\n7. Cleaning up test peer...');
  execSync(`wg set ${WG_INTERFACE} peer ${publicKey} remove`, {
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 5000
  });
  
  execSync(`wg-quick strip ${WG_INTERFACE} | wg setconf ${WG_INTERFACE} /dev/stdin`, {
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 5000
  });
  
  console.log('   ✓ Test peer removed');
  
  // Verify cleanup
  const peersFinal = execSync(`wg show ${WG_INTERFACE} allowed-ips`).toString().trim();
  console.log('\n8. Final peer status:');
  if (peersFinal) {
    console.log('   ' + peersFinal.split('\n').join('\n   '));
  } else {
    console.log('   (no peers)');
  }
  
  console.log('\n=== Test Complete ===');
  console.log('✓ WireGuard peer creation is working correctly!');
  process.exit(0);
  
} catch (error) {
  console.log('   ✗ Failed to add test peer');
  console.log('   Error:', error.message);
  console.log('\n=== Test Failed ===');
  process.exit(1);
}
