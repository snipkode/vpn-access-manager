import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate Firebase configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('❌ Firebase configuration is missing! Check .env.local file');
  console.error('Current config:', {
    apiKey: firebaseConfig.apiKey ? '✅' : '❌',
    authDomain: firebaseConfig.authDomain ? '✅' : '❌',
    projectId: firebaseConfig.projectId ? '✅' : '❌',
  });
}

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    // App already initialized, get existing instance
    app = initializeApp(firebaseConfig, 'secondary');
  } else {
    console.error('Failed to initialize Firebase:', error);
    throw error;
  }
}

// Initialize services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Set persistence to handle storage issues
auth.setPersistence(browserLocalPersistence).catch((error) => {
  console.warn('Failed to set auth persistence:', error);
});
