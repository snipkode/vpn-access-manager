# VPN Access Frontend - API Integration Guide

## 📋 Overview

Frontend telah diintegrasikan dengan API Backend di `http://localhost:3000/api`. Semua komunikasi API menggunakan Bearer Token authentication dengan Firebase ID Token.

---

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Copy environment file
cp .env.example .env.local

# Pastikan API URL sudah benar
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

---

## 📚 API Client Usage

### Import API Client

```javascript
// Import specific API modules
import { vpnAPI, billingAPI, formatCurrency } from '../lib/api';

// Or import all
import api from '../lib/api';
```

### Authentication Flow

```javascript
import { authAPI } from '../lib/api';
import { useAuthStore } from '../store';

// Login with Firebase token
const handleLogin = async (firebaseToken) => {
  try {
    const response = await authAPI.login(firebaseToken);
    // response = { user, token, user_data }
  } catch (error) {
    console.error('Login failed:', error);
  }
};

// Get current user profile
const profile = await authAPI.getProfile();

// Logout
await authAPI.logout();
```

---

## 🔑 API Endpoints by Module

### Auth API (`authAPI`)

```javascript
// Get current user profile
await authAPI.getProfile();

// Login with Firebase token
await authAPI.login(firebaseToken);

// Logout
await authAPI.logout();
```

### User API (`userAPI`)

```javascript
// Get user profile
await userAPI.getProfile();

// Update user profile
await userAPI.updateProfile({
  display_name: 'John Doe',
  phone: '+628123456789',
  whatsapp: '+628123456789',
  avatar_url: 'https://...'
});
```

### VPN API (`vpnAPI`)

```javascript
// Get user's VPN devices
const devices = await vpnAPI.getDevices();

// Generate VPN config for new device
const config = await vpnAPI.generateConfig('iPhone 14');

// Delete/revoke a device
await vpnAPI.deleteDevice(deviceId);

// Get device details
const device = await vpnAPI.getDevice(deviceId);
```

### Billing API (`billingAPI`)

```javascript
// Get billing settings (plans, banks, etc.)
const settings = await billingAPI.getSettings();

// Get user subscription
const subscription = await billingAPI.getSubscription();

// Get payment history
const payments = await billingAPI.getPayments({ limit: 10 });

// Submit payment proof
const formData = new FormData();
formData.append('amount', '50000');
formData.append('plan', 'monthly');
formData.append('bank_from', 'BCA');
formData.append('transfer_date', '2024-01-01');
formData.append('proof', proofFile);

await billingAPI.submitPayment(formData);
```

### Credit API (`creditAPI`)

```javascript
// Get user credit balance
const balance = await creditAPI.getBalance();
// Returns: { balance: 100000, total_earned: 50000, total_spent: 0, formatted_balance: 'Rp 100.000' }

// Get credit transactions
const transactions = await creditAPI.getTransactions({ limit: 10 });

// Transfer credit to another user
await creditAPI.transfer({
  to_user_email: 'user@example.com',
  amount: 50000,
  description: 'Payment for services',
  notes: 'Thank you'
});
```

### Referral API (`referralAPI`)

```javascript
// Get or create referral code
const { referral_code, referral_link, tier } = await referralAPI.getCode();

// Get referral statistics
const stats = await referralAPI.getStats();

// Get referral earnings history
const earnings = await referralAPI.getEarnings();

// Track referral signup
await referralAPI.track({
  referrer_code: 'ABC123',
  metadata: {
    signup_method: 'google_oauth',
    signup_page: 'index'
  }
});
```

### Notifications API (`notificationsAPI`)

```javascript
// Get user notifications
const notifications = await notificationsAPI.getNotifications();

// Get notification history
const history = await notificationsAPI.getHistory();

// Mark notification as read
await notificationsAPI.markAsRead(notificationId);

// Mark all as read
await notificationsAPI.markAllAsRead();

// Update notification preferences
await notificationsAPI.updatePreferences({
  whatsapp_enabled: true,
  email_enabled: true,
  low_balance_alert: true
});
```

---

## 👨‍💼 Admin APIs

### Admin Users API (`adminUsersAPI`)

```javascript
// Get all users with filters
const users = await adminUsersAPI.getUsers({
  role: 'user',
  vpn_enabled: true,
  limit: 50
});

// Get user details
const user = await adminUsersAPI.getUser(userId);

// Update user (role, vpn_enabled, etc.)
await adminUsersAPI.updateUser(userId, {
  role: 'admin',
  vpn_enabled: true,
  display_name: 'Updated Name'
});

// Delete user
await adminUsersAPI.deleteUser(userId);

// Enable/Disable VPN for user
await adminUsersAPI.enableVpn(userId);
await adminUsersAPI.disableVpn(userId);

// Extend user subscription
await adminUsersAPI.extendSubscription(userId, 30); // 30 days
```

