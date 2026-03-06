import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load dotenv fresh
import('dotenv').then((dotenv) => {
  dotenv.config();
  
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  console.log('=== Fresh Environment Load ===');
  console.log('Project ID:', projectId);
  console.log('Client Email:', clientEmail);
  console.log('Private Key ID in key:', privateKey?.substring(60, 100));
  
  // Check key ID
  const keyId = privateKey?.includes('ChblNNZelbqxcR') ? 'NEW KEY (76391b7e)' : 
                privateKey?.includes('0kU+OtMz7w9cM') ? 'OLD KEY' : 'UNKNOWN';
  console.log('Key identifier:', keyId);
  
  import('firebase-admin').then((admin) => {
    const firebaseConfig = {
      projectId,
      clientEmail,
      privateKey: privateKey?.replace(/\\n/g, '\n'),
    };
    
    admin.default.initializeApp({
      credential: admin.default.credential.cert(firebaseConfig),
    });
    
    console.log('\n✓ Firebase Admin initialized');
    
    // Test token generation
    return admin.default.credential.cert(firebaseConfig).getAccessToken();
  }).then((token) => {
    console.log('✓ Access token generated:', token.access_token.substring(0, 50) + '...');
    console.log('\n✅ SUCCESS: New service account is working!\n');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  });
});
