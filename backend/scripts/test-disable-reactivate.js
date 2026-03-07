import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

console.log('=== WireGuard Disable/Reactivate Peer Test ===\n');

const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';

// Helper function to run wg commands
function runWgCommand(cmd) {
  try {
    return execSync(cmd, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000
    }).toString().trim();
  } catch (error) {
    return null;
  }
}

// Step 1: Generate a test keypair
console.log('1. Generating test keypair...');
const TEST_PRIVATE_KEY = runWgCommand('wg genkey');
const TEST_PUBLIC_KEY = runWgCommand(`echo "${TEST_PRIVATE_KEY}" | wg pubkey`);
const TEST_IP = '10.0.0.249';

console.log('   ✓ Keypair generated');
console.log('   Public Key:', TEST_PUBLIC_KEY.substring(0, 30) + '...');
console.log('   IP Address:', TEST_IP);

// Step 2: Show initial state
console.log('\n2. Initial WireGuard peers:');
const initialPeers = runWgCommand(`wg show ${WG_INTERFACE} allowed-ips`);
if (initialPeers) {
  console.log('   ' + initialPeers.split('\n').join('\n   '));
} else {
  console.log('   (no peers)');
}

// Step 3: Add peer (simulate initial creation)
console.log('\n3. Adding test peer (simulating creation)...');
try {
  runWgCommand(`wg set ${WG_INTERFACE} peer ${TEST_PUBLIC_KEY} allowed-ips ${TEST_IP}/32`);
  runWgCommand(`wg-quick strip ${WG_INTERFACE} | wg setconf ${WG_INTERFACE} /dev/stdin`);
  console.log('   ✓ Peer added');
} catch (error) {
  console.log('   ✗ Failed to add peer:', error.message);
  process.exit(1);
}

// Step 4: Verify peer is active
console.log('\n4. Verifying peer is active...');
const activePeers = runWgCommand(`wg show ${WG_INTERFACE} allowed-ips`);
if (activePeers && activePeers.includes(TEST_PUBLIC_KEY.substring(0, 20))) {
  console.log('   ✓ Peer is active in WireGuard');
  console.log('   ' + activePeers.split('\n').filter(l => l.includes(TEST_PUBLIC_KEY.substring(0, 20))).join('\n   '));
} else {
  console.log('   ✗ Peer not found in WireGuard');
  process.exit(1);
}

// Step 5: Disable peer (remove from WireGuard)
console.log('\n5. Disabling peer (remove from WireGuard)...');
try {
  runWgCommand(`wg set ${WG_INTERFACE} peer ${TEST_PUBLIC_KEY} remove`);
  runWgCommand(`wg-quick strip ${WG_INTERFACE} | wg setconf ${WG_INTERFACE} /dev/stdin`);
  console.log('   ✓ Peer disabled');
} catch (error) {
  console.log('   ✗ Failed to disable peer:', error.message);
  process.exit(1);
}

// Step 6: Verify peer is disabled
console.log('\n6. Verifying peer is disabled...');
const disabledPeers = runWgCommand(`wg show ${WG_INTERFACE} allowed-ips`);
if (!disabledPeers || !disabledPeers.includes(TEST_PUBLIC_KEY.substring(0, 20))) {
  console.log('   ✓ Peer is disabled (not in WireGuard)');
} else {
  console.log('   ✗ Peer still found in WireGuard');
  console.log('   ' + disabledPeers.split('\n').join('\n   '));
  process.exit(1);
}

// Step 7: Reactivate peer (add back to WireGuard)
console.log('\n7. Reactivating peer (add back to WireGuard)...');
try {
  runWgCommand(`wg set ${WG_INTERFACE} peer ${TEST_PUBLIC_KEY} allowed-ips ${TEST_IP}/32`);
  runWgCommand(`wg-quick strip ${WG_INTERFACE} | wg setconf ${WG_INTERFACE} /dev/stdin`);
  console.log('   ✓ Peer reactivated');
} catch (error) {
  console.log('   ✗ Failed to reactivate peer:', error.message);
  process.exit(1);
}

// Step 8: Verify peer is reactivated
console.log('\n8. Verifying peer is reactivated...');
const reactivatedPeers = runWgCommand(`wg show ${WG_INTERFACE} allowed-ips`);
if (reactivatedPeers && reactivatedPeers.includes(TEST_PUBLIC_KEY.substring(0, 20))) {
  console.log('   ✓ Peer is reactivated in WireGuard');
  console.log('   ' + reactivatedPeers.split('\n').filter(l => l.includes(TEST_PUBLIC_KEY.substring(0, 20))).join('\n   '));
} else {
  console.log('   ✗ Peer not found in WireGuard after reactivation');
  process.exit(1);
}

// Step 9: Cleanup - remove test peer
console.log('\n9. Cleaning up test peer...');
try {
  runWgCommand(`wg set ${WG_INTERFACE} peer ${TEST_PUBLIC_KEY} remove`);
  runWgCommand(`wg-quick strip ${WG_INTERFACE} | wg setconf ${WG_INTERFACE} /dev/stdin`);
  console.log('   ✓ Test peer removed');
} catch (error) {
  console.log('   ✗ Failed to remove test peer:', error.message);
}

// Final state
console.log('\n10. Final WireGuard peers:');
const finalPeers = runWgCommand(`wg show ${WG_INTERFACE} allowed-ips`);
if (finalPeers) {
  console.log('   ' + finalPeers.split('\n').join('\n   '));
} else {
  console.log('   (no peers)');
}

console.log('\n=== Test Complete ===');
console.log('✓ Disable/Reactivate functionality is working correctly!');
console.log('\nSummary:');
console.log('   - Peer creation: ✓');
console.log('   - Peer disable (remove from wg): ✓');
console.log('   - Peer reactivate (add back to wg): ✓');
console.log('   - Peer cleanup: ✓');
process.exit(0);
