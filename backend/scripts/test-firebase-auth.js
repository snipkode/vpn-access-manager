/**
 * Test script to verify Firebase Admin SDK connection and token verification
 * Usage: node scripts/test-firebase-auth.js <token>
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const TEST_TOKEN = process.argv[2];

console.log('🔍 Testing Firebase Admin SDK Configuration...\n');

// Test 1: Check environment variables
console.log('1️⃣ Environment Variables:');
console.log('   FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('   FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL);
console.log('   FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Present (' + process.env.FIREBASE_PRIVATE_KEY.length + ' chars)' : 'Missing');
console.log('');

// Test 2: Initialize Firebase Admin
console.log('2️⃣ Initializing Firebase Admin...');

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
  });
  console.log('   ✅ Firebase Admin initialized successfully\n');
} catch (error) {
  console.error('   ❌ Firebase Admin initialization failed:', error.message);
  process.exit(1);
}

const auth = admin.auth();
const db = admin.firestore();

// Test 3: Verify token if provided
if (TEST_TOKEN) {
  console.log('3️⃣ Verifying Token...\n');
  
  try {
    const decodedToken = await auth.verifyIdToken(TEST_TOKEN);
    console.log('   ✅ Token verified successfully!');
    console.log('   UID:', decodedToken.uid);
    console.log('   Email:', decodedToken.email);
    console.log('   Name:', decodedToken.name);
    console.log('   Issuer:', decodedToken.iss);
    console.log('   Audience:', decodedToken.aud);
    console.log('');
  } catch (error) {
    console.error('   ❌ Token verification failed:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('   ErrorInfo:', error.errorInfo);
    console.log('');
  }
} else {
  console.log('3️⃣ No token provided. Usage: node scripts/test-firebase-auth.js <token>\n');
}

// Test 4: Test Firestore connection
console.log('4️⃣ Testing Firestore connection...');

try {
  const testDoc = await db.collection('test_connection').doc('test').get();
  console.log('   ✅ Firestore connection successful\n');
} catch (error) {
  console.error('   ❌ Firestore connection failed:', error.message);
}

// Test 5: Check if user exists in Firestore
if (TEST_TOKEN) {
  console.log('5️⃣ Checking user in Firestore...');
  
  try {
    const decodedToken = await auth.verifyIdToken(TEST_TOKEN).catch(() => null);
    
    if (decodedToken) {
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        console.log('   ✅ User found in Firestore!');
        console.log('   Email:', userData.email);
        console.log('   Role:', userData.role);
        console.log('   VPN Enabled:', userData.vpn_enabled);
      } else {
        console.log('   ⚠️ User not found in Firestore (will be created on first login)');
      }
    } else {
      console.log('   ⚠️ Skipping user check (token verification failed)');
    }
  } catch (error) {
    console.error('   ❌ User check failed:', error.message);
  }
}

console.log('\n✅ Test completed\n');

process.exit(0);
