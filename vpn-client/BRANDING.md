# 📱 VPN Client Pro - Branding Guide

Custom WireGuard VPN client mobile app dengan full branding customization.

## 🎨 Quick Branding Setup

### 1. Edit Config File

Buka `src/config/config.js` dan customize:

```javascript
export const branding = {
  // App Info
  appName: 'Your VPN App',         // Nama aplikasi
  appTagline: 'Your Tagline',      // Tagline
  appVersion: '1.0.0',             // Version
  
  // Colors
  primaryColor: '#your-color',     // Main brand color
  secondaryColor: '#your-color',   // Card backgrounds
  accentColor: '#your-color',      // Success states
  backgroundColor: '#your-color',  // Main background
  
  // Logo
  logoText: 'Your',
  logoSubtext: 'VPN',
  logoIcon: '🔐',                  // Or use image
  
  // Contact
  supportEmail: 'support@your.io',
  websiteUrl: 'https://your.io',
};
```

### 2. Update App Configuration

Edit `app.json`:

```json
{
  "expo": {
    "name": "Your VPN App",
    "slug": "your-vpn-app",
    "icon": "./assets/icon.png",
    "ios": {
      "bundleIdentifier": "com.yourcompany.vpn"
    },
    "android": {
      "package": "com.yourcompany.vpn"
    }
  }
}
```

## 🎨 Color Scheme Template

### Blue Theme (Default)
```javascript
primaryColor: '#3b82f6'
secondaryColor: '#1e293b'
accentColor: '#10b981'
backgroundColor: '#0f172a'
```

### Purple Theme
```javascript
primaryColor: '#8b5cf6'
secondaryColor: '#1e1b4b'
accentColor: '#a78bfa'
backgroundColor: '#0f0a2e'
```

### Green Theme
```javascript
primaryColor: '#10b981'
secondaryColor: '#064e3b'
accentColor: '#34d399'
backgroundColor: '#022c22'
```

### Red Theme
```javascript
primaryColor: '#ef4444'
secondaryColor: '#450a0a'
accentColor: '#f87171'
backgroundColor: '#2a0a0a'
```

### Dark/Black Theme
```javascript
primaryColor: '#ffffff'
secondaryColor: '#1a1a1a'
accentColor: '#4ade80'
backgroundColor: '#000000'
```

## 📐 Asset Requirements

### App Icon
- **Size**: 1024x1024 px
- **Format**: PNG dengan transparency
- **Shape**: Square (akan di-round otomatis)

### Splash Screen
- **Size**: 2048x2048 px
- **Format**: PNG
- **Background**: Match branding color

### Adaptive Icon (Android)
- **Size**: 1024x1024 px
- **Safe Zone**: 66% center area

## 🔧 Advanced Customization

### Custom Logo with Image

Edit `app/index.js`:

```javascript
import { Image } from 'react-native';

// Replace emoji logo with image
<Image 
  source={require('../assets/logo.png')}
  style={{ width: 100, height: 100 }}
  resizeMode="contain"
/>
```

### Custom Connection UI

Edit connection button styles:

```javascript
const customStyles = {
  connectButton: {
    backgroundColor: branding.primaryColor,
    borderRadius: 30,  // More rounded
    height: 80,        // Taller
  },
};
```

### Add Custom Screens

1. Create new screen in `app/your-screen.js`
2. Add to `_layout.js` navigation
3. Add navigation button in main screen

## 📦 Build & Deploy

### Setup

```bash
cd vpn-client
npm install
cp .env.example .env
# Edit .env with your config
```

### Development

```bash
npm start
# Scan QR code dengan Expo Go
```

### Build Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build Android
eas build --platform android

# Build iOS
eas build --platform ios
```

### Submit to Stores

```bash
# Google Play
eas submit --platform android

# App Store
eas submit --platform ios
```

## 🔐 Environment Variables

Create `.env`:

```env
EXPO_PUBLIC_API_URL=http://your-api.com/api
EXPO_PUBLIC_FIREBASE_API_KEY=your-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

## 📱 Screen Overview

| Screen | Function |
|--------|----------|
| **Home** | Connect/Disconnect VPN |
| **Configs** | Manage VPN configurations |
| **Settings** | App settings & info |

## 🎯 Features

- ✅ One-tap Connect/Disconnect
- ✅ Import .conf files
- ✅ Multiple tunnel support
- ✅ Real-time data transfer stats
- ✅ Connection duration timer
- ✅ Dark theme UI
- ✅ Fully customizable branding
- ✅ Cross-platform (iOS/Android)

## 💡 Tips

1. **Test Colors**: Preview di light & dark mode
2. **Icon Safety**: Gunakan safe zone untuk adaptive icons
3. **Brand Consistency**: Same colors di semua screens
4. **Performance**: Optimize image sizes
5. **Accessibility**: Ensure good color contrast

## 📄 License

MIT License

---

**WireGuard®** is a registered trademark of Jason A. Donenfeld.
