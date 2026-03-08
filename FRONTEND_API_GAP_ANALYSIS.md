# Frontend API Analysis - Gap Report

## 📊 Current State Analysis

### ✅ **What Frontend Currently Does:**

The React Native frontend (`vpn-client/`) is a **WireGuard client app** that:
1. **Import .conf files** manually from device storage
2. **Store tunnels** locally using WireGuard native module
3. **Connect/Disconnect** to VPN using imported configs
4. **Display connection stats** (upload/download/duration)

### ❌ **What Frontend Does NOT Do:**

The frontend **does NOT integrate with the backend API** at all:

| Feature | Backend API | Frontend Implementation | Gap |
|---------|-------------|------------------------|-----|
| User Authentication | ✅ Firebase Auth | ❌ Not implemented | 🔴 |
| Generate VPN Config | ✅ `POST /api/vpn/generate` | ❌ Not implemented | 🔴 |
| List User Devices | ✅ `GET /api/vpn/devices` | ❌ Not implemented | 🔴 |
| Download Config/QR | ✅ `GET /api/vpn/device/:id` | ❌ Not implemented | 🔴 |
| Revoke Device | ✅ `DELETE /api/vpn/device/:id` | ❌ Not implemented | 🔴 |
| Health Check | ✅ `GET /api/vpn/health` | ❌ Not implemented | 🔴 |
| IP Pool Status | ✅ `GET /api/vpn/ip-pool` | ❌ Not implemented | 🔴 |
| Lease Management | ✅ Multiple endpoints | ❌ Not implemented | 🔴 |

---

## 🔍 Current Frontend Flow

```
┌─────────────────────────────────────────────────────┐
│  User opens app                                     │
│  ↓                                                  │
│  Click "Import Config"                              │
│  ↓                                                  │
│  Select .conf file from device storage              │
│  ↓                                                  │
│  WireGuardService.importTunnel()                    │
│  ↓                                                  │
│  Config stored locally in WireGuard native module   │
│  ↓                                                  │
│  Click "Connect"                                    │
│  ↓                                                  │
│  WireGuardService.connect(tunnelId)                 │
└─────────────────────────────────────────────────────┘
```

**Problem:** User must manually download .conf file from somewhere (email? admin?) and import it.

---

## ✅ Expected Flow (With Backend Integration)

```
┌─────────────────────────────────────────────────────┐
│  User opens app                                     │
│  ↓                                                  │
│  Login with Firebase Auth                           │
│  ↓                                                  │
│  Check subscription status                          │
│  ↓                                                  │
│  Click "Generate New Device"                        │
│  ↓                                                  │
│  POST /api/vpn/generate (with auth token)           │
│  ↓                                                  │
│  Backend:                                           │
│    - Check device limit (max 3)                     │
│    - Allocate IP (with conflict prevention)         │
│    - Generate WireGuard keys                        │
│    - Add peer to WireGuard                          │
│    - Save to Firestore                              │
│    - Create audit log                               │
│  ↓                                                  │
│  Receive config + QR code                           │
│  ↓                                                  │
│  Auto-import to WireGuard                           │
│  ↓                                                  │
│  Click "Connect"                                    │
└─────────────────────────────────────────────────────┘
```

---

## 📋 Required Frontend Implementation

### 1. **API Service Layer** (`src/services/api.js`)

```javascript
import { API_URL } from '../config/config';
import { auth } from '@react-native-firebase/auth';

class ApiService {
  // Get auth token
  async getAuthToken() {
    const user = auth().currentUser;
    if (!user) throw new Error('Not authenticated');
    return await user.getIdToken();
  }

  // Generic API call
  async request(endpoint, options = {}) {
    const token = await this.getAuthToken();
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }
    
    return data;
  }

  // VPN Endpoints
  async generateDevice(deviceName) {
    return await this.request('/vpn/generate', {
      method: 'POST',
      body: JSON.stringify({ device_name: deviceName }),
    });
  }

  async getDevices() {
    return await this.request('/vpn/devices');
  }

  async getDeviceConfig(deviceId) {
    return await this.request(`/vpn/device/${deviceId}`);
  }

  async revokeDevice(deviceId) {
    return await this.request(`/vpn/device/${deviceId}`, {
      method: 'DELETE',
    });
  }

  // Admin Endpoints
  async getHealth() {
    return await this.request('/vpn/health');
  }

  async getIpPool() {
    return await this.request('/vpn/ip-pool');
  }

  async syncWireGuard() {
    return await this.request('/vpn/sync', {
      method: 'POST',
    });
  }
}

export default new ApiService();
```

---

### 2. **Auth Service** (`src/services/auth.js`)