### Admin Payments API (`adminPaymentsAPI`)

```javascript
// Get all payments with filters
const payments = await adminPaymentsAPI.getPayments({
  status: 'pending', // pending, approved, rejected
  limit: 50
});

// Get payment details
const payment = await adminPaymentsAPI.getPayment(paymentId);

// Approve payment
await adminPaymentsAPI.approvePayment(paymentId, {
  admin_note: 'Payment approved'
});

// Reject payment
await adminPaymentsAPI.rejectPayment(paymentId, {
  reason: 'Invalid proof',
  admin_note: 'Proof of payment is unclear'
});

// Get statistics
const stats = await adminPaymentsAPI.getStats();
```

### Admin Billing API (`adminBillingAPI`)

```javascript
// Get billing dashboard data
const dashboard = await adminBillingAPI.getDashboard();

// Get billing settings
const settings = await adminBillingAPI.getSettings();

// Update billing settings
await adminBillingAPI.updateSettings({
  billing_enabled: true,
  currency: 'IDR',
  min_amount: 10000,
  max_amount: 1000000
});

// Get all plans
const plans = await adminBillingAPI.getPlans();

// Create new plan
await adminBillingAPI.createPlan({
  name: 'Premium Monthly',
  price: 75000,
  duration_days: 30,
  active: true
});

// Update plan
await adminBillingAPI.updatePlan(planId, {
  price: 80000
});

// Delete plan
await adminBillingAPI.deletePlan(planId);

// Get bank accounts
const banks = await adminBillingAPI.getBankAccounts();

// Add bank account
await adminBillingAPI.addBankAccount({
  bank: 'BCA',
  account_number: '1234567890',
  account_name: 'PT VPN Access',
  description: 'Main account',
  active: true
});
```

### Admin Credit API (`adminCreditAPI`)

```javascript
// Get credit dashboard
const dashboard = await adminCreditAPI.getDashboard();

// Get all credit transactions
const transactions = await adminCreditAPI.getTransactions({
  type: 'transfers', // all, transfers, blocked, pending_review
  limit: 100
});

// Get fraud alerts
const alerts = await adminCreditAPI.getFraudAlerts({
  status: 'pending',
  limit: 50
});

// Review fraud alert
await adminCreditAPI.reviewFraudAlert(alertId, 'approve', 'Looks legitimate');

// Get credit statistics
const stats = await adminCreditAPI.getStats();

// Add credit to user
await adminCreditAPI.addCredit(userId, {
  amount: 100000,
  description: 'Bonus top-up',
  notes: 'Welcome bonus'
});

// Deduct credit from user
await adminCreditAPI.deductCredit(userId, {
  amount: 50000,
  description: 'Subscription payment',
  notes: 'Monthly subscription'
});
```

### Admin Referral API (`adminReferralAPI`)

```javascript
// Get referral dashboard
const dashboard = await adminReferralAPI.getDashboard();

// Get all referrals
const referrals = await adminReferralAPI.getReferrals({
  status: 'active',
  limit: 100
});

// Get referral settings
const settings = await adminReferralAPI.getSettings();

// Update referral settings
await adminReferralAPI.updateSettings({
  referrer_reward: 10000,
  referee_reward: 5000,
  min_withdrawal: 50000
});

// Update user tier
await adminReferralAPI.updateUserTier(userId, {
  tier: 'gold'
});

// Reset user fraud status
await adminReferralAPI.resetUserFraud(userId);
```

### Admin Settings API (`adminSettingsAPI`)

```javascript
// Get all settings
const settings = await adminSettingsAPI.getSettings();

// Update settings by category
await adminSettingsAPI.updateSettings('whatsapp', {
  enabled: true,
  api_url: 'https://api.whatsapp.com',
  session_id: 'session123'
});

await adminSettingsAPI.updateSettings('email', {
  smtp_host: 'smtp.gmail.com',
  smtp_port: 587,
  username: 'admin@vpnaccess.com'
});

// Test WhatsApp connection
await adminSettingsAPI.testWhatsApp({
  test_phone: '+628123456789',
  message: 'Test message'
});

// Test email connection
await adminSettingsAPI.testEmail({
  to: 'test@example.com',
  subject: 'Test Email',
  body: 'This is a test email'
});
```

### Admin Dashboard API (`adminDashboardAPI`)

```javascript
// Get dashboard statistics
const stats = await adminDashboardAPI.getStats();

// Get recent activity
const activity = await adminDashboardAPI.getActivity({
  limit: 50,
  type: 'all' // all, users, payments, devices
});
```

### Admin Devices API (`adminDevicesAPI`)

