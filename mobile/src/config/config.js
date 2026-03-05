// Firebase Configuration
// Replace with your actual Firebase config
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// API Configuration
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// App Branding Configuration
// Customize these values for your branding
export const branding = {
  appName: 'VPN Access Client',
  appTagline: 'Secure WireGuard VPN',
  primaryColor: '#3b82f6',
  secondaryColor: '#1e293b',
  accentColor: '#10b981',
  backgroundColor: '#0f172a',
  textColor: '#f1f5f9',
  textColorSecondary: '#94a3b8',
  logoText: 'VPN',
  logoSubtext: 'Access',
  footerText: 'v1.0.0 - Secure VPN Access',
  websiteUrl: 'https://vpn-access.io',
  supportEmail: 'support@vpn-access.io',
};
