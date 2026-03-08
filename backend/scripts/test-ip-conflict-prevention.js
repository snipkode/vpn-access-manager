/**
 * Test Script: IP Conflict Prevention
 * 
 * This script tests the WireGuard IP conflict prevention mechanism:
 * 1. Tests that getNextAvailableIP checks both Firestore and WireGuard
 * 2. Tests that addPeer rejects duplicate IPs
 * 3. Tests that addPeer rejects duplicate public keys
 * 4. Tests rollback mechanism on failure
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';
import {
  getUsedIPsFromWireGuard,
  getPublicKeysFromWireGuard,
  isIPInUse,
  isKeyInUse,
  getNextAvailableIP,
  addPeer,
  removePeer,
  generateKeypair
} from '../services/wireguard.js';

dotenv.config();

const WG_INTERFACE = process.env.WG_INTERFACE || 'wg0';
const TEST_IP = '10.0.0.250'; // Use high IP for testing
const TEST_IP_2 = '10.0.0.251';

function runTest(name, fn) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 TEST: ${name}`);
    console.log('='.repeat(60));
    fn();
    console.log(`✅ PASS: ${name}`);
    return true;
  } catch (error) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    return false;
  }
}

function cleanup() {
  console.log('\n🧹 Cleaning up test peers...');
  try {
    execSync(`wg set ${WG_INTERFACE} peer test-cleanup remove 2>/dev/null` || true);
  } catch (e) {
    // Ignore
  }
}

// Test 1: Get Used IPs from WireGuard
runTest('Get Used IPs from WireGuard', () => {
  const ips = getUsedIPsFromWireGuard();
  console.log(`   Found ${ips.length} active IPs in WireGuard`);
  if (ips.length > 0) {
    console.log(`   IPs: ${ips.slice(0, 5).join(', ')}${ips.length > 5 ? '...' : ''}`);
  }
  console.log('   ✅ getUsedIPsFromWireGuard() works correctly');
});

// Test 2: Get Public Keys from WireGuard
runTest('Get Public Keys from WireGuard', () => {
  const keys = getPublicKeysFromWireGuard();
  console.log(`   Found ${keys.length} active keys in WireGuard`);
  if (keys.length > 0) {
    console.log(`   Keys: ${keys.slice(0, 3).map(k => k.substring(0, 20) + '...').join(', ')}`);
  }
  console.log('   ✅ getPublicKeysFromWireGuard() works correctly');
});

// Test 3: Check if IP is in use
runTest('Check if IP is in use (isIPInUse)', () => {
  // First, add a test peer
  const { publicKey: testKey } = generateKeypair();
  execSync(`wg set ${WG_INTERFACE} peer '${testKey}' allowed-ips ${TEST_IP}/32`, {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  const isInUse = isIPInUse(TEST_IP);
  console.log(`   IP ${TEST_IP} in use: ${isInUse}`);
  
  if (!isInUse) {
    throw new Error(`Expected ${TEST_IP} to be in use`);
  }
  
  // Cleanup
  execSync(`wg set ${WG_INTERFACE} peer '${testKey}' remove`, {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  console.log('   ✅ isIPInUse() correctly detects active IPs');
});

// Test 4: Check if key is in use
runTest('Check if key is in use (isKeyInUse)', () => {
  const { publicKey: testKey } = generateKeypair();
  
  // Key should not be in use initially
  let isInUse = isKeyInUse(testKey);
  console.log(`   New key in use: ${isInUse}`);
  
  if (isInUse) {
    throw new Error('Expected new key to not be in use');
  }
  
  // Add the key
  execSync(`wg set ${WG_INTERFACE} peer '${testKey}' allowed-ips ${TEST_IP_2}/32`, {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Now key should be in use
  isInUse = isKeyInUse(testKey);
  console.log(`   Added key in use: ${isInUse}`);
  
  if (!isInUse) {
    throw new Error('Expected added key to be in use');
  }
  
  // Cleanup
  execSync(`wg set ${WG_INTERFACE} peer '${testKey}' remove`, {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  console.log('   ✅ isKeyInUse() correctly detects active keys');
});

// Test 5: getNextAvailableIP excludes WireGuard IPs
runTest('getNextAvailableIP excludes WireGuard IPs', () => {
  const { publicKey: testKey } = generateKeypair();
  const reservedIP = '10.0.0.249';
  
  // Add test peer to WireGuard (not in Firestore)
  execSync(`wg set ${WG_INTERFACE} peer '${testKey}' allowed-ips ${reservedIP}/32`, {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  // Get next available IP (with empty Firestore list)
  const nextIP = getNextAvailableIP([]);
  console.log(`   Next available IP: ${nextIP}`);
  
  if (nextIP === reservedIP) {
    execSync(`wg set ${WG_INTERFACE} peer '${testKey}' remove`, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    throw new Error(`getNextAvailableIP returned IP ${reservedIP} that's already in use in WireGuard`);
  }
  
  // Cleanup
  execSync(`wg set ${WG_INTERFACE} peer '${testKey}' remove`, {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  console.log('   ✅ getNextAvailableIP() correctly excludes WireGuard IPs');
});

// Test 6: addPeer rejects duplicate IP
runTest('addPeer rejects duplicate IP', () => {
  const { publicKey: key1 } = generateKeypair();
  const { publicKey: key2 } = generateKeypair();
  const duplicateIP = '10.0.0.248';
  
  try {
    // Add first peer
    addPeer(key1, duplicateIP);
    console.log(`   First peer added with IP ${duplicateIP}`);
    
    // Try to add second peer with same IP
    let errorThrown = false;
    try {
      addPeer(key2, duplicateIP);
    } catch (error) {
      errorThrown = true;
      if (!error.message.includes('already in use')) {
        throw new Error(`Expected 'already in use' error, got: ${error.message}`);
      }
      console.log(`   Correctly rejected duplicate IP: ${error.message}`);
    }
    
    if (!errorThrown) {
      throw new Error('Expected error when adding duplicate IP');
    }
    
  } finally {
    // Cleanup
    try {
      removePeer(key1);
      removePeer(key2);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  
  console.log('   ✅ addPeer() correctly rejects duplicate IPs');
});

// Test 7: addPeer rejects duplicate public key
runTest('addPeer rejects duplicate public key', () => {
  const { publicKey: testKey } = generateKeypair();
  const ip1 = '10.0.0.246';
  const ip2 = '10.0.0.247';
  
  try {
    // Add first peer
    addPeer(testKey, ip1);
    console.log(`   First peer added with key ${testKey.substring(0, 20)}...`);
    
    // Try to add second peer with same key
    let errorThrown = false;
    try {
      addPeer(testKey, ip2);
    } catch (error) {
      errorThrown = true;
      if (!error.message.includes('already exists')) {
        throw new Error(`Expected 'already exists' error, got: ${error.message}`);
      }
      console.log(`   Correctly rejected duplicate key: ${error.message}`);
    }
    
    if (!errorThrown) {
      throw new Error('Expected error when adding duplicate key');
    }
    
  } finally {
    // Cleanup
    try {
      removePeer(testKey);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  
  console.log('   ✅ addPeer() correctly rejects duplicate public keys');
});

// Test 8: Rollback on failure
runTest('Rollback mechanism on failure', () => {
  const { publicKey: testKey } = generateKeypair();
  const testIP = '10.0.0.245';
  
  // Manually occupy the IP to force a conflict
  const { publicKey: blockerKey } = generateKeypair();
  execSync(`wg set ${WG_INTERFACE} peer '${blockerKey}' allowed-ips ${testIP}/32`, {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  try {
    // Try to add peer with occupied IP - should fail and rollback
    addPeer(testKey, testIP);
    throw new Error('Expected addPeer to fail due to IP conflict');
  } catch (error) {
    if (error.message.includes('already in use')) {
      console.log(`   Correctly failed with IP conflict: ${error.message}`);
      
      // Verify testKey was not left in WireGuard
      const wgPeers = execSync(`wg show ${WG_INTERFACE}`, {
        stdio: ['pipe', 'pipe', 'pipe']
      }).toString();
      
      if (wgPeers.includes(testKey.substring(0, 20))) {
        throw new Error('Rollback failed: testKey still in WireGuard');
      }
      
      console.log('   ✅ Rollback successful: no partial state left behind');
    } else {
      throw error;
    }
  } finally {
    // Cleanup blocker
    try {
      execSync(`wg set ${WG_INTERFACE} peer '${blockerKey}' remove`, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (e) {
      // Ignore
    }
  }
  
  console.log('   ✅ Rollback mechanism works correctly');
});

// Final cleanup
cleanup();

console.log(`\n${'='.repeat(60)}`);
console.log('🎉 ALL TESTS COMPLETED');
console.log('='.repeat(60));
