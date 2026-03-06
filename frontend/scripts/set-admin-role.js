/**
 * Script untuk set admin role ke Firebase Custom Claims
 * 
 * Usage:
 * node scripts/set-admin-role.js
 */

const admin = require('firebase-admin');

// Load service account dari file atau environment
let serviceAccount;

try {
  // Coba load dari file
  serviceAccount = require('../serviceAccountKey.json');
} catch (error) {
  // Fallback ke environment variable
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Email admin yang akan di-set
const ADMIN_EMAIL = 'solusikonsep@gmail.com';

async function setAdminRole() {
  try {
    console.log('🔍 Mencari user dengan email:', ADMIN_EMAIL);

    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(ADMIN_EMAIL);
    
    console.log('✅ User ditemukan:');
    console.log('   UID:', userRecord.uid);
    console.log('   Email:', userRecord.email);
    console.log('   Display Name:', userRecord.displayName);

    // Set custom claims untuk admin
    console.log('\n⚙️  Setting admin role...');
    
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'admin',
    });

    console.log('✅ SUCCESS! Admin role telah di-set untuk:', ADMIN_EMAIL);
    console.log('\n📝 Langkah selanjutnya:');
    console.log('   1. Logout dari aplikasi frontend');
    console.log('   2. Login kembali dengan Google');
    console.log('   3. Cek console browser untuk verify role');
    console.log('   4. Dashboard admin akan muncul otomatis');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.error('\n💡 User dengan email', ADMIN_EMAIL, 'belum terdaftar.');
      console.error('   Silakan login dulu dengan email tersebut di frontend.');
    }
    
    process.exit(1);
  }
}

// Run script
setAdminRole();
