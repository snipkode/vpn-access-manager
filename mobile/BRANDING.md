# 📱 VPN Access Mobile - Branding Guide

Custom branding untuk React Native Expo mobile app.

## 🎨 Custom Branding

### 1. Konfigurasi Utama

Edit file `src/config/config.js`:

```javascript
export const branding = {
  appName: 'Your VPN App',        // Nama aplikasi
  appTagline: 'Secure VPN',        // Tagline
  primaryColor: '#3b82f6',         // Warna utama
  secondaryColor: '#1e293b',       // Warna sekunder
  accentColor: '#10b981',          // Warna accent
  backgroundColor: '#0f172a',      // Background
  textColor: '#f1f5f9',            // Text primary
  textColorSecondary: '#94a3b8',   // Text secondary
  logoText: 'Your',                // Logo text line 1
  logoSubtext: 'VPN',              // Logo text line 2
  footerText: 'v1.0.0',            // Footer text
  websiteUrl: 'https://your.io',   // Website URL
  supportEmail: 'support@your.io', // Support email
};
```

### 2. App Configuration

Edit `app.json`:

```json
{
  "expo": {
    "name": "Your VPN App",
    "slug": "your-vpn-app",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "backgroundColor": "#0f172a"
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.vpn"
    },
    "android": {
      "package": "com.yourcompany.vpn"
    }
  }
}
```

### 3. Asset Requirements

#### Icon (assets/icon.png)
- **Size**: 1024x1024 px
- **Format**: PNG dengan transparency
- **Shape**: Square dengan rounded corners (akan di-auto round oleh OS)

#### Splash Screen (assets/splash.png)
- **Size**: 2048x2048 px
- **Format**: PNG
- **Background**: Sesuai branding color

#### Adaptive Icon (assets/adaptive-icon.png)
- **Size**: 1024x1024 px
- **Format**: PNG dengan transparency
- **Safe zone**: Konten penting di tengah 66%

#### Favicon (assets/favicon.png)
- **Size**: 48x48 px
- **Format**: PNG

## 🛠️ Membuat Assets

### Menggunakan Canva
1. Buat design 1024x1024 px
2. Export sebagai PNG
3. Resize untuk berbagai kebutuhan

### Menggunakan Figma
1. Buat frame 1024x1024
2. Design icon dengan safe zone
3. Export sebagai PNG

### Template Colors

```
Primary:    #3b82f6 (Blue)
Secondary:  #1e293b (Dark Slate)
Accent:     #10b981 (Green)
Background: #0f172a (Navy)
Text:       #f1f5f9 (White)
```

## 📦 Build & Deploy

### Setup

```bash
cd mobile
npm install
cp .env.example .env
# Edit .env dengan Firebase config
```

### Development

```bash
npm start
# Scan QR code dengan Expo Go app
```

### Build untuk Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build untuk Android
eas build --platform android

# Build untuk iOS
eas build --platform ios
```

### Submit ke Store

```bash
# Submit ke Google Play
eas submit --platform android

# Submit ke App Store
eas submit --platform ios
```

## 🔐 Environment Variables

Edit `.env`:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

## 🎯 Custom UI Components

### Mengganti Logo di Login Screen

Edit `app/index.js`:

```javascript
// Ganti emoji dengan image
<Image 
  source={require('../assets/logo.png')}
  style={{ width: 120, height: 120 }}
  resizeMode="contain"
/>
```

### Mengganti Color Scheme

Edit `src/config/config.js`:

```javascript
export const branding = {
  // Light theme
  backgroundColor: '#ffffff',
  textColor: '#1e293b',
  secondaryColor: '#f1f5f9',
  
  // Atau custom colors
  primaryColor: '#your-brand-color',
};
```

## 📱 Platform Specific

### Android

- Update `android/package` di `app.json`
- Generate keystore untuk signing
- Minimum SDK 21 (Android 5.0)

### iOS

- Update `ios/bundleIdentifier` di `app.json`
- Perlu Apple Developer account ($99/year)
- Minimum iOS 13.0

## 🚀 Tips

1. **Testing**: Gunakan Expo Go untuk testing cepat
2. **Assets**: Gunakan @2x dan @3x untuk retina displays
3. **Colors**: Test di light & dark mode
4. **Icons**: Preview di berbagai device sizes
5. **Branding**: Konsisten di semua platforms

## 📄 License

MIT License - VPN Access Mobile
