# Environment Configuration Guide

## 📋 File Structure

```
vpn-access-manager/
├── backend/
│   └── .env                  # Backend environment variables
├── frontend/
│   ├── .env.local            # Frontend environment (gitignored)
│   ├── .env.local.example    # Template for .env.local
│   └── .env.example          # General template
```

---

## 🔧 Backend Configuration (`.env`)

### Required Variables

```bash
# --- SERVER ---
NODE_ENV=development
PORT=5000

# --- FIREBASE ADMIN SDK ---
# Get from Firebase Console > Project Settings > Service Accounts
FIREBASE_PROJECT_ID=e-prum
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@e-prum.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# --- WIREGUARD VPN ---
WG_INTERFACE=wg0
WG_SERVER_PUBLIC_KEY=your_public_key
WG_SERVER_PRIVATE_KEY=your_private_key
WG_SERVER_ENDPOINT=your_domain:444
WG_SERVER_IP=10.0.0.1
WG_PORT=51820
WG_DNS=1.1.1.1
WG_SUBNET=10.0.0.0/8

# --- EMAIL (SMTP) - Optional ---
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=VPN Access <noreply@vpnaccess.com>
SMTP_NOTIFICATION_EMAIL=admin@vpnaccess.com

# --- URLS ---
FRONTEND_URL=http://localhost:3000
ADMIN_DASHBOARD_URL=http://localhost:3000
API_URL=http://localhost:3000/api

# --- CLOUD STORAGE - Optional ---
CLOUD_STORAGE_PROVIDER=gcs
GCS_BUCKET=your-bucket-name
GCS_KEY_FILE=path/to/key.json

# --- BACKUP ---
BACKUP_ENCRYPTION_KEY=your-32-char-key
```

---

## 🎨 Frontend Configuration (`.env.local`)

### Required Variables

```bash
# --- API Configuration ---
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# --- FIREBASE CLIENT SDK ---
# Get from Firebase Console > Project Settings > General > Your apps
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBLgPQvZm5J3K9qF8YqH3xJ9Z2nV7wX4pM
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=e-prum.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=e-prum
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=e-prum.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456

# --- FRONTEND URL ---
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

---

## 🚀 Production Configuration

### Backend Production (`.env`)

```bash
NODE_ENV=production
PORT=5000

# Firebase (same as development)
FIREBASE_PROJECT_ID=e-prum
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@e-prum.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# WireGuard (same as development)
WG_INTERFACE=wg0
WG_SERVER_PUBLIC_KEY=4+Z9/I8WkRv+5ws3bRzvVk7bgTXu0OaEMVHFnAT+dQE=
WG_SERVER_PRIVATE_KEY=wOSn7GyO+HKCGxwX+V4DPerxeA7Vw3liq+IvYbdYcHo=
WG_SERVER_ENDPOINT=perumdati.tech:444
WG_SERVER_IP=10.0.0.1
WG_PORT=51820
WG_DNS=1.1.1.1
WG_SUBNET=10.0.0.0/8

# URLs - UPDATE FOR PRODUCTION
FRONTEND_URL=https://perumdati.tech
ADMIN_DASHBOARD_URL=https://perumdati.tech
API_URL=https://perumdati.tech:5000/api
```

### Frontend Production (`.env.production.local`)

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://perumdati.tech:5000/api

# Firebase (same as development)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBLgPQvZm5J3K9qF8YqH3xJ9Z2nV7wX4pM
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=e-prum.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=e-prum
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=e-prum.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456

# Frontend URL
NEXT_PUBLIC_FRONTEND_URL=https://perumdati.tech
```

---

## 📝 Setup Instructions

### 1. Backend Setup

```bash
cd backend

# Copy example (if exists)
cp .env.example .env

# Or create new file
nano .env

# Fill in your values from Firebase Console
# Download service account key from:
# Firebase Console > Project Settings > Service Accounts > Generate New Private Key
```

### 2. Frontend Setup

