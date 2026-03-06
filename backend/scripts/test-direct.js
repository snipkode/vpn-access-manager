import fs from 'fs';
import admin from 'firebase-admin';

// Read .env file directly
const envContent = fs.readFileSync('.env', 'utf8');
const keyMatch = envContent.match(/FIREBASE_PRIVATE_KEY="(.+)"/);
const privateKeyRaw = keyMatch ? keyMatch[1] : null;

const config = {
  projectId: 'e-landing',
  clientEmail: 'firebase-adminsdk-fbsvc@e-landing.iam.gserviceaccount.com',
  privateKey: privateKeyRaw?.replace(/\\n/g, '\n'),
};

console.log('=== Direct File Read Test ===');
console.log('Project ID:', config.projectId);
console.log('Client Email:', config.clientEmail);
console.log('Private Key loaded:', config.privateKey ? 'Yes' : 'No');
console.log('Key contains ChblNNZelbqxcR:', config.privateKey?.includes('ChblNNZelbqxcR'));
console.log('Key preview (60-100):', config.privateKey?.substring(60, 100));

try {
  admin.initializeApp({
    credential: admin.credential.cert(config),
  });
  
  console.log('\n✓ Firebase Admin initialized');
  
  const token = await admin.credential.cert(config).getAccessToken();
  console.log('✓ Access token generated successfully');
  console.log('Token (first 50):', token.access_token.substring(0, 50) + '...');
  console.log('\n✅ SUCCESS: New service account is working!\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  if (error.code) console.error('Error code:', error.code);
  process.exit(1);
}
