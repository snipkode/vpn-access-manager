# 🚀 VPN Access Manager - Frontend

Modern, responsive web application for managing VPN access and subscriptions.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Build & Deploy](#build--deploy)
- [Components](#components)
- [API Integration](#api-integration)
- [Environment Variables](#environment-variables)

---

## ✨ Features

### User Features
- 🔐 **Google Authentication** - Secure login with Google OAuth
- 📱 **Device Management** - Generate and manage up to 3 VPN devices
- 💳 **Wallet System** - Track credit balance and transactions
- 💰 **Payment Submission** - Upload proof of payment for subscriptions
- 🎁 **Referral Program** - Earn credits by referring friends
- 👤 **Profile Management** - Edit profile and notification preferences
- 🔔 **Notifications** - Configure WhatsApp and email alerts

### Admin Features
- 📊 **Dashboard** - Overview of users, devices, and statistics
- 💵 **Payment Approval** - Review and approve/reject payment submissions
- 💎 **Credit Management** - Monitor credit transactions with fraud detection
- 🏆 **Referral Management** - Manage referrers, tiers, and fraud flags
- ⚙️ **Payment Settings** - Configure bank accounts and QR codes
- 🎛️ **System Settings** - WhatsApp, email, and general configuration

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (Pages Router)
- **Language:** JavaScript (ES6+)
- **Styling:** Tailwind CSS 3.4
- **State Management:** Zustand 5.0
- **Authentication:** Firebase Auth
- **HTTP Client:** Fetch API
- **Icons:** Font Awesome

---

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Firebase project with Authentication enabled
- Backend API running (see `../backend/README.md`)

### Install Dependencies
```bash
npm install
```

---

## ⚙️ Configuration

### 1. Create Environment File
```bash
cp .env.local.example .env.local
```

### 2. Configure Firebase
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project or select existing
3. Enable **Authentication** → **Google Sign-in**
4. Get config from Project Settings
5. Update `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Configure API URL
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000/api
# Or production URL:
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

---

## 🚀 Development

### Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Available Scripts
```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Build for production
npm start        # Start production server
```

---

## 🏗️ Build & Deploy

### Production Build
```bash
npm run build
npm start
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

### Deploy to Other Platforms
```bash
npm run build
# Deploy the .next folder to your hosting
```

---

## 🧩 Components

### Directory Structure
```
frontend/
├── components/
│   ├── Login.js              # Google login page
│   ├── Layout.js             # Main layout with sidebar
│   ├── Dashboard.js          # User dashboard (VPN devices)
│   ├── MyDevices.js          # Device management
│   ├── Wallet.js             # Credit balance & transactions
│   ├── PaymentForm.js        # Payment submission
│   ├── ProfileEdit.js        # Profile & preferences
│   ├── Notifications.js      # Notification settings
│   ├── Referral.js           # Referral program
│   ├── AdminDashboard.js     # Admin overview
│   ├── AdminBilling.js       # Payment approval
│   ├── AdminCredit.js        # Credit management
│   ├── AdminReferral.js      # Referral management
│   ├── PaymentSettings.js    # Payment configuration
│   └── AdminSettings.js      # System settings
├── pages/
│   ├── _app.js               # App wrapper
│   ├── _document.js          # Document wrapper
│   └── index.js              # Main page (SPA router)
├── store/
│   └── index.js              # Zustand stores & utilities
├── lib/
│   └── firebase.js           # Firebase configuration
└── styles/
    └── globals.css           # Global styles
```

### Component Usage
```javascript
import Dashboard from '../components/Dashboard';
import { useAuthStore, apiFetch } from '../store';

// In your component
const { token } = useAuthStore();
const data = await apiFetch('/vpn/devices');
```

---

## 🔌 API Integration

### Base URL
All API calls go to: `process.env.NEXT_PUBLIC_API_URL`

### Authentication
```javascript
import { apiFetch } from '../store';

// GET request
const data = await apiFetch('/auth/me');

// POST request
const result = await apiFetch('/vpn/generate', {
  method: 'POST',
  body: JSON.stringify({ deviceName: 'iPhone' }),
});

// File upload
const formData = new FormData();
formData.append('proof', file);
const result = await apiFetch('/billing/submit', {
  method: 'POST',
  body: formData,
});
```

### Available Endpoints

#### User Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/verify` | POST | Verify Firebase token |
| `/auth/me` | GET | Get current user |
| `/vpn/devices` | GET | Get user devices |
| `/vpn/generate` | POST | Generate new device |
| `/vpn/device/:id` | DELETE | Revoke device |
| `/billing/submit` | POST | Submit payment |
| `/billing/history` | GET | Payment history |
| `/billing/subscription` | GET | Subscription status |
| `/billing/plans` | GET | Available plans |
| `/credit/balance` | GET | Credit balance |
| `/credit/transactions` | GET | Transaction history |
| `/referral/code` | GET | Get referral code |
| `/referral/stats` | GET | Referral statistics |
| `/referral/earnings` | GET | Earnings history |
| `/user/profile` | GET/PATCH | User profile |
| `/user/notifications` | GET/PATCH | Notification prefs |

#### Admin Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/users` | GET | All users |
| `/admin/users/:id` | PATCH | Update user |
| `/admin/devices` | GET | All devices |
| `/admin/device/:id` | DELETE | Revoke device |
| `/admin/stats` | GET | System stats |
| `/admin/billing/stats` | GET | Billing stats |
| `/admin/billing/payments` | GET | All payments |
| `/admin/billing/payments/:id/approve` | POST | Approve payment |
| `/admin/billing/payments/:id/reject` | POST | Reject payment |
| `/admin/credit/stats` | GET | Credit stats |
| `/admin/credit/transactions` | GET | All transactions |
| `/admin/referral/stats` | GET | Referral stats |
| `/admin/referral/list` | GET | All referrers |
| `/payment-settings/settings` | GET/PATCH | Payment config |
| `/payment-settings/banks` | GET/POST | Bank accounts |

---

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API URL |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Firebase sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ | Firebase app ID |

---

## 🎨 Design System

### Colors
```javascript
// Primary
primary: #3B82F6 (blue-500)

// Semantic
success: #22C55E (green-500)
warning: #F59E0B (amber-500)
error: #EF4444 (red-500)

// Neutral
dark: #1E293B (slate-800)
gray: #64748B (slate-500)
light: #F1F5F9 (slate-100)
```

### Typography
- **Headings:** Bold (700)
- **Body:** Medium (500)
- **Captions:** Small (12-14px)

### Spacing
- Base unit: 4px
- Common: 4, 8, 12, 16, 24, 32, 48, 64px

### Border Radius
- Small: 8px (rounded-lg)
- Medium: 12px (rounded-xl)
- Large: 16px (rounded-2xl)
- XL: 24px (rounded-3xl)

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Login with Google
- [ ] View dashboard
- [ ] Generate VPN config
- [ ] Download config file
- [ ] Revoke device
- [ ] Submit payment
- [ ] View payment history
- [ ] Check wallet balance
- [ ] View referral code
- [ ] Edit profile
- [ ] Update notifications

### Admin Testing
- [ ] View user list
- [ ] Toggle VPN access
- [ ] View devices
- [ ] Revoke device
- [ ] Approve payment
- [ ] Reject payment
- [ ] View credit transactions
- [ ] Manage bank accounts

---

## 🐛 Troubleshooting

### Common Issues

**1. Login not working**
- Check Firebase config in `.env.local`
- Ensure Google Sign-in is enabled in Firebase Console
- Check authorized domains in Firebase Console

**2. API calls failing**
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS settings in backend
- Ensure backend is running

**3. Build errors**
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)

**4. Styling issues**
- Ensure Tailwind is configured
- Check `tailwind.config.js`
- Clear build cache

---

## 📊 Performance

### Bundle Size Targets
- Main bundle: < 200KB (gzipped)
- Initial page load: < 500KB
- Time to interactive: < 3s

### Optimization Tips
- Use dynamic imports for heavy components
- Optimize images with `next/image`
- Enable code splitting
- Use SWR or React Query for data fetching

---

## 📝 License

Private - VPN Access Manager

---

## 👥 Contributors

- Development Team

---

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Contact: support@vpnaccess.com

---

**Last Updated:** March 6, 2026
**Version:** 1.0.0
