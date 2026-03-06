# 🍎 Apple Design UI Update - VPN Access Frontend

## Overview
Lengkap fitur frontend dengan Apple/iPhone design aesthetic - elemen scaling lebih kecil, clean, dan modern tanpa merusak estetika.

---

## 📱 New Components Created

### 1. **Settings.js** - Settings Page
**Location:** `frontend/components/Settings.js`

**Features:**
- 🌐 Language selection (English, Bahasa Indonesia)
- 🕐 Timezone selection (WIB, WITA, WIT)
- 💱 Currency settings
- 🌙 Dark Mode toggle
- 〰️ Reduce Motion toggle
- 📳 Haptic Feedback toggle
- 🔐 Security settings (2FA, Trusted Devices, Auto-Lock)
- 📊 Data & Storage usage display
- Account actions (Export Data, Delete Account)

**Apple Design Elements:**
- SF Pro font family
- 13px uppercase section headers (#8E8E93)
- 15px label text with proper weight
- iOS-style toggle switches (51x31px)
- Grouped settings with rounded corners (12px)
- Subtle backdrop blur effects
- Toast notifications (pill-shaped, 100px border-radius)

---

### 2. **MyDevices.js** - Dedicated Device Management
**Location:** `frontend/components/MyDevices.js`

**Features:**
- 📱 Device grid with visual cards
- ➕ Add new device modal
- 📊 Device limit indicator (0/3 devices)
- 🔄 Real-time device status
- 📥 Download .conf file
- 🗑️ Remove device with confirmation
- 📱 Device detail modal with QR code
- 📋 Configuration preview

**Apple Design Elements:**
- 28px emoji icons in rounded containers
- 16px device names with 500 weight
- 13px monospace IP addresses (SF Mono)
- Smooth modal animations
- Glassmorphism overlay (backdrop blur 10px)
- iOS-style progress bar for device limit
- Card selection with blue highlight

---

### 3. **Profile.js** - Enhanced Profile (Redesigned)
**Location:** `frontend/components/Profile.js`

**Features:**
- 👤 Avatar with initial display
- 📑 Tab navigation (Profile, Subscription, Notifications)
- ✏️ Editable profile fields
- 📱 WhatsApp number formatting (auto +62)
- 🔔 Notification preferences (6 toggles)
- 👑 Subscription status card
- 📊 Usage statistics (3-column grid)
- ⚡ Quick actions

**Apple Design Elements:**
- 64px circular avatar with gradient
- Segmented control tabs
- 13px section headers
- 15px input text
- iOS toggle components
- 12px hint text (#636366)
- Danger zone section with red accent

---

## 🎨 Apple Design System Applied

### Typography
```
Font Family: -apple-system, BlinkMacSystemFont, "SF Pro Text"
Sizes:
- Page Title: 20-28px (600-700 weight)
- Section Header: 13px (500 weight, uppercase, #8E8E93)
- Label: 13-15px (400-500 weight)
- Body: 14-16px (400 weight)
- Hint/Caption: 12px (#636366)
- Monospace: SF Mono, 11-13px
```

### Colors (iOS Dark Mode)
```
Background: #000000 (pure black)
Card Background: rgba(255, 255, 255, 0.05-0.08)
Border: rgba(255, 255, 255, 0.08-0.1)

Primary: #007AFF (Apple Blue)
Success: #34C759 (Apple Green)
Danger: #FF3B30 (Apple Red)
Warning: #FF9500 (Apple Orange)

Text Primary: #FFFFFF
Text Secondary: #8E8E93
Text Tertiary: #636366

Admin Accent: #BF5AF2 (Purple)
```

### Components

#### Toggle Switch (iOS Style)
```javascript
Size: 51x31px
Knob: 27x27px
On Color: #34C759
Off Color: #3A3A3C
Animation: cubic-bezier(0.4, 0, 0.2, 1)
```

#### Buttons
```
Primary: #007AFF background, white text
Secondary: rgba(255,255,255,0.1) background, #007AFF text
Danger: #FF3B30 background, white text
Border Radius: 12px
Padding: 14px 20px
Font: 16px, 500 weight
```

#### Cards/Sections
```
Background: rgba(255, 255, 255, 0.05)
Border: 1px solid rgba(255, 255, 255, 0.08)
Border Radius: 12-16px
Backdrop Filter: blur(20px)
```

#### Toast Notifications
```
Position: Fixed top center
Shape: Pill (100px border-radius)
Padding: 12px 20px
Background: rgba with 0.95 opacity
Backdrop Filter: blur(20px)
Animation: slideDown 0.3s
```

---

## 🔄 Updated Components

### Layout.js
**Changes:**
- 🎨 Updated to Apple color scheme (pure black background)
- 📱 Changed icons to emoji (🏠 📱 💰 👤 ⚙️ 🛡️ 👥 🌐 🪙)
- ✨ Added SF Pro font family
- 🎭 Updated sidebar with glassmorphism
- 🔵 Changed active state to Apple Blue (#007AFF)
- 🟣 Admin items use Apple Purple (#BF5AF2)

### index.js
**Changes:**
- ➕ Imported Settings component
- ➕ Imported MyDevices component
- 🔄 Added routing for 'settings' and 'devices' pages

---

## 🔌 Backend API Routes Updated

### user.js - New Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile` | Get user profile |
| PATCH | `/api/user/profile` | Update profile (display_name, phone, whatsapp) |
| GET | `/api/user/notifications` | Get notification preferences |
| PATCH | `/api/user/notifications` | Update notification preferences |
| GET | `/api/user/preferences` | Get user preferences |
| PATCH | `/api/user/preferences` | Update user preferences |
| GET | `/api/user/stats` | Get user statistics |
| GET | `/api/user/data-usage` | Get data usage info |

### Firestore Collections Used

```javascript
// users/{uid}
{
  email, display_name, phone, whatsapp, avatar_url,
  role, vpn_enabled, subscription_plan, subscription_end,
  created_at, updated_at
}

// user_preferences/{uid}
{
  user_id,
  whatsapp_enabled, email_enabled,
  low_balance_alert, expiring_soon_alert,
  payment_approved_alert, payment_rejected_alert,
  language, timezone,
  dark_mode, reduce_motion, haptic_feedback,
  currency,
  updated_at
}

// devices/{deviceId}
{
  user_id, device_name, public_key, private_key,
  ip_address, status, created_at
}
```

---

## 📱 Navigation Structure

```
┌─────────────────────────────────────┐
│  🏠 Dashboard                       │
│     - Generate VPN Config           │
│     - Configuration Display         │
│     - Quick Device List             │
├─────────────────────────────────────┤
│  📱 My Devices                      │
│     - Device Grid View              │
│     - Add New Device                │
│     - Device Details & QR           │
├─────────────────────────────────────┤
│  💰 Wallet                          │
│     - Balance & Auto-Renewal        │
│     - Payment Submission            │
│     - Transaction History           │
├─────────────────────────────────────┤
│  👤 Profile                         │
│     - Personal Info                 │
│     - Subscription Status           │
│     - Notification Settings         │
├─────────────────────────────────────┤
│  ⚙️ Settings                        │
│     - General (Language, Timezone)  │
│     - Appearance                    │
│     - Privacy & Security            │
│     - Data & Storage                │
└─────────────────────────────────────┘
```

---

## 🎯 Key Features Implemented

### User Features
- ✅ VPN configuration generation with QR code
- ✅ Device management (max 3 devices)
- ✅ Payment submission with proof upload
- ✅ Credit/wallet system with auto-renewal
- ✅ Profile management with WhatsApp integration
- ✅ Notification preferences (WhatsApp + Email)
- ✅ Settings customization (language, timezone, appearance)
- ✅ Subscription tracking with expiry alerts

### Admin Features
- ✅ User management (enable/disable VPN access)
- ✅ Payment approval/rejection
- ✅ Device management (revoke any device)
- ✅ Credit management
- ✅ System settings

---

## 🎨 Design Philosophy

### Apple Human Interface Guidelines Applied:
1. **Deference** - UI takes a backseat to content
2. **Depth** - Layered interfaces with shadows and blur
3. **Clarity** - Text is legible at every size
4. **Smooth Animations** - Cubic-bezier timing functions

### Responsive Design:
- Mobile-first approach
- Breakpoint at 768px (tablet/desktop)
- Sidebar collapses to hamburger menu on mobile
- Touch-friendly tap targets (min 44x44px)

---

## 🚀 Running the Application

### Frontend
```bash
cd frontend
npm run dev
# Opens at http://localhost:3001
```

### Backend
```bash
cd backend
npm run dev
# Opens at http://localhost:3000
```

---

## 📋 Testing Checklist

- [ ] Login with Google Auth
- [ ] Generate VPN configuration
- [ ] Download .conf file
- [ ] Add new device (with modal)
- [ ] View device QR code
- [ ] Revoke device
- [ ] Submit payment proof
- [ ] View payment history
- [ ] Toggle auto-renewal
- [ ] Update profile (display name, WhatsApp)
- [ ] Update notification preferences
- [ ] Change settings (language, timezone)
- [ ] Toggle dark mode
- [ ] View subscription status
- [ ] Test responsive design (mobile/desktop)

---

## 🎉 Summary

Semua fitur backend yang ada sekarang memiliki UI frontend yang lengkap dengan **Apple/iPhone design aesthetic**:

✅ **Clean & Minimal** - Pure black background, subtle borders
✅ **Smaller Scaling** - 13-15px text, compact spacing
✅ **iOS Elements** - Toggle switches, segmented controls, pills
✅ **Smooth Animations** - Cubic-bezier transitions
✅ **Glassmorphism** - Backdrop blur effects
✅ **SF Pro Font** - Apple system font family
✅ **Apple Colors** - #007AFF, #34C759, #FF3B30, #BF5AF2

Estetika tetap terjaga dengan konsistensi design system di semua komponen! 🍎
