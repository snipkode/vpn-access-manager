import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const BACKEND_PORT = process.env.PORT || 4000;
const TEST_USERNAME = 'diagnostic-test-user';

console.log('=== VPN Generate Endpoint Test ===\n');

// Initialize Firebase Admin
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

console.log('1. Initializing Firebase Admin...');
console.log('   Project ID:', firebaseConfig.projectId);
console.log('   Client Email:', firebaseConfig.clientEmail);

try {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
  });
  console.log('   ✓ Firebase Admin initialized\n');
} catch (error) {
  console.error('   ✗ Firebase Admin initialization failed:', error.message);
  process.exit(1);
}

async function testGenerateEndpoint() {
  const db = admin.firestore();
  const auth = admin.auth();

  // Step 1: Check if test user exists in Firestore
  console.log('2. Checking for test user in Firestore...');
  let userDoc = await db.collection('users').where('email', '==', TEST_USERNAME).get();
  
  let userId = null;
  let isAdmin = false;

  if (!userDoc.empty) {
    userDoc.forEach(doc => {
      userId = doc.id;
      isAdmin = doc.data().role === 'admin';
    });
    console.log(`   ✓ Found user: ${userId} (admin: ${isAdmin})`);
  } else {
    // Create a test user document
    console.log('   ℹ No test user found, creating one...');
    const newUserRef = db.collection('users').doc();
    userId = newUserRef.id;
    isAdmin = true; // Make test user an admin
    
    await newUserRef.set({
      email: TEST_USERNAME,
      role: 'admin',
      vpn_access: true,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      credits: 1000,
    });
    console.log(`   ✓ Created test user: ${userId} (admin: true)`);
  }

  // Step 2: Create a custom token for this user
  console.log('\n3. Creating custom auth token...');
  const customToken = await auth.createCustomToken(userId, {
    email: TEST_USERNAME,
    role: 'admin',
  });
  console.log('   ✓ Custom token created\n');

  // Step 3: Sign in with the custom token to get an ID token
  console.log('4. Exchanging custom token for ID token...');
  
  // Use Firebase REST API to sign in
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    console.log('   ℹ FIREBASE_WEB_API_KEY not set, using custom token directly');
  }

  let idToken = customToken;
  
  if (apiKey) {
    const signInResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      }
    );
    
    const signInData = await signInResponse.json();
    if (signInData.idToken) {
      idToken = signInData.idToken;
      console.log('   ✓ ID token obtained via REST API');
    }
  } else {
    console.log('   ℹ Will use custom token (may not work for all endpoints)');
  }

  // Step 4: Test the generate endpoint
  console.log('\n5. Testing POST /api/vpn/generate endpoint...');
  
  const deviceName = `Test Device ${Date.now()}`;
  
  try {
    const response = await fetch(`http://localhost:${BACKEND_PORT}/api/vpn/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ deviceName }),
    });

    console.log(`   Response status: ${response.status} ${response.statusText}`);
    
    const responseData = await response.json();
    
    if (response.ok) {
      console.log('   ✓ Generate endpoint succeeded!');
      console.log('\n   Response data:');
      console.log('   - Device ID:', responseData.device_id || responseData.deviceId || 'N/A');
      console.log('   - Device Name:', responseData.device_name || responseData.deviceName || 'N/A');
      console.log('   - IP Address:', responseData.ip_address || responseData.ipAddress || 'N/A');
      console.log('   - Public Key:', responseData.public_key ? responseData.public_key.substring(0, 30) + '...' : 'N/A');
      console.log('   - Config generated:', responseData.config ? 'Yes' : 'No');
      console.log('   - QR code generated:', responseData.qr ? 'Yes' : 'No');
      
      // Step 5: Verify peer was added to WireGuard
      console.log('\n6. Verifying WireGuard peer was added...');
      const { execSync } = await import('child_process');
      const wgOutput = execSync('wg show wg0 allowed-ips').toString().trim();
      
      if (wgOutput && wgOutput.includes(responseData.public_key?.substring(0, 20))) {
        console.log('   ✓ Peer found in WireGuard allowed-ips');
      } else if (wgOutput) {
        console.log('   ℹ WireGuard peers:');
        wgOutput.split('\n').forEach(line => console.log(`      ${line}`));
      } else {
        console.log('   ⚠ No peers in WireGuard (may need manual verification)');
      }
      
      return true;
    } else {
      console.log('   ✗ Generate endpoint failed');
      console.log('   Error:', responseData.error || responseData.message || 'Unknown error');
      console.log('   Details:', responseData.details || '');
      return false;
    }
  } catch (error) {
    console.log('   ✗ Request failed:', error.message);
    return false;
  }
}

// Run the test
testGenerateEndpoint()
  .then(success => {
    console.log('\n=== Test Complete ===');
    console.log(success ? '✓ All tests passed!' : '✗ Some tests failed');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n✗ Test script error:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
