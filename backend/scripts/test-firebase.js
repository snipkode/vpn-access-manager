import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

console.log('Testing Firebase Admin SDK connection...\n');

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

console.log('Project ID:', firebaseConfig.projectId);
console.log('Client Email:', firebaseConfig.clientEmail);
console.log('Private Key loaded:', firebaseConfig.privateKey ? 'Yes' : 'No');
console.log('Private Key starts correctly:', firebaseConfig.privateKey?.startsWith('-----BEGIN PRIVATE KEY-----'));

try {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
  });

  const db = admin.firestore();
  
  // Test Firestore connection
  console.log('\n✓ Firebase Admin initialized successfully');
  
  // Quick Firestore test
  const testDoc = await db.collection('_test_connection').doc('test').get();
  console.log('✓ Firestore connection successful');
  
  // Test Auth
  const auth = admin.auth();
  console.log('✓ Auth service initialized');
  
  console.log('\n✅ All Firebase services are working correctly!\n');
  
  process.exit(0);
} catch (error) {
  console.error('\n❌ Firebase connection failed:', error.message);
  if (error.code) {
    console.error('Error code:', error.code);
  }
  process.exit(1);
}
