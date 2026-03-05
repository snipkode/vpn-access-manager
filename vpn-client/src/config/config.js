// App Branding Configuration
// Customize these values for your branding
export const branding = {
  // App Info
  appName: 'VPN Client Pro',
  appTagline: 'Secure WireGuard VPN',
  appVersion: '1.0.0',
  
  // Colors
  primaryColor: '#3b82f6',      // Blue - main brand color
  primaryDark: '#2563eb',       // Darker blue for press states
  secondaryColor: '#1e293b',    // Dark slate - cards
  accentColor: '#10b981',       // Green - success/connected
  errorColor: '#ef4444',        // Red - errors
  warningColor: '#f59e0b',      // Amber - warnings
  
  // Background colors
  backgroundColor: '#0f172a',   // Navy - main background
  cardBackground: '#1e293b',    // Dark slate - cards
  inputBackground: '#0f172a',   // Navy - inputs
  
  // Text colors
  textColor: '#f1f5f9',         // White - primary text
  textColorSecondary: '#94a3b8', // Gray - secondary text
  textColorMuted: '#64748b',    // Dark gray - muted text
  
  // Logo
  logoText: 'VPN',
  logoSubtext: 'Client Pro',
  logoIcon: '🔐',
  
  // Footer
  footerText: 'v1.0.0 - Secure VPN Access',
  websiteUrl: 'https://vpn-access.io',
  supportEmail: 'support@vpn-access.io',
  privacyUrl: 'https://vpn-access.io/privacy',
  
  // Connection status colors
  statusConnected: '#10b981',
  statusDisconnected: '#64748b',
  statusConnecting: '#f59e0b',
  statusError: '#ef4444',
};

// API Configuration
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// Firebase Configuration
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// WireGuard Configuration
export const wireguardConfig = {
  defaultMtu: 1420,
  defaultPort: 51820,
  keepaliveInterval: 25,
};
