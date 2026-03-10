# VPN Access Manager

Secure VPN Access Management System with Subscription, Billing, and Referral Features

---

## 📚 Documentation

**All documentation is now organized in the `docs/` folder.**

👉 **[View Complete Documentation](./docs/README.md)**

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+
- Firebase Project
- WireGuard installed (for VPN management)

### **1. Clone & Install**
```bash
git clone https://github.com/your-org/vpn-access-manager.git
cd vpn-access-manager

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### **2. Configure Environment**

**Backend (`backend/.env`):**
```bash
PORT=5000
NODE_ENV=development

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# WireGuard
WG_INTERFACE=wg0
WG_SERVER_PUBLIC_KEY=your_public_key
WG_SERVER_PRIVATE_KEY=your_private_key
WG_SERVER_ENDPOINT=your-domain:444
WG_PORT=51820
```

**Frontend (`frontend/.env.local`):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### **3. Run Development**

**Backend:**
```bash
cd backend
npm run dev
# Running on http://localhost:5000
```

**Frontend:**
```bash
cd frontend
npm run dev
# Running on http://localhost:3000
```

### **4. Deploy to Firebase**

**Firestore Rules:**
```bash
cd backend
firebase deploy --only firestore:rules
```

**Firestore Indexes:**
```bash
cd backend
firebase deploy --only firestore:indexes
```

---

## 🎯 Key Features

### **For Users**
- 🔐 VPN device management (up to 3 devices)
- 💳 Subscription plans (Monthly, Quarterly, Yearly)
- 🎁 7-day free trial
- 💰 Credit system with peer-to-peer transfer
- 👥 Referral program (4 tiers: Bronze, Silver, Gold, Platinum)
- 📤 Payment proof upload
- 💳 Wallet balance management

### **For Admins**
- 👤 User management (enable/disable VPN access)
- 💵 Payment approval/rejection workflow
- 💎 Credit top-up and deduction
- 🎯 Referral oversight and fraud detection
- ⚙️ System settings management
- 💾 Backup management
- 📊 Analytics dashboard

### **Security**
- 🔒 Firebase Authentication
- 🛡️ Firestore Security Rules
- 🚦 Rate Limiting (30 req/min production)
- 🧹 Input Sanitization
- 📝 Audit Logging
- 🚨 Fraud Detection System

---

## 📊 Architecture

```
┌─────────────────────────────────────┐
│  Frontend (Next.js 14)              │
│  Port: 3000                         │
│  - React Components                 │
│  - Firebase Auth                    │
│  - Tailwind CSS                     │
└──────────────┬──────────────────────┘
               │
               │ REST API (HTTP/HTTPS)
               │
┌──────────────▼──────────────────────┐
│  Backend (Express.js)               │
│  Port: 5000                         │
│  - REST API                         │
│  - WireGuard VPN Management         │
│  - Payment Processing               │
│  - Credit & Referral Systems        │
└──────────────┬──────────────────────┘
               │
               │
┌──────────────▼──────────────────────┐
│  Firebase                           │
│  - Firestore Database               │
│  - Authentication                   │
│  - Security Rules & Indexes         │
└─────────────────────────────────────┘
```

---

## 📁 Project Structure

```
vpn-access-manager/
├── backend/
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth, rate limit, validation
│   ├── services/        # Business logic
│   ├── config/          # Firebase, Swagger, indexes
│   ├── scripts/         # Setup and maintenance scripts
│   └── server.js        # Main entry point
│
├── frontend/
│   ├── pages/           # Next.js pages
│   ├── components/      # React components
│   ├── lib/             # API client, Firebase config
│   ├── store/           # State management
│   └── public/          # Static assets
│
├── docs/                # 📚 All documentation
│   ├── README.md        # Documentation index
│   ├── backend/         # Backend docs
│   ├── frontend/        # Frontend docs
│   └── guides/          # User guides
│
└── README.md            # This file
```

---

## 🔗 Important Links

### **Documentation**
- 📚 [Complete Documentation](./docs/README.md)
- 🚀 [Getting Started Guide](./docs/README_COMPLETE.md)
- 🔧 [API Documentation](./docs/BACKEND_API_ANALYSIS.md)
- 🎨 [Frontend Guide](./docs/FRONTEND_IMPLEMENTATION.md)
- 🔐 [Firestore Rules](./docs/FIRESTORE_RULES_INDEXES_GUIDE.md)

### **External Resources**
- [Firebase Console](https://console.firebase.google.com/)
- [WireGuard Documentation](https://www.wireguard.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Documentation](https://expressjs.com/)

---

## 🧪 Testing

### **Test Backend API**
```bash
# Health check
curl http://localhost:5000/health

# API info
curl http://localhost:5000/api

# Swagger docs
open http://localhost:5000/api-docs
```

### **Test Frontend**
```bash
# Open browser
open http://localhost:3000

# Test login
# 1. Click "Login" or "Get Started Free"
# 2. Sign in with Google
# 3. Should redirect to dashboard
```

### **Test VPN Device Generation**
```bash
# Requires authentication token
curl -X POST http://localhost:5000/api/vpn/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deviceName": "iPhone 14"}'
```

---

## 🚨 Troubleshooting

### **Common Issues**

**Backend won't start:**
```bash
# Check .env file
cat backend/.env | grep FIREBASE

# Test Firebase connection
cd backend
node -e "console.log('Firebase OK')"
```

**Frontend can't connect to API:**
```bash
# Check .env.local
cat frontend/.env.local | grep API_URL

# Should be:
# NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Firestore permission denied:**
```bash
# Deploy rules
cd backend
firebase deploy --only firestore:rules
```

### **More Help**
- 📖 [Troubleshooting Guide](./docs/TROUBLESHOOTING_BILLING.md)
- 🔧 [Connection Fix Guide](./docs/CONNECTION_FIX_GUIDE.md)
- 🚨 [Error Fixes](./docs/#-troubleshooting--debugging)

---

## 📝 License

MIT License - See LICENSE file for details

---

**Last Updated**: March 10, 2026  
**Version**: 1.0.0

---

👉 **For complete documentation, visit [./docs/README.md](./docs/README.md)**
