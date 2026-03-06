import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';

// Read .env file directly to avoid caching issues
const envContent = fs.readFileSync('.env', 'utf8');
const keyMatch = envContent.match(/FIREBASE_PRIVATE_KEY="(.+)"/);
const projectIdMatch = envContent.match(/FIREBASE_PROJECT_ID=(.+)/);
const clientEmailMatch = envContent.match(/FIREBASE_CLIENT_EMAIL=(.+)/);

const firebaseConfig = {
  projectId: projectIdMatch ? projectIdMatch[1].trim() : process.env.FIREBASE_PROJECT_ID,
  clientEmail: clientEmailMatch ? clientEmailMatch[1].trim() : process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: keyMatch ? keyMatch[1].replace(/\\n/g, '\n') : process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
});

export const auth = admin.auth();
export const db = admin.firestore();