```javascript
// Get all devices
const devices = await adminDevicesAPI.getDevices({
  status: 'active',
  limit: 100
});

// Get device details
const device = await adminDevicesAPI.getDevice(deviceId);

// Delete device
await adminDevicesAPI.deleteDevice(deviceId);

// Reset device IP
await adminDevicesAPI.resetDeviceIP(deviceId);
```

---

## 🛠️ Utility Functions

### Format Currency

```javascript
import { formatCurrency } from '../lib/api';

const amount = formatCurrency(50000);
// Output: "Rp 50.000"
```

### Format Date

```javascript
import { formatDate } from '../lib/api';

const date = formatDate('2024-01-15T10:30:00Z');
// Output: "15 Jan 2024"

const dateWithOptions = formatDate('2024-01-15T10:30:00Z', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});
// Output: "Senin, 15 Januari 2024"
```

### Format DateTime

```javascript
import { formatDateTime } from '../lib/api';

const dateTime = formatDateTime('2024-01-15T10:30:00Z');
// Output: "15 Jan 2024 10:30"
```

### Get Status Style

```javascript
import { getStatusStyle } from '../lib/api';

const style = getStatusStyle('pending');
// Output: "bg-amber-100 text-amber-700"

// Usage in component:
<div className={`px-3 py-1 rounded-full text-xs ${getStatusStyle(status)}`}>
  {status}
</div>
```

### Get Risk Style

```javascript
import { getRiskStyle } from '../lib/api';

const style = getRiskStyle('high');
// Output: "bg-red-100 text-red-700"
```

---

## 📱 User Roles & Menu

### Regular User Menu
- Dashboard
- Devices
- Wallet
- Payment
- Referral
- Profile
- Notifications

### Admin Menu
- Overview (Dashboard)
- Billing
- Credit
- Referrals
- Payment Settings
- Settings

### Role Detection

```javascript
import { useAuthStore } from '../store';

const { userData } = useAuthStore();
const isAdmin = userData?.role === 'admin';

if (isAdmin) {
  // Show admin menu
} else {
  // Show user menu
}
```

---

## 🔐 Authentication Flow

1. User clicks "Sign in with Google"
2. Firebase authentication popup opens
3. After successful login, Firebase returns user credentials
4. Frontend gets Firebase ID token
5. Frontend sends token to backend API (`/api/auth/login`)
6. Backend validates token and returns user data + role
7. Frontend stores user data in Zustand store
8. User is redirected to appropriate dashboard based on role

---

## 🐛 Error Handling

All API calls use try-catch blocks:

```javascript
try {
  const data = await vpnAPI.getDevices();
  // Process data
} catch (error) {
  // Error handling
  showNotification(error.message, 'error');
  console.error('API Error:', error);
}
```

Common error responses:
- `401 Unauthorized` - Invalid or expired token
- `403 Forbidden` - User doesn't have permission
- `404 Not Found` - Resource not found
- `400 Bad Request` - Invalid request data
- `500 Internal Server Error` - Server error

---

## 📊 State Management (Zustand)

### Auth Store

```javascript
import { useAuthStore } from '../store';

const { user, token, userData, loading, setUser, clearUser, login, logout } = useAuthStore();
```

### VPN Store

```javascript
import { useVpnStore } from '../store';

const { devices, selectedDevice, generating, setDevices, setSelectedDevice, reset } = useVpnStore();
```

### Billing Store

```javascript
import { useBillingStore } from '../store';

const { billingEnabled, currency, plans, bankAccounts, setBillingData } = useBillingStore();
```

### UI Store

```javascript
import { useUIStore } from '../store';

const { activePage, setActivePage, showNotification, sidebarOpen } = useUIStore();
```

---

## 📝 Example: Complete Component

```javascript
import { useEffect, useState } from 'react';
import { useUIStore } from '../store';
import { vpnAPI, billingAPI, formatCurrency } from '../lib/api';

export default function Dashboard() {
  const { showNotification } = useUIStore();
  const [devices, setDevices] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [devicesData, subData] = await Promise.all([
        vpnAPI.getDevices(),
        billingAPI.getSubscription(),
      ]);
      setDevices(devicesData.devices || []);
      setSubscription(subData.subscription || null);
    } catch (error) {
      showNotification('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Devices: {devices.length}</p>
      <p>Subscription: {subscription?.plan_label}</p>
    </div>
  );
}
```

---

## 🎯 Testing

### Test API Connection

```javascript
// In browser console (after login)
const { vpnAPI } = await import('../lib/api');
const devices = await vpnAPI.getDevices();
console.log(devices);
```

### Test Admin Access

```javascript
// Check if user is admin
const { useAuthStore } = await import('../store');
const { userData } = useAuthStore.getState();
console.log('Is Admin:', userData?.role === 'admin');
```

---

## 📞 Support

For API documentation, visit: http://localhost:3000/api-docs/

For issues or questions, check the backend API documentation or contact the development team.
