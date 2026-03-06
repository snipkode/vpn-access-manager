/**
 * Script untuk set admin role di Firestore
 * 
 * Usage:
 * node scripts/set-admin-firestore.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, updateDoc } = require('firebase/firestore');
const { getAuth } = require('firebase/auth');

// Firebase config
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Admin email
const ADMIN_EMAIL = 'solusikonsep@gmail.com';

async function setAdminRole() {
  try {
    console.log('🔍 Mencari user dengan email:', ADMIN_EMAIL);

    // Note: We need to find user by email via Admin SDK
    // For now, we'll use a workaround with client SDK
    // You need to know the UID or use Admin SDK
    
    console.log('\n⚠️  Client SDK tidak bisa query by email.');
    console.log('   Gunakan salah satu cara berikut:\n');
    
    console.log('📌 CARA 1: Via Firebase Console');
    console.log('   1. Buka https://console.firebase.google.com/');
    console.log('   2. Pilih project Anda');
    console.log('   3. Firestore Database');
    console.log('   4. Cari collection "users"');
    console.log('   5. Cari document dengan email:', ADMIN_EMAIL);
    console.log('   6. Edit field "role" menjadi "admin"');
    console.log('   7. Save\n');
    
    console.log('📌 CARA 2: Via Firebase Admin SDK (Backend)');
    console.log('   Jalankan script: node scripts/set-admin-role.js\n');
    
    console.log('📌 CARA 3: Via Browser Console (Quick)');
    console.log('   Buka browser console dan jalankan:\n');
    console.log('   ```javascript');
    console.log('   const { getFirestore, doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");');
    console.log('   // Ganti YOUR_UID dengan UID user Anda');
    console.log('   await updateDoc(doc(db, "users", "YOUR_UID"), { role: "admin" });');
    console.log('   ```\n');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

// Alternative: If you know the UID
async function setAdminByUID(uid) {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      console.log('✅ User ditemukan:', userDoc.data());
      
      await updateDoc(userRef, {
        role: 'admin',
        updatedAt: new Date().toISOString(),
      });
      
      console.log('✅ SUCCESS! Role admin di-set untuk UID:', uid);
    } else {
      console.log('❌ User tidak ditemukan. Membuat document baru...');
      
      await setDoc(userRef, {
        email: ADMIN_EMAIL,
        role: 'admin',
        vpn_enabled: true,
        createdAt: new Date().toISOString(),
      });
      
      console.log('✅ SUCCESS! User admin baru dibuat:', ADMIN_EMAIL);
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

// Run
setAdminRole();

// Export for manual use
module.exports = { setAdminByUID };