```javascript
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AppleAuthentication from '@react-native-apple-authentication/apple-authentication';

class AuthService {
  async signInWithEmail(email, password) {
    return await auth().signInWithEmailAndPassword(email, password);
  }

  async signUpWithEmail(email, password) {
    return await auth().createUserWithEmailAndPassword(email, password);
  }

  async signInWithGoogle() {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const googleCredential = auth.GoogleAuthProvider.credential(
      userInfo.data.idToken
    );
    return await auth().signInWithCredential(googleCredential);
  }

  async signInWithApple(appleCredential) {
    const appleCredentialIOS = auth.AppleAuthProvider.credential(
      appleCredential.identityToken,
      appleCredential.authorizationCode
    );
    return await auth().signInWithCredential(appleCredentialIOS);
  }

  async signOut() {
    return await auth().signOut();
  }

  getCurrentUser() {
    return auth().currentUser;
  }

  onAuthStateChanged(callback) {
    return auth().onAuthStateChanged(callback);
  }
}

export default new AuthService();
```

---

### 3. **Login Screen** (`app/login.js`)

```javascript
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AuthService from '../src/services/auth';
import { branding } from '../src/config/config';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await AuthService.signInWithEmail(email, password);
      router.replace('/');
    } catch (error) {
      Alert.alert('Login Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await AuthService.signInWithGoogle();
      router.replace('/');
    } catch (error) {
      Alert.alert('Google Sign In Error', error.message);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await AuthService.signInWithApple();
      router.replace('/');
    } catch (error) {
      Alert.alert('Apple Sign In Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{branding.appName}</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.loginButtonText}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.socialButton} onPress={handleGoogleSignIn}>
        <Text style={styles.socialButtonText}>🔵 Sign in with Google</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.socialButton} onPress={handleAppleSignIn}>
        <Text style={styles.socialButtonText}>⚫ Sign in with Apple</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

### 4. **Device List Screen** (`app/devices.js`)

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import ApiService from '../src/services/api';
import WireGuardService from '../src/services/wireguard';
import { branding } from '../src/config/config';

export default function DevicesScreen() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await ApiService.getDevices();
      setDevices(response.devices || []);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDevice = async () => {
    Alert.prompt(
      'New Device',
      'Enter device name:',
      async (deviceName) => {
        if (!deviceName) return;
        
        try {
          const config = await ApiService.generateDevice(deviceName);
          
          // Auto-import to WireGuard
          const importResult = await WireGuardService.importTunnel(
            config.config,
            config.device_name
          );
          
          if (importResult.success) {
            Alert.alert('Success', 'Device created and imported!');
            loadDevices();
          } else {
            Alert.alert('Warning', 'Device created but import failed');
          }
        } catch (error) {
          Alert.alert('Error', error.message);
        }
      },
      null,
      'My Device'
    );
  };

  const handleRevoke = (deviceId, deviceName) => {
    Alert.alert(
      'Revoke Device',
      `Are you sure you want to revoke "${deviceName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await ApiService.revokeDevice(deviceId);
              Alert.alert('Success', 'Device revoked');
              loadDevices();
            } catch (error) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const renderDevice = ({ item }) => (
    <View style={styles.deviceCard}>
      <View style={styles.deviceHeader}>
        <Text style={styles.deviceIcon}>📱</Text>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{item.device_name}</Text>
          <Text style={styles.deviceIP}>IP: {item.ip_address}</Text>
          <Text style={styles.deviceStatus}>
            Status: {item.status}
          </Text>
        </View>
      </View>
      
      <View style={styles.deviceActions}>
        <TouchableOpacity
          style={styles.connectButton}
          onPress={() => {
            // Navigate to home with device config
            router.back();
          }}
        >
          <Text style={styles.connectButtonText}>🔌 Use</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.revokeButton}
          onPress={() => handleRevoke(item.id, item.device_name)}
        >
          <Text style={styles.revokeButtonText}>🗑️ Revoke</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={branding.primaryColor} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Devices</Text>
            <Text style={styles.emptyText}>
              Create your first device to connect
            </Text>
          </View>
        }
      />
      
      <TouchableOpacity
        style={styles.fab}
        onPress={handleGenerateDevice}
      >
        <Text style={styles.fabText}>➕</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## 🎯 Implementation Priority

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 🔴 P0 | API Service Layer | Low | High |
| 🔴 P0 | Auth Integration | Medium | High |
| 🔴 P0 | Device List Screen | Medium | High |
| 🟡 P1 | Auto-import Config | Low | Medium |
| 🟡 P1 | Lease Status Display | Low | Medium |
| 🟢 P2 | Health Dashboard (Admin) | Medium | Low |
| 🟢 P2 | IP Pool View (Admin) | Medium | Low |

---

## 📦 Required NPM Packages

```bash
cd vpn-client

# Firebase
npm install @react-native-firebase/app @react-native-firebase/auth

# Google Sign In
npm install @react-native-google-signin/google-signin

# Apple Authentication (iOS only)
npm install @react-native-apple-authentication/apple-authentication

# Async Storage (for token caching)
npm install @react-native-async-storage/async-storage
```

---

## ✅ Summary

**Current State:**
- Frontend is a **standalone WireGuard client**
- No backend integration
- Manual config import required

**What's Missing:**
1. ❌ No authentication
2. ❌ No API service layer
3. ❌ No device management
4. ❌ No lease status display
5. ❌ No admin features

**To Implement:**
1. Add Firebase Auth
2. Create API service layer
3. Build device management screen
4. Auto-import configs from API
5. Add lease expiry awareness