```bash
cd frontend

# Copy example
cp .env.local.example .env.local

# Or create new file
nano .env.local

# Fill in Firebase config from:
# Firebase Console > Project Settings > General > Your apps > SDK setup
```

### 3. Verify Configuration

**Backend:**
```bash
cd backend
npm start

# Should see:
# 🚀 VPN Access Backend running on port 5000
# 📊 Health: http://localhost:5000/health
```

**Frontend:**
```bash
cd frontend
npm run dev

# Should see:
# ready - started server on 0.0.0.0:3000
```

---

## 🔍 How to Get Firebase Credentials

### Firebase Admin SDK (Backend)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`e-prum`)
3. Click **Settings** ⚙️ > **Project settings**
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. Download the JSON file
7. Extract values:
   ```bash
   FIREBASE_PROJECT_ID=from_json.project_id
   FIREBASE_CLIENT_EMAIL=from_json.client_email
   FIREBASE_PRIVATE_KEY=from_json.private_key
   ```

### Firebase Client SDK (Frontend)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`e-prum`)
3. Click **Settings** ⚙️ > **Project settings**
4. Scroll to **Your apps** section
5. Under **Firebase SDK snippet**, find:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",           // → NEXT_PUBLIC_FIREBASE_API_KEY
     authDomain: "...",          // → NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
     projectId: "...",           // → NEXT_PUBLIC_FIREBASE_PROJECT_ID
     storageBucket: "...",       // → NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
     messagingSenderId: "...",   // → NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
     appId: "..."                // → NEXT_PUBLIC_FIREBASE_APP_ID
   };
   ```

---

## 🔐 Security Best Practices

### DO's ✅
- ✅ Use `.env` files for environment variables
- ✅ Add `.env` to `.gitignore`
- ✅ Use different keys for development and production
- ✅ Rotate Firebase Admin SDK keys periodically
- ✅ Use strong encryption keys for backups

### DON'Ts ❌
- ❌ Commit `.env` files to Git
- ❌ Share private keys publicly
- ❌ Use production keys in development
- ❌ Hardcode credentials in source code
- ❌ Share Firebase Admin SDK keys in frontend code

---

## 🛠️ Troubleshooting

### Issue: Firebase not initializing

**Check:**
```bash
# Verify .env.local exists
ls -la frontend/.env.local

# Check values
cat frontend/.env.local | grep FIREBASE

# Ensure NEXT_PUBLIC_ prefix is used
```

### Issue: Backend can't connect to Firebase

**Check:**
```bash
# Verify .env exists
ls -la backend/.env

# Check service account key format
cat backend/.env | grep FIREBASE_PRIVATE_KEY

# Ensure PRIVATE_KEY has quotes and \n
```

### Issue: API calls failing

**Check:**
```bash
# Verify API URL matches backend port
cat frontend/.env.local | grep API_URL

# Should be:
# NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 📄 Example Complete Setup

```bash
# Backend
cd backend
cat > .env << EOF
NODE_ENV=development
PORT=5000
FIREBASE_PROJECT_ID=e-prum
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@e-prum.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n"
WG_INTERFACE=wg0
WG_SERVER_PUBLIC_KEY=4+Z9/I8WkRv+5ws3bRzvVk7bgTXu0OaEMVHFnAT+dQE=
WG_SERVER_PRIVATE_KEY=wOSn7GyO+HKCGxwX+V4DPerxeA7Vw3liq+IvYbdYcHo=
WG_SERVER_ENDPOINT=perumdati.tech:444
WG_SERVER_IP=10.0.0.1
WG_PORT=51820
WG_DNS=1.1.1.1
WG_SUBNET=10.0.0.0/8
FRONTEND_URL=http://localhost:3000
EOF

# Frontend
cd frontend
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBLgPQvZm5J3K9qF8YqH3xJ9Z2nV7wX4pM
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=e-prum.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=e-prum
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=e-prum.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
EOF
```

---

**Last Updated**: March 10, 2026  
**Version**: 1.0.0
